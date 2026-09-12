import { expect, it } from "vitest";
import { contextStory } from "../lib/context-story";
import type { LiveContext } from "../lib/live-schemas";

it("keeps a status update in the outcome, not date metadata", () => {
  const next = structuredClone(context);
  next.entities[5].type = "status_update";
  next.entities[5].label = "Search rates returned to normal";
  expect(contextStory(next).primary.at(-1)?.id).toBe("result");
});

const context: LiveContext = {
  entities: [
    ["company", "Northstar", "organization"],
    ["problem", "Search timeouts", "problem"],
    ["incident", "Incident #92", "incident"],
    ["cause", "Index configuration", "root cause"],
    ["fix", "Fix deployed 09:10", "resolution"],
    ["result", "Search recovered", "outcome"],
    ["person", "Taylor", "person"],
    ["renewal", "Renewal in 10 days", "renewal"],
  ].map(([id, label, type]) => ({
    id,
    label,
    type,
    evidence: [{ sourceId: "source", quote: label }],
  })),
  facts: [],
  relationships: [],
  intent: {
    label: "Explain search recovery",
    confidence: 0.9,
    evidenceIds: [],
  },
};
it("bounds the story to semantic steps and preserves supporting entities and source values", () => {
  const original = structuredClone(context);
  const story = contextStory(context);
  expect(story.primary.map((e) => e.id)).toEqual([
    "company",
    "problem",
    "incident",
    "cause",
    "fix",
    "result",
  ]);
  expect(story.supporting.map((e) => e.id)).toEqual(["person", "renewal"]);
  expect(context).toEqual(original);
  expect(story.primary[4].evidence).toEqual(context.entities[4].evidence);
});
it("adapts to changed model values and uses topology to select among competing concepts", () => {
  const next = structuredClone(context);
  next.entities.push({
    ...next.entities[1],
    id: "secondary",
    label: "Latency spike",
  });
  next.relationships.push({
    id: "r",
    source: "company",
    target: "secondary",
    label: "reports",
    factIds: [],
  });
  next.entities[5].label = "Search still degraded";
  const story = contextStory(next);
  expect(story.primary).toHaveLength(6);
  expect(story.primary[1].label).toBe("Latency spike");
  expect(story.primary[5].label).toBe("Search still degraded");
  expect(story.supporting.some((e) => e.id === "problem")).toBe(true);
});
