import {
  LiveContextSchema,
  LiveDraftSchema,
  VerificationSchema,
  type LiveContext,
} from "./live-schemas";
import type { AppId } from "./fixtures";
import type { GhostState } from "./ghost-state";
export class GroundingError extends Error {}
export type Source = {
  id: AppId;
  title: string;
  url: string;
  content: string;
  customerSafeContent?: string[];
};
function unique(ids: string[]) {
  if (new Set(ids).size !== ids.length)
    throw new GroundingError("Duplicate context IDs");
}
export function validateContext(
  input: unknown,
  sources: Source[],
): LiveContext {
  const context = LiveContextSchema.parse(input);
  unique(context.entities.map((e) => e.id));
  unique(context.facts.map((f) => f.id));
  unique(context.relationships.map((r) => r.id));
  const entities = new Set(context.entities.map((e) => e.id));
  const facts = new Set(context.facts.map((f) => f.id));
  for (const record of [...context.entities, ...context.facts]) {
    for (const evidence of record.evidence) {
      const source = sources.find((s) => s.id === evidence.sourceId);
      if (
        !source ||
        !source.content.includes(evidence.quote) ||
        !evidence.quote.trim()
      )
        throw new GroundingError(
          `Unsupported source quote on record ${record.id}, source ${evidence.sourceId}`,
        );
    }
  }
  // Source-owned disclosure policy overrides model classification, never the reverse.
  for (const fact of context.facts) {
    fact.customerSafe =
      fact.customerSafe &&
      fact.evidence.every((e) => {
        const source = sources.find((s) => s.id === e.sourceId)!;
        return (
          !source.customerSafeContent ||
          source.customerSafeContent.some(
            (excerpt) =>
              source.content.includes(excerpt) && excerpt.includes(e.quote),
          )
        );
      });
  }
  for (const source of sources) {
    if (
      !context.facts.some((f) =>
        f.evidence.some((e) => e.sourceId === source.id),
      )
    ) {
      throw new GroundingError(
        `Missing context from opened source ${source.id}`,
      );
    }
  }
  for (const fact of context.facts)
    if (fact.entityIds.some((id) => !entities.has(id)))
      throw new GroundingError("Unknown entity");
  for (const edge of context.relationships) {
    if (
      !entities.has(edge.source) ||
      !entities.has(edge.target) ||
      edge.factIds.some((id) => !facts.has(id))
    )
      throw new GroundingError(
        `Unknown relationship reference on ${edge.id}: endpoints ${edge.source} -> ${edge.target} must be entity IDs; factIds ${edge.factIds.join(",")} must be fact IDs`,
      );
  }
  if (context.intent.evidenceIds.some((id) => !facts.has(id)))
    throw new GroundingError("Unknown intent evidence");
  // Rounding is visual only; no step-based cap or forced monotonic increase.
  context.intent.confidence = Math.round(context.intent.confidence * 100) / 100;
  return context;
}
export function validateDraft(input: unknown, context: LiveContext) {
  const draft = LiveDraftSchema.parse(input);
  for (const sentence of draft.sentences) {
    if (
      sentence.factIds.some(
        (id) => !context.facts.some((f) => f.id === id && f.customerSafe),
      )
    )
      throw new GroundingError("Unsupported or internal draft reference");
  }
  return draft;
}
export function contextCheckIds(context: LiveContext) {
  return [
    ...context.entities.map((e) => `entity:${e.id}`),
    ...context.facts.map((f) => `fact:${f.id}`),
    ...context.relationships.map((r) => `relationship:${r.id}`),
    "intent",
  ];
}
export function requireVerification(input: unknown, expected: string[]) {
  const result = VerificationSchema.parse(input);
  unique(result.checks.map((c) => c.id));
  if (
    result.checks.length !== expected.length ||
    expected.some(
      (id) => !result.checks.some((c) => c.id === id && c.supported),
    )
  )
    throw new GroundingError(
      `Semantic grounding rejected: ${expected.filter((id) => !result.checks.some((c) => c.id === id && c.supported)).join(", ")}`,
    );
}
export function graphFromContext(
  context: LiveContext,
  sources: Source[],
): Pick<GhostState, "nodes" | "edges" | "facts" | "intent"> {
  return {
    nodes: context.entities.map((entity, index) => ({
      id: entity.id,
      label: entity.label,
      detail: entity.type,
      app: entity.evidence[0].sourceId,
      x: (index % 3) * 140 + 4,
      y: Math.floor(index / 3) * 75 + 10,
      factIds: context.facts
        .filter((f) => f.entityIds.includes(entity.id))
        .map((f) => f.id),
    })),
    edges: context.relationships.map((r) => ({
      id: r.id,
      source: r.source,
      target: r.target,
      label: r.label,
    })),
    facts: context.facts.map((f) => ({
      id: f.id,
      text: f.text,
      app: f.evidence[0].sourceId,
      customerSafe: f.customerSafe,
      source:
        sources.find((s) => s.id === f.evidence[0].sourceId)?.title ??
        f.evidence[0].sourceId,
    })),
    intent: context.intent,
  };
}
