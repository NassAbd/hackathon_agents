import { describe, expect, it, vi } from "vitest";
import {
  fallbackOutput,
  validateOutput,
  processRequest,
} from "../lib/agent-service";
import { initialState, reduceEvent } from "../lib/ghost-state";
import {
  AgentOutputSchema,
  RequestSchema,
  agentOutputSchemaForFacts,
} from "../lib/schemas";
const email = initialState();
const slack = reduceEvent(email, {
  id: "slack",
  app: "slack",
  action: "OPEN",
  timestamp: 1,
});
describe("structured agent boundary", () => {
  it("constrains model evidence to canonical collected fact IDs", () => {
    const schema = agentOutputSchemaForFacts(slack.facts.map((f) => f.id));
    const output = fallbackOutput(slack);
    expect(schema.safeParse(output).success).toBe(true);
    for (const id of ["1", "initial-email", "fix"]) {
      expect(
        schema.safeParse({
          ...output,
          intent: { ...output.intent, evidenceIds: [id] },
        }).success,
      ).toBe(false);
    }
    output.extractedFacts[0].factId = "1";
    expect(schema.safeParse(output).success).toBe(false);
  });
  it("falls back on invalid evidence instead of guessing a reference", async () => {
    const output = fallbackOutput(slack);
    output.intent = { ...output.intent, evidenceIds: ["1"] };
    const result = await processRequest(
      { mode: "observe", events: slack.events },
      { enabled: true, invoke: async () => output },
    );
    expect(result.mode).toBe("fallback");
    expect(result.output.intent.evidenceIds).toEqual(slack.intent.evidenceIds);
  });
  it("rejects facts from unopened pages", () => {
    const output = fallbackOutput(email);
    output.extractedFacts.push({
      factId: "fix",
      quote: "Fix deployed at 14:32 UTC.",
    });
    expect(() => validateOutput(output, email)).toThrow();
  });
  it("rejects fabricated source quotes", () => {
    const output = fallbackOutput(slack);
    output.extractedFacts[1].quote = "The database was corrupted";
    expect(() => validateOutput(output, slack)).toThrow();
  });
  it("keeps a fact tied to its original source when CRM repeats it", () => {
    const crm = reduceEvent(slack, {
      id: "crm",
      app: "crm",
      action: "OPEN",
      timestamp: 2,
    });
    const output = fallbackOutput(crm);
    output.extractedFacts[0].quote =
      "Customer flagged recurring payment failures ahead of renewal.";
    expect(() => validateOutput(output, crm)).toThrow(
      "concern (source mismatch)",
    );
  });
  it("rejects malformed model state and confidence", () => {
    const output = fallbackOutput(email);
    expect(
      AgentOutputSchema.safeParse({
        ...output,
        intent: { ...output.intent, confidence: 1.2 },
      }).success,
    ).toBe(false);
    expect(
      RequestSchema.safeParse({ mode: "observe", events: [], extra: true })
        .success,
    ).toBe(false);
  });
  it("never calls a model without credentials", async () => {
    const invoke = vi.fn();
    const result = await processRequest(
      { mode: "observe", events: slack.events },
      { enabled: false, reason: "no_key", invoke },
    );
    expect(result.mode).toBe("fallback");
    expect(result.reason).toBe("no_key");
    expect(invoke).not.toHaveBeenCalled();
    expect(result.output.extractedFacts).toHaveLength(3);
  });
  it("uses validated live inference and handles model failures", async () => {
    const output = fallbackOutput(slack);
    output.intent.label = "Investigate the EU payment escalation for ACME";
    const input = { mode: "observe" as const, events: slack.events };
    const live = await processRequest(input, {
      enabled: true,
      invoke: async () => output,
    });
    expect(live.mode).toBe("live");
    expect(live.output.intent.label).toBe(output.intent.label);
    const failed = await processRequest(input, {
      enabled: true,
      invoke: async () => {
        throw new Error("timeout");
      },
    });
    expect(failed.mode).toBe("fallback");
    expect(failed.output.intent.confidence).toBe(0.7);
  });
});
