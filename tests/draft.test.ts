import { describe, expect, it } from "vitest";
import { approvedSentences, buildDraft } from "../lib/draft";
import { initialState, reduceEvent } from "../lib/ghost-state";
import { processRequest } from "../lib/agent-service";
const initial = initialState();
const full = (["slack", "github", "crm", "email"] as const).reduce(
  (state, app, i) =>
    reduceEvent(state, { id: String(i), app, action: "OPEN", timestamp: i }),
  initial,
);
const ready = reduceEvent(full, {
  id: "reply",
  app: "email",
  action: "REPLY",
  timestamp: 5,
});
describe("grounded reply", () => {
  it("includes resolution only after GitHub was opened", () => {
    expect(buildDraft(initial.facts).text).not.toContain("14:32");
    expect(buildDraft(full.facts).text).toContain("14:32 UTC");
    expect(buildDraft(full.facts).text).toContain("routing configuration");
  });
  it("keeps internal commercial details out of customer prose", () => {
    const draft = buildDraft(full.facts);
    expect(draft.text).not.toContain("120,000");
    expect(draft.text).not.toContain("at risk");
    expect(draft.text).toContain("19 days");
    expect(
      draft.factIds.every(
        (id) => full.facts.find((f) => f.id === id)?.customerSafe,
      ),
    ).toBe(true);
  });
  it("rejects hallucinated, duplicate and uncollected sentences", () => {
    expect(() => buildDraft(initial.facts, ["fix"])).toThrow();
    expect(() => buildDraft(full.facts, ["refund"])).toThrow();
    expect(() => buildDraft(full.facts, ["greeting", "greeting"])).toThrow();
  });
  it("requires the actual Reply boundary before the server drafts", async () => {
    const runtime = { enabled: false, invoke: async () => null };
    await expect(
      processRequest({ mode: "draft", events: full.events }, runtime),
    ).rejects.toThrow("Reply");
    const result = await processRequest(
      { mode: "draft", events: ready.events },
      runtime,
    );
    expect(result.output.draftSentenceIds).toEqual(
      approvedSentences(ready.facts).map((s) => s.id),
    );
  });
  it("falls back if the agent selects an unsupported draft sentence", async () => {
    const fallback = await processRequest(
      { mode: "draft", events: ready.events },
      { enabled: false, invoke: async () => null },
    );
    const result = await processRequest(
      { mode: "draft", events: ready.events },
      {
        enabled: true,
        invoke: async () => ({
          ...fallback.output,
          draftSentenceIds: ["refund"],
        }),
      },
    );
    expect(result.mode).toBe("fallback");
    expect(
      buildDraft(ready.facts, result.output.draftSentenceIds).text,
    ).toContain("14:32");
  });
});

describe("AI sentence choices", () => {
  it("allows empathetic phrasing while preserving the same grounded claims", () => {
    const ids = approvedSentences(full.facts).map((s) =>
      s.id === "acknowledge" ? "acknowledge_alternative" : s.id,
    );
    const draft = buildDraft(full.facts, ids);
    expect(draft.text).toContain("I’m sorry for the frustration");
    expect(draft.factIds).toEqual(buildDraft(full.facts).factIds);
  });
});
