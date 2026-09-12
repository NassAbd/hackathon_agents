import { expect, it, vi } from "vitest";
import { POST } from "../app/api/ghost/browser/route";
import { BrowserSessionSchema } from "../lib/browser/state";
it("checks the browser-facing loopback Host when Next normalizes the URL", async () => {
  const request = (origin: string, host = "127.0.0.1:3000") =>
    new Request("http://localhost:3000/api/ghost/browser", {
      method: "POST",
      headers: { origin, host, "Content-Type": "application/json" },
      body: JSON.stringify({ session: crypto.randomUUID(), mode: "reset" }),
    });
  expect((await POST(request("http://127.0.0.1:3000"))).status).toBe(200);
  for (const origin of [
    "http://localhost:3000",
    "http://127.0.0.1:3001",
    "https://127.0.0.1:3000",
    "https://evil.example",
    "null",
  ])
    expect((await POST(request(origin))).status).toBe(403);
  expect(
    (await POST(request("https://evil.example", "evil.example"))).status,
  ).toBe(403);
});

it("preserves a browser-only session and rejects foreign origins", async () => {
  vi.stubEnv("GHOST_DEMO_MODE", "true");
  try {
    const session = crypto.randomUUID();
    const request = (
      mode: string,
      origin = "http://localhost",
      observation?: unknown,
    ) =>
      new Request("http://localhost/api/ghost/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json", origin },
        body: JSON.stringify({
          session,
          mode,
          ...(observation ? { observation } : {}),
        }),
      });
    expect((await POST(request("read", "https://evil.example"))).status).toBe(
      403,
    );
    const observation = {
      id: crypto.randomUUID(),
      sequence: 1,
      timestamp: 1,
      app: "github",
      url: "https://github.com/NassAbd/ghost-demo-workspace/issues/1",
      objectId: "/NassAbd/ghost-demo-workspace/issues/1",
      title: "Example incident",
      content: "Service remains degraded.",
      action: "OPEN",
      extractionMs: 1,
    };
    const response = await POST(
      request("observe", "http://localhost", observation),
    );
    expect(response.status).toBe(200);
    const result = BrowserSessionSchema.parse(await response.json());
    expect(result.sources[0].content).toBe("Service remains degraded.");
    expect(JSON.stringify(result)).not.toContain("ACME");
    const next = BrowserSessionSchema.parse(
      await (await POST(request("read"))).json(),
    );
    expect(next.sources).toEqual(result.sources);
    const reset = BrowserSessionSchema.parse(
      await (await POST(request("reset"))).json(),
    );
    expect(reset.sources).toEqual([]);
  } finally {
    vi.unstubAllEnvs();
  }
});
