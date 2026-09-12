import { expect, it } from "vitest";
import { writeFile } from "node:fs/promises";
import { initialState, reduceEvent } from "../lib/ghost-state";
import { pages } from "../lib/fixtures";
import { graphFromContext } from "../lib/live-context";
import { ApiResponseSchema, type LiveContext } from "../lib/live-schemas";
// Opt-in only: real model calls, never part of the offline suite.
it.skipIf(process.env.GHOST_LIVE_TEST !== "true")(
  "adapts graph, intent and generated reply to changed source text",
  async () => {
    const { POST } = await import("../app/api/ghost/route");
    let state = initialState();
    let context: LiveContext | undefined;
    let contextProof: string | undefined;
    async function request(mode: "observe" | "draft") {
      const start = Date.now();
      const response = await POST(
        new Request("http://localhost/api/ghost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            events: state.events,
            context,
            contextProof,
          }),
        }),
      );
      expect(response.status).toBe(200);
      const result = ApiResponseSchema.parse(await response.json());
      console.info({
        app: state.currentApp,
        mode,
        result: result.mode,
        elapsedMs: Date.now() - start,
      });
      expect(result.mode).toBe("live");
      if (result.mode !== "live") throw new Error("Live verification failed");
      context = result.context;
      contextProof = result.contextProof;
      return result;
    }
    await request("observe");
    for (const app of ["slack", "github", "crm"] as const) {
      state = reduceEvent(state, {
        id: app,
        app,
        action: "OPEN",
        timestamp: state.events.length,
      });
      await request("observe");
    }
    state = reduceEvent(state, {
      id: "return",
      app: "email",
      action: "OPEN",
      timestamp: 5,
    });
    state = reduceEvent(state, {
      id: "reply",
      app: "email",
      action: "REPLY",
      timestamp: 6,
    });
    const baseline = await request("draft");
    const original = pages.github.content;
    try {
      pages.github.content =
        "Issue #4821: EU payment timeouts. ACME is an affected customer. Open. Root cause: a routing configuration error introduced in the latest deployment. The incident is unresolved. No fix has been deployed. Payment error rate remains elevated.";
      context = undefined;
      contextProof = undefined;
      const changed = await request("observe");
      const changedDraft = await request("draft");
      const sources = state.visited.map((id) => ({ id, ...pages[id] }));
      expect(graphFromContext(changed.context, sources).nodes).not.toEqual(
        graphFromContext(baseline.context, sources).nodes,
      );
      expect(baseline.context.entities.map((e) => e.label).join(" ")).toMatch(
        /fix|normal|resolved|14:32/i,
      );
      expect(changed.context.entities.map((e) => e.label).join(" ")).toMatch(
        /unresolved|elevated|no fix|not deployed|open/i,
      );
      expect(changed.context.intent.label).not.toBe(
        baseline.context.intent.label,
      );
      const text = changedDraft.draft!.sentences.map((s) => s.text).join(" ");
      expect(text).not.toBe(
        baseline.draft!.sentences.map((s) => s.text).join(" "),
      );
      expect(text).toMatch(
        /not.*deployed|no fix|unresolved|remains elevated|still.*elevated/i,
      );
      expect(text).not.toMatch(
        /14:32|returned to normal|€120,000|account health|your latest deployment/i,
      );
      await writeFile(
        "/tmp/ghost-live-adaptivity.json",
        JSON.stringify(
          { baseline, changed: changedDraft },
          (key, value: unknown) => (key === "contextProof" ? undefined : value),
          2,
        ),
      );
      console.info({
        baselineIntent: baseline.context.intent,
        changedIntent: changed.context.intent,
        changedDraft: text,
      });
    } finally {
      pages.github.content = original;
    }
  },
  240000,
);
