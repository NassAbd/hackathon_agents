import { describe, expect, it } from "vitest";
import {
  validateContext,
  validateDraft,
  requireVerification,
  graphFromContext,
} from "../lib/live-context";
import type { LiveContext } from "../lib/live-schemas";
const sources = [
  {
    id: "slack" as const,
    title: "Incident",
    url: "local",
    content: "APAC payments are delayed. No fix is deployed.",
  },
];
const context: LiveContext = {
  entities: [
    {
      id: "region",
      label: "APAC",
      type: "region",
      evidence: [{ sourceId: "slack", quote: "APAC" }],
    },
  ],
  facts: [
    {
      id: "delay",
      text: "APAC payments are delayed.",
      entityIds: ["region"],
      customerSafe: true,
      evidence: [{ sourceId: "slack", quote: "APAC payments are delayed." }],
    },
  ],
  relationships: [],
  intent: {
    label: "Explain the APAC payment delay",
    confidence: 0.63,
    evidenceIds: ["delay"],
  },
};
describe("adaptive grounded context", () => {
  it("derives graph labels and intent from model records, without ACME IDs", () => {
    expect(validateContext(context, sources)).toEqual(context);
    const graph = graphFromContext(context, sources);
    expect(graph.nodes[0].label).toBe("APAC");
    expect(graph.facts[0].id).toBe("delay");
    expect(graph.intent.confidence).toBe(0.63);
  });
  it("rejects fabricated quotes, unopened sources, dangling references and duplicate IDs", () => {
    for (const mutate of [
      (c: LiveContext) => {
        c.facts[0].evidence[0].quote = "All payments are fixed";
      },
      (c: LiveContext) => {
        c.facts[0].evidence[0].sourceId = "github";
      },
      (c: LiveContext) => {
        c.facts[0].entityIds = ["invented"];
      },
      (c: LiveContext) => {
        c.entities.push(c.entities[0]);
      },
    ]) {
      const candidate = structuredClone(context);
      mutate(candidate);
      expect(() => validateContext(candidate, sources)).toThrow();
    }
  });
  it("rejects internal-only and unknown draft citations", () => {
    const internal = structuredClone(context);
    internal.facts[0].customerSafe = false;
    expect(() =>
      validateDraft(
        { sentences: [{ text: "Private fact", factIds: ["delay"] }] },
        internal,
      ),
    ).toThrow();
    expect(() =>
      validateDraft(
        { sentences: [{ text: "Unknown fact", factIds: ["fake"] }] },
        context,
      ),
    ).toThrow();
  });
  it("fails closed on unsupported or omitted semantic checks", () => {
    expect(() => requireVerification({ checks: [] }, ["sentence:0"])).toThrow();
    expect(() =>
      requireVerification(
        { checks: [{ id: "sentence:0", supported: false }] },
        ["sentence:0"],
      ),
    ).toThrow();
    expect(() =>
      requireVerification({ checks: [{ id: "sentence:0", supported: true }] }, [
        "sentence:0",
      ]),
    ).not.toThrow();
  });
});

import { runLive } from "../lib/live-agent";
it("rejects a plausible invented commitment even when it cites a real fact", async () => {
  await expect(
    runLive({
      sources,
      events: [],
      previous: context,
      mode: "draft",
      invoke: async (task) =>
        task === "draft"
          ? {
              sentences: [
                {
                  text: "We will refund every delayed payment tomorrow.",
                  factIds: ["delay"],
                },
              ],
            }
          : {
              checks: [
                { id: "entity:region", supported: true },
                { id: "fact:delay", supported: true },
                { id: "intent", supported: true },
                { id: "sentence:0", supported: false },
              ],
            },
    }),
  ).rejects.toThrow("Semantic grounding rejected");
});
it("renders newly generated wording after every claim passes verification", async () => {
  const result = await runLive({
    sources,
    events: [],
    previous: context,
    mode: "draft",
    invoke: async (task) =>
      task === "draft"
        ? {
            sentences: [
              {
                text: "Payments in APAC are currently delayed.",
                factIds: ["delay"],
              },
            ],
          }
        : {
            checks: ["entity:region", "fact:delay", "intent", "sentence:0"].map(
              (id) => ({ id, supported: true }),
            ),
          },
  });
  expect(result.draft?.sentences[0].text).toBe(
    "Payments in APAC are currently delayed.",
  );
});
it("allows one model correction but never admits ungrounded source quotes", async () => {
  let extractions = 0;
  const result = await runLive({
    sources,
    events: [],
    mode: "observe",
    invoke: async (task) => {
      if (task === "extract") {
        extractions++;
        const candidate = structuredClone(context);
        if (extractions === 1)
          candidate.facts[0].evidence[0].quote = "fabricated";
        return candidate;
      }
      return {
        checks: ["entity:region", "fact:delay", "intent"].map((id) => ({
          id,
          supported: true,
        })),
      };
    },
  });
  expect(extractions).toBe(2);
  expect(result.context.facts[0].evidence[0].quote).toBe(
    sources[0].content.split(" No")[0],
  );
});
it("overrides model privacy flags using source-owned disclosure boundaries", () => {
  const privateSource = [
    { ...sources[0], customerSafeContent: ["No fix is deployed."] },
  ];
  const validated = validateContext(context, privateSource);
  expect(validated.facts[0].customerSafe).toBe(false);
  expect(() =>
    validateDraft(
      {
        sentences: [{ text: "APAC payments are delayed.", factIds: ["delay"] }],
      },
      validated,
    ),
  ).toThrow();
  // An outdated disclosure excerpt cannot authorize a changed source.
  expect(
    validateContext(context, [
      { ...sources[0], customerSafeContent: ["Old source text"] },
    ]).facts[0].customerSafe,
  ).toBe(false);
});
it("never passes internal context or source pages to the drafting call", async () => {
  const mixed = structuredClone(context);
  mixed.facts.push({
    ...mixed.facts[0],
    id: "private",
    text: "INTERNAL_ONLY_SENTINEL",
    customerSafe: false,
  });
  let draftInput = "";
  await runLive({
    sources,
    events: [],
    previous: mixed,
    mode: "draft",
    invoke: async (task, input) => {
      if (task === "draft") {
        draftInput = JSON.stringify(input);
        return {
          sentences: [
            { text: "Payments in APAC are delayed.", factIds: ["delay"] },
          ],
        };
      }
      return {
        checks: [
          "entity:region",
          "fact:delay",
          "fact:private",
          "intent",
          "sentence:0",
        ].map((id) => ({ id, supported: true })),
      };
    },
  });
  expect(draftInput).not.toContain("INTERNAL_ONLY_SENTINEL");
  expect(JSON.parse(draftInput).rejected).toBeNull();
});
