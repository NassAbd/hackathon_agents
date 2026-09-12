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
  id: string;
  app?: AppId;
  object?: { kind: "gmail-thread" | "github-issue"; id: string };
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
  const appFor = (id: string): AppId => {
    const source = sources.find((s) => s.id === id);
    if (source?.app) return source.app;
    return id === "slack" || id === "github" || id === "crm" ? id : "email";
  };
  const factByEntity = new Map<string, number>();
  for (const fact of context.facts)
    for (const id of fact.entityIds) factByEntity.set(id, (factByEntity.get(id) ?? 0) + 1);

  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const edge of context.relationships) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge.source]);
  }

  const scoreNode = (entity: LiveContext["entities"][number]) => {
    const value = `${entity.label} ${entity.type}`.toLowerCase();
    let score = (incoming.get(entity.id)?.length ?? 0) * 0.35;
    score += (outgoing.get(entity.id)?.length ?? 0) * 0.8;
    score += (factByEntity.get(entity.id) ?? 0) * 0.45;
    const keywords = [
      "customer",
      "incident",
      "issue",
      "failure",
      "cause",
      "outcome",
      "status",
      "resolved",
      "fix",
      "routing",
      "renewal",
      "region",
      "email",
      "payment",
    ];
    if (keywords.some((word) => value.includes(word))) score += 1.2;
    if (/^acme$/i.test(entity.label.trim())) score += 1.1;
    if (/customer|invoice|company|account/.test(value)) score += 0.7;
    return score;
  };

  const entities = context.entities
    .map((entity) => ({
      ...entity,
      score: scoreNode(entity),
      app: appFor(entity.evidence[0].sourceId),
    }))
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));

  const primaryCount = Math.min(5, Math.max(3, Math.ceil(entities.length / 2)));
  const primarySet = new Set(entities.slice(0, primaryCount).map((entry) => entry.id));
  const anchor = entities.find((entry) =>
    /customer|acme|email|company|account/.test(
      `${entry.label} ${entry.type}`.toLowerCase(),
    ),
  )?.id;

  const layerOf = new Map<string, number>();
  const queue: string[] = [];
  let head = 0;
  if (anchor) {
    layerOf.set(anchor, 0);
    queue.push(anchor);
  }

  while (head < queue.length) {
    const node = queue[head] ?? "";
    head += 1;
    const current = layerOf.get(node);
    if (current === undefined) continue;
    for (const next of outgoing.get(node) ?? []) {
      const nextDepth = current + 1;
      if (layerOf.get(next) !== undefined) continue;
      layerOf.set(next, nextDepth);
      queue.push(next);
    }
  }

  for (const entity of context.entities) {
    if (!layerOf.has(entity.id)) {
      const nearestPrimary = [...incoming.get(entity.id) ?? []].find((source) =>
        primarySet.has(source),
      );
      const fromIncoming = nearestPrimary
        ? (layerOf.get(nearestPrimary) ?? 1) + 1
        : primarySet.has(entity.id)
          ? 0
          : 2;
      layerOf.set(entity.id, Math.max(1, fromIncoming));
    }
  }

  const columns = new Map<number, string[]>();
  for (const entity of entities) {
    const column = layerOf.get(entity.id) ?? 0;
    const list = columns.get(column) ?? [];
    list.push(entity.id);
    columns.set(column, list);
  }
  const sortedEntries = context.entities.map((entity) => {
    const isPrimary = primarySet.has(entity.id);
    const col = layerOf.get(entity.id) ?? 0;
    const peers = columns.get(col) ?? [];
    const rank = peers.indexOf(entity.id);
    return {
      ...entity,
      app: appFor(entity.evidence[0].sourceId),
      factIds: context.facts
        .filter((f) => f.entityIds.includes(entity.id))
        .map((f) => f.id),
      isPrimary,
      x: col * 250 + 30,
      y: rank * 90 + (isPrimary ? 10 : 56),
      detail: isPrimary
        ? `PRIMARY · ${entity.type}`
        : `Supporting · ${entity.type}`,
    };
  });

  return {
    nodes: sortedEntries.map((entity) => ({
      id: entity.id,
      label: entity.label,
      detail: entity.detail,
      app: entity.app,
      x: entity.x,
      y: entity.y,
      factIds: entity.factIds,
      role: entity.isPrimary ? "primary" : "supporting",
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
      app: appFor(f.evidence[0].sourceId),
      customerSafe: f.customerSafe,
      source:
        sources.find((s) => s.id === f.evidence[0].sourceId)?.title ??
        f.evidence[0].sourceId,
    })),
    intent: context.intent,
  };
}

// Defense in depth after structured validation: ongoing/future organizational
// actions require explicit wording in the cited source evidence, not inference.
export function requireExplicitActions(
  draft: ReturnType<typeof validateDraft>,
  context: LiveContext,
) {
  const actions = [
    "monitor",
    "work on",
    "working on",
    "continue to",
    "refund",
    "credit",
    "compensat",
    "promise",
    "we will",
    "we'll",
    "we’ll",
    "we are aware",
    "we’re aware",
    "our tracking",
    "we managed",
    "we have",
    "we've",
    "we’ve",
    "we identified",
    "our ",
  ];
  for (const sentence of draft.sentences) {
    const evidence = context.facts
      .filter((fact) => sentence.factIds.includes(fact.id))
      .flatMap((fact) => fact.evidence.map((e) => e.quote.toLowerCase()))
      .join("\n");
    for (const action of actions) {
      if (
        ` ${sentence.text.toLowerCase()}`.includes(` ${action}`) &&
        !` ${evidence.replaceAll("\n", " ")}`.includes(` ${action}`)
      )
        throw new GroundingError(
          `Unsubstantiated organizational action (${action}); use neutral factual wording without unsupported monitoring, work, ownership or commitment claims`,
        );
    }
  }
}
