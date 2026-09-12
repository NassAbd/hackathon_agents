import { describe, expect, it } from "vitest";
import { initialState, reduceEvent } from "../lib/ghost-state";
import { EventSchema } from "../lib/schemas";
import { type AppId } from "../lib/fixtures";
function open(app: AppId, index: number) {
  return {
    id: `event-${index}`,
    app,
    action: "OPEN" as const,
    timestamp: index,
  };
}
describe("navigation to grounded context", () => {
  it("starts with only the opened email", () => {
    const state = initialState();
    expect(state.facts.map((f) => f.id)).toEqual(["concern"]);
    expect(state.nodes.map((n) => n.id)).toEqual(["acme", "sarah", "payments"]);
    expect(state.intent.confidence).toBe(0.4);
  });
  it("grows graph and intent progressively on the complete path", () => {
    let state = initialState();
    let nodeCount = state.nodes.length;
    (["slack", "github", "crm"] as const).forEach((app, i) => {
      state = reduceEvent(state, open(app, i + 1));
      expect(state.nodes.length).toBeGreaterThan(nodeCount);
      expect(state.intent.confidence).toBe([0.7, 0.9, 0.97][i]);
      nodeCount = state.nodes.length;
      expect(
        state.edges.every(
          (e) =>
            state.nodes.some((n) => n.id === e.source) &&
            state.nodes.some((n) => n.id === e.target),
        ),
      ).toBe(true);
    });
    expect(state.intent.label).toBe(
      "Resolve ACME escalation and protect renewal",
    );
    expect(state.facts).toHaveLength(9);
  });
  it("deduplicates repeated events and revisits without losing context", () => {
    const event = open("slack", 1);
    const state = reduceEvent(initialState(), event);
    expect(reduceEvent(state, event)).toEqual(state);
    const revisit = reduceEvent(state, open("email", 2));
    expect(revisit.facts).toEqual(state.facts);
    expect(revisit.intent.confidence).toBe(0.7);
    expect(revisit.returned).toBe(true);
    expect(revisit.boundary).toBe(false);
  });
  it("does not invent resolution when CRM is opened before GitHub", () => {
    const state = reduceEvent(initialState(), open("crm", 1));
    expect(state.intent.confidence).toBeLessThan(0.9);
    expect(state.intent.label).not.toContain("resolution");
    expect(state.facts.some((f) => f.id === "fix")).toBe(false);
  });
  it("requires return to email and Reply for the action boundary", () => {
    const early = reduceEvent(initialState(), {
      ...open("email", 1),
      action: "REPLY",
    });
    expect(early.boundary).toBe(false);
    let state = reduceEvent(initialState(), open("github", 2));
    state = reduceEvent(state, { ...open("github", 3), action: "REPLY" });
    expect(state.boundary).toBe(false);
    state = reduceEvent(state, open("email", 4));
    state = reduceEvent(state, { ...open("email", 5), action: "REPLY" });
    expect(state.boundary).toBe(true);
  });
  it("rejects unsupported event actions and sources", () => {
    expect(
      EventSchema.safeParse({ ...open("email", 1), app: "browser" }).success,
    ).toBe(false);
    expect(
      EventSchema.safeParse({ ...open("email", 1), action: "SEND" }).success,
    ).toBe(false);
  });
});
