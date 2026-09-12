import { z } from "zod";
import { approvedSentences, buildDraft } from "./draft";
import { pages } from "./fixtures";
import { initialState, reduceEvent, type GhostState } from "./ghost-state";
import {
  AgentOutputSchema,
  type AgentOutput,
  type AgentResponse,
  RequestSchema,
} from "./schemas";
export type AgentRequest = z.infer<typeof RequestSchema>;
export type AgentRuntime = {
  enabled: boolean;
  reason?: "no_key" | "disabled";
  invoke: (state: GhostState, mode: AgentRequest["mode"]) => Promise<unknown>;
};
export function replay(events: AgentRequest["events"]): GhostState {
  return events.reduce(reduceEvent, initialState());
}
export function fallbackOutput(state: GhostState): AgentOutput {
  return {
    extractedFacts: state.facts.map((f) => ({
      factId: f.id,
      quote: pages[f.app].content,
    })),
    intent: state.intent,
    draftSentenceIds: [],
  };
}
export function validateOutput(input: unknown, state: GhostState): AgentOutput {
  const output = AgentOutputSchema.parse(input);
  const allowed = new Map(state.facts.map((f) => [f.id, f]));
  const ids = new Set(output.extractedFacts.map((f) => f.factId));
  if (
    ids.size !== state.facts.length ||
    ids.size !== output.extractedFacts.length
  )
    throw new Error("Incomplete extraction");
  for (const extracted of output.extractedFacts) {
    const fact = allowed.get(extracted.factId);
    if (
      !fact ||
      extracted.quote.trim().length < 8 ||
      !pages[fact.app].content.includes(extracted.quote)
    )
      throw new Error(
        `Ungrounded extraction: ${fact?.id ?? "unknown"} (${extracted.quote.trim().length < 8 ? "short quote" : "source mismatch"})`,
      );
  }
  if (
    !output.intent.evidenceIds.length ||
    output.intent.evidenceIds.some((id) => !allowed.has(id))
  )
    throw new Error("Ungrounded intent evidence");
  output.intent.confidence = Math.min(
    output.intent.confidence,
    state.intent.confidence,
  );
  return output;
}
export async function processRequest(
  input: AgentRequest,
  runtime: AgentRuntime,
): Promise<AgentResponse> {
  const request = RequestSchema.parse(input);
  const state = replay(request.events);
  if (request.mode === "draft" && !state.boundary)
    throw new Error("Return to Email and click Reply first");
  const fallback = fallbackOutput(state);
  if (request.mode === "draft")
    fallback.draftSentenceIds = approvedSentences(state.facts).map((s) => s.id);
  if (!runtime.enabled)
    return {
      output: fallback,
      mode: "fallback",
      reason: runtime.reason ?? "no_key",
    };
  let stage: "model" | "validation" = "model";
  try {
    const result = await runtime.invoke(state, request.mode);
    stage = "validation";
    const output = validateOutput(result, state);
    if (request.mode === "draft")
      buildDraft(state.facts, output.draftSentenceIds);
    else if (output.draftSentenceIds.length) throw new Error("Premature draft");
    return { output, mode: "live", reason: null };
  } catch (error) {
    // Log only diagnostic metadata, never credentials, source content, or SDK payloads.
    console.warn("GHOST fallback", {
      stage,
      validationError:
        stage === "validation" &&
        error instanceof Error &&
        !(error instanceof z.ZodError)
          ? error.message
          : undefined,
      errorType: error instanceof Error ? error.name : "UnknownError",
      status:
        error !== null &&
        typeof error === "object" &&
        "status" in error &&
        typeof error.status === "number"
          ? error.status
          : undefined,
    });
    return { output: fallback, mode: "fallback", reason: "unavailable" };
  }
}
