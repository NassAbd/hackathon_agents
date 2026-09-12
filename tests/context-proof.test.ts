import { expect, it } from "vitest";
import { signContext, verifyContextProof } from "../lib/context-proof";
import type { LiveContext } from "../lib/live-schemas";
const context: LiveContext = {
  entities: [],
  facts: [],
  relationships: [],
  intent: { label: "test", confidence: 0.5, evidenceIds: [] },
};
const sources = [
  {
    id: "crm" as const,
    title: "CRM",
    url: "local",
    content: "Renewal in 19 days.",
  },
];
it("binds prior verification to exact context and source snapshots", () => {
  const proof = signContext(context, sources);
  expect(verifyContextProof(context, sources, proof)).toBe(true);
  expect(
    verifyContextProof(
      { ...context, intent: { ...context.intent, confidence: 1 } },
      sources,
      proof,
    ),
  ).toBe(false);
  expect(
    verifyContextProof(
      context,
      [{ ...sources[0], content: "Renewal cancelled." }],
      proof,
    ),
  ).toBe(false);
  expect(verifyContextProof(context, sources, "x".repeat(64))).toBe(false);
});
