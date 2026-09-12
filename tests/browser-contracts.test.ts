import { expect, it } from "vitest";
import { normalizeObservation } from "../lib/browser/contracts";
export const observation = {
  id: "12345678-1234-4123-8123-123456789abc",
  sequence: 1,
  timestamp: 1,
  app: "github" as const,
  url: "https://github.com/NassAbd/ghost-demo-workspace/issues/1?token=secret",
  objectId: "/NassAbd/ghost-demo-workspace/issues/1",
  title: "Incident",
  content: "Payments remain delayed.",
  action: "OPEN" as const,
  extractionMs: 2,
};
it("normalizes page identity and discards URL query secrets", () => {
  const { source } = normalizeObservation(observation);
  expect(source.url).not.toContain("secret");
  expect(source.object?.kind).toBe("github-issue");
});
it("rejects unrelated pages and mismatched objects", () => {
  expect(() =>
    normalizeObservation({
      ...observation,
      url: "https://github.com/other/repo/issues/1",
    }),
  ).toThrow();
  expect(() =>
    normalizeObservation({ ...observation, objectId: "other" }),
  ).toThrow();
  expect(() =>
    normalizeObservation({
      ...observation,
      app: "email",
      url: "https://mail.google.com/mail/u/0/#inbox",
    }),
  ).toThrow();
});
it("rejects credential-like text before storing a source", () => {
  expect(() =>
    normalizeObservation({
      ...observation,
      content: "password: placeholder-do-not-collect",
    }),
  ).toThrow("Credential-like");
});
