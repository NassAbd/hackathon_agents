import type { LiveContext } from "./live-schemas";

const stages = [
  "Customer",
  "Problem",
  "Investigation",
  "Root cause",
  "Resolution",
  "Outcome",
] as const;
export type StoryStep = LiveContext["entities"][number] & { stage: string };

// Presentation only: select from accepted model records; never synthesize claims or edges.
export function contextStory(context: LiveContext) {
  const classify = (entity: LiveContext["entities"][number]) => {
    const type = entity.type.toLowerCase().replaceAll("_", " ");
    const label = entity.label.toLowerCase();
    if (/person|contact|region|renewal|commercial|\bdate\b|metadata/.test(type))
      return -1;
    if (/customer|company|organization|organisation|account/.test(type))
      return 0;
    if (/root.?cause|configuration|config|cause/.test(`${type} ${label}`))
      return 3;
    if (
      /normal|restored|recovered|recovery|resolved|outcome/.test(
        `${type} ${label}`,
      )
    )
      return 5;
    if (/fix|remediation|resolution|mitigation/.test(`${type} ${label}`))
      return 4;
    if (/incident|issue|investigation|deployment/.test(label)) return 2;
    if (
      /problem|symptom|failure|timeout|error|delay|outage/.test(
        `${type} ${label}`,
      )
    )
      return 1;
    if (/incident|issue|investigation/.test(type)) return 2;
    if (/incident|issue/.test(label)) return 2;
    return -1;
  };
  const score = (id: string) =>
    context.relationships.filter((r) => r.source === id || r.target === id)
      .length *
      2 +
    context.facts.filter(
      (f) =>
        f.entityIds.includes(id) && context.intent.evidenceIds.includes(f.id),
    ).length;
  const primary: StoryStep[] = [];
  stages.forEach((stage, index) => {
    const candidates = context.entities.filter((e) => classify(e) === index);
    candidates.sort(
      (a, b) => score(b.id) - score(a.id) || a.id.localeCompare(b.id),
    );
    if (candidates[0]) primary.push({ ...candidates[0], stage });
  });
  // Unknown model types still get a useful, bounded overview, without invented semantic roles.
  if (!primary.length) {
    primary.push(
      ...[...context.entities]
        .sort((a, b) => score(b.id) - score(a.id))
        .slice(0, 4)
        .map((e) => ({ ...e, stage: "Context" })),
    );
  }
  const selected = new Set(primary.map((e) => e.id));
  return {
    primary,
    supporting: context.entities.filter((e) => !selected.has(e.id)),
  };
}
