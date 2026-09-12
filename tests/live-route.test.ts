import { afterEach, expect, it, vi } from "vitest";
import { POST } from "../app/api/ghost/route";
import { ApiResponseSchema } from "../lib/live-schemas";
import { initialState, reduceEvent } from "../lib/ghost-state";
import { buildDraft } from "../lib/draft";
afterEach(() => vi.unstubAllEnvs());
it("preserves the deterministic endpoint and draft when demo mode is enabled", async () => {
  vi.stubEnv("GHOST_DEMO_MODE", "true");
  let state = initialState();
  for (const app of ["slack", "github", "crm", "email"] as const)
    state = reduceEvent(state, { id: app, app, action: "OPEN", timestamp: 1 });
  state = reduceEvent(state, {
    id: "reply",
    app: "email",
    action: "REPLY",
    timestamp: 2,
  });
  const response = await POST(
    new Request("http://localhost/api/ghost", {
      method: "POST",
      body: JSON.stringify({ mode: "draft", events: state.events }),
    }),
  );
  const result = ApiResponseSchema.parse(await response.json());
  expect(result.mode).toBe("fallback");
  if (result.mode !== "fallback") throw new Error("Expected fallback");
  expect(result.reason).toBe("disabled");
  expect(buildDraft(state.facts, result.output.draftSentenceIds)).toEqual(
    buildDraft(state.facts),
  );
});
it("rejects malformed client context and drafts before the action boundary", async () => {
  vi.stubEnv("GHOST_DEMO_MODE", "true");
  const send = (body: unknown) =>
    POST(
      new Request("http://localhost/api/ghost", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  expect(
    (
      await send({
        mode: "observe",
        events: initialState().events,
        context: { facts: [] },
      })
    ).status,
  ).toBe(400);
  expect(
    (await send({ mode: "draft", events: initialState().events })).status,
  ).toBe(409);
});
