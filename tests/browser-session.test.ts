import { describe, expect, it, vi } from "vitest";
import {
  newBrowserSession,
  observeBrowser,
  draftBrowser,
  bounded,
} from "../lib/browser/session";
import {
  normalizeObservation,
  type Observation,
} from "../lib/browser/contracts";
import type { Invoke } from "../lib/live-agent";
import type { LiveContext } from "../lib/live-schemas";
const base: Observation = {
  id: "12345678-1234-4123-8123-123456789abc",
  sequence: 1,
  timestamp: 1,
  app: "github",
  url: "https://github.com/NassAbd/ghost-demo-workspace/issues/1",
  objectId: "/NassAbd/ghost-demo-workspace/issues/1",
  title: "Incident",
  content: "Payments remain delayed.",
  action: "OPEN",
  extractionMs: 1,
};
function model(): Invoke {
  return vi.fn(async (task, input) => {
    const value = input as {
      sources: { id: string; content: string }[];
      expectedCheckIds: string[];
    };
    if (task === "verify")
      return {
        checks: value.expectedCheckIds.map((id) => ({ id, supported: true })),
      };
    const source = value.sources[0];
    const id = source.id.includes("github") ? "issue" : "email";
    return {
      entities: [
        {
          id,
          label: source.content.slice(0, 60),
          type: "status",
          evidence: [{ sourceId: source.id, quote: source.content }],
        },
      ],
      facts: [
        {
          id: `${id}-fact`,
          text: source.content,
          entityIds: [id],
          customerSafe: true,
          evidence: [{ sourceId: source.id, quote: source.content }],
        },
      ],
      relationships: [],
      intent: {
        label: `Explain: ${source.content}`,
        confidence: 0.75,
        evidenceIds: [`${id}-fact`],
      },
    } satisfies LiveContext;
  });
}
describe("browser session", () => {
  it("deduplicates repeated views and rejects stale events without model calls", async () => {
    const invoke = model();
    const first = await observeBrowser(newBrowserSession(), base, invoke);
    const repeated = await observeBrowser(
      first,
      { ...base, sequence: 2 },
      invoke,
    );
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(await observeBrowser(repeated, base, invoke)).toBe(repeated);
  });
  it("adapts to changed content and sends only the new source", async () => {
    const invoke = model();
    let state = await observeBrowser(
      newBrowserSession(),
      {
        ...base,
        app: "email",
        url: "https://mail.google.com/mail/u/0/#inbox/ABCDEFGHIJKL",
        objectId: "/mail/u/0/ABCDEFGHIJKL",
        content: "Please explain payment failures.",
      },
      invoke,
    );
    state = await observeBrowser(state, { ...base, sequence: 2 }, invoke);
    const previous = state.context;
    state = await observeBrowser(
      state,
      { ...base, sequence: 3, content: "Payments are restored." },
      invoke,
    );
    expect(state.origin).toBe("live");
    expect(state.context?.entities).not.toEqual(previous?.entities);
    expect(state.context?.intent).not.toEqual(previous?.intent);
    expect(
      state.context?.facts.some((f) => f.text === "Payments remain delayed."),
    ).toBe(false);
    for (const call of vi
      .mocked(invoke)
      .mock.calls.filter((c) => c[0] === "extract"))
      expect((call[1] as { sources: unknown[] }).sources).toHaveLength(1);
  });
  it("keeps browser evidence and accepted graph on failure, without ACME fallback", async () => {
    const first = await observeBrowser(newBrowserSession(), base, model());
    const failed = await observeBrowser(
      first,
      { ...base, sequence: 2, content: "Still investigating." },
      async () => {
        throw new Error("offline");
      },
    );
    expect(failed.context).toEqual(first.context);
    expect(failed.sources[0].content).toBe("Still investigating.");
    expect(failed.origin).toBe("fallback");
    expect(JSON.stringify(failed)).not.toContain("ACME");
  });
  it("requires return to the original email and visible reply composer", async () => {
    const email = {
      ...base,
      app: "email" as const,
      url: "https://mail.google.com/mail/u/0/#inbox/ABCDEFGHIJKL",
      objectId: "/mail/u/0/ABCDEFGHIJKL",
    };
    let state = await observeBrowser(newBrowserSession(), email);
    state = await observeBrowser(state, { ...base, sequence: 2 });
    await expect(draftBrowser(state)).rejects.toThrow();
    state = await observeBrowser(state, { ...email, sequence: 3 });
    expect(state.boundary).toBe(false);
    state = await observeBrowser(state, {
      ...email,
      sequence: 4,
      action: "REPLY",
    });
    expect(state.boundary).toBe(true);
    const draft = await draftBrowser(state);
    expect(draft.draftOrigin).toBe("fallback");
    expect(JSON.stringify(draft.draft)).not.toContain("ACME");
    expect(draft.draft?.sentences.every((s) => !s.factIds.length)).toBe(true);
  });
  it("rejects unsupported quotes and private draft claims through the shared verifier", async () => {
    const invoke: Invoke = async (task, input) =>
      task === "verify"
        ? {
            checks: (
              input as { expectedCheckIds: string[] }
            ).expectedCheckIds.map((id) => ({ id, supported: false })),
          }
        : model()(task, input);
    const state = await observeBrowser(newBrowserSession(), base, invoke);
    expect(state.context).toBeUndefined();
    expect(state.origin).toBe("fallback");
    expect(state.sources[0].id).toBe(normalizeObservation(base).source.id);
  });
  it("bounds stalled work", async () => {
    vi.useFakeTimers();
    const result = expect(
      bounded(new Promise(() => {}), 18000),
    ).rejects.toThrow("timeout");
    await vi.advanceTimersByTimeAsync(18000);
    await result;
    vi.useRealTimers();
  });
});
it("namespaces independently generated IDs instead of overwriting historical records", async () => {
  const invoke: Invoke = async (task, input) => {
    const result = await model()(task, input);
    if (task !== "extract") return result;
    const context = result as LiveContext;
    context.entities[0].id = "entity";
    context.facts[0].id = "fact";
    context.facts[0].entityIds = ["entity"];
    context.intent.evidenceIds = ["fact"];
    return context;
  };
  const email: Observation = {
    ...base,
    app: "email",
    url: "https://mail.google.com/mail/u/0/#inbox/ABCDEFGHIJKL",
    objectId: "/mail/u/0/ABCDEFGHIJKL",
    content: "Please investigate the delay.",
  };
  const first = await observeBrowser(newBrowserSession(), email, invoke);
  const second = await observeBrowser(first, { ...base, sequence: 2 }, invoke);
  expect(second.origin).toBe("live");
  expect(second.context?.facts).toHaveLength(2);
  expect(second.context?.entities).toHaveLength(2);
  expect(new Set(second.context?.facts.map((f) => f.id)).size).toBe(2);
});

