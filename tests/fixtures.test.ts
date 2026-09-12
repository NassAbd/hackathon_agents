import { describe, expect, it } from "vitest";
import { apps, facts, pages } from "../lib/fixtures";
describe("ACME scenario contract", () => {
  it("supplies a grounded source for every application", () => {
    for (const app of apps) {
      expect(pages[app].content).toContain("ACME");
      expect(facts.filter((fact) => fact.app === app).length).toBeGreaterThan(
        0,
      );
    }
  });
  it("marks internal commercial facts as unsuitable for customer email", () => {
    expect(facts.find((f) => f.id === "arr")?.customerSafe).toBe(false);
    expect(facts.find((f) => f.id === "risk")?.customerSafe).toBe(false);
  });
});
