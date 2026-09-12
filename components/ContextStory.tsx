"use client";
import { contextStory } from "@/lib/context-story";
import type { LiveContext } from "@/lib/live-schemas";
import type { Source } from "@/lib/live-context";

export function ContextStory({
  context,
  sources,
}: {
  context?: LiveContext;
  sources: Source[];
}) {
  const story = context
    ? contextStory(context)
    : { primary: [], supporting: [] };
  function badges(entity: LiveContext["entities"][number]) {
    return [...new Set(entity.evidence.map((e) => e.sourceId))].map((id) => {
      const source = sources.find((s) => s.id === id);
      return (
        <a
          key={id}
          className={`story-source ${source?.app}`}
          href={source?.url}
          target="_blank"
          rel="noreferrer"
          title={source?.title}
        >
          {source?.app === "email" ? "Gmail" : "GitHub"}
        </a>
      );
    });
  }
  return (
    <section className="context-story" aria-label="Context story">
      <div className="story-heading">
        <span className="eyebrow">CONTEXT STORY</span>
        <span>{story.primary.length} key steps</span>
      </div>
      {!story.primary.length && (
        <p className="story-empty">
          Your story begins with the email. Open a source to collect context.
        </p>
      )}
      <ol className="story-steps">
        {story.primary.map((step) => (
          <li key={step.id} className="story-step">
            <div className="story-step-header">
              <small>{step.stage}</small>
              <span>{badges(step)}</span>
            </div>
            <strong>{step.label}</strong>
          </li>
        ))}
      </ol>
      {!!story.supporting.length && (
        <details className="story-support">
          <summary>Supporting context · {story.supporting.length}</summary>
          {story.supporting.map((entity) => (
            <div className="story-support-card" key={entity.id}>
              <span>{entity.label}</span>
              <span>{badges(entity)}</span>
            </div>
          ))}
        </details>
      )}
      {!!context?.relationships.length && (
        <details className="story-support">
          <summary>
            Source relationships · {context.relationships.length}
          </summary>
          {context.relationships.map((r) => (
            <p key={r.id}>
              {context.entities.find((e) => e.id === r.source)?.label}{" "}
              <small>— {r.label} →</small>{" "}
              {context.entities.find((e) => e.id === r.target)?.label}
            </p>
          ))}
        </details>
      )}
    </section>
  );
}