it("rejects unsupported ongoing work even if a model verifier would approve it", async () => {
  const { requireExplicitActions } = await import("../lib/live-context");
  const state = await observeBrowser(newBrowserSession(), base, model());
  const context = state.context!;
  expect(() =>
    requireExplicitActions(
      {
        sentences: [
          {
            text: "We continue to monitor the incident.",
            factIds: [context.facts[0].id],
          },
        ],
      },
      context,
    ),
  ).toThrow("Unsubstantiated");
  expect(() =>
    requireExplicitActions(
      {
        sentences: [
          {
            text: "Thank you for your patience as we continue to work on this issue.",
            factIds: [],
          },
        ],
      },
      context,
    ),
  ).toThrow("Unsubstantiated");
  expect(() =>
    requireExplicitActions(
      { sentences: [{ text: "Thank you for your patience.", factIds: [] }] },
      context,
    ),
  ).not.toThrow();
});
it("constrains model evidence to exact source IDs and allowed excerpts", async () => {
  const { liveContextSchemaForSources } = await import("../lib/live-schemas");
  const source = normalizeObservation(base).source;
  const schema = liveContextSchemaForSources([source.id], [source.content]);
  const output = (await model()("extract", {
    sources: [source],
  })) as LiveContext;
  expect(schema.safeParse(output).success).toBe(true);
  output.entities[0].evidence[0].sourceId = source.object!.id;
  expect(schema.safeParse(output).success).toBe(false);
  output.entities[0].evidence[0].sourceId = source.id;
  output.entities[0].evidence[0].quote = "Invented quote";
  expect(schema.safeParse(output).success).toBe(false);
});
