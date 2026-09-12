# GHOST Hackathon Instructions

## Goal

Build a polished, reliable 2-minute demo of GHOST.

GHOST is an ambient browser-workflow agent.

It observes the user's navigation through simulated work applications,
accumulates contextual facts and entities, builds a live context graph,
infers the user's intent, and uses the collected context when the user
returns to act.

Core idea:

> Every app understands what happens inside it.
> GHOST understands why you move between them.

Secondary tagline:

> The prompt isn't what you type. The prompt is what you do.

## Demo flow

The only required end-to-end scenario is:

1. Open customer email from ACME.
2. Visit Slack and gather incident context.
3. Visit GitHub and gather root cause / resolution context.
4. Visit CRM and gather commercial context.
5. GHOST graph grows after each step.
6. GHOST intent becomes increasingly confident.
7. Return to Email.
8. Click Reply.
9. GHOST restores useful cross-app context.
10. Click Draft Reply.
11. A grounded reply appears.

Do not add "find missing context".

## MVP scope

Build only what improves the demo.

Required:
- Email mock app;
- Slack mock app;
- GitHub mock app;
- CRM mock app;
- GHOST sidebar;
- live graph;
- intent label;
- confidence score;
- event history;
- draft reply action;
- source provenance.

Explicitly out of scope:
- real Chrome extension;
- real Gmail integration;
- real Slack integration;
- real GitHub integration;
- real CRM integration;
- authentication;
- database;
- user accounts;
- long-term memory;
- multi-agent architecture;
- autonomous background activity;
- arbitrary web browsing;
- production-grade permissions.

Use realistic simulated work applications.

The interaction/event system and agent reasoning should be real.

## Stack

Prefer:

- Next.js
- React
- TypeScript
- Tailwind CSS
- OpenAI Agents SDK for JavaScript/TypeScript
- Zod
- React Flow (`@xyflow/react`)
- Zustand or simple React state

CopilotKit is optional.

Do not introduce a database.

Do not introduce additional frameworks unless they materially reduce implementation time.

## Architecture

Use one Next.js application.

Suggested modules:

```text
app/
  page.tsx
  api/ghost/route.ts

components/
  GhostSidebar.tsx
  ContextGraph.tsx
  MockEmail.tsx
  MockSlack.tsx
  MockGithub.tsx
  MockCRM.tsx

lib/
  ghost-store.ts
  event-types.ts
  schemas.ts
  prompts.ts
````

Keep architecture simple.

## Agent design

Use one agent.

Do not build a multi-agent system.

The agent has three jobs:

1. extract structured entities/facts/relationships;
2. infer the current user intent;
3. generate the final email reply.

All LLM outputs that affect application state must use structured schemas.

Use Zod validation.

Never parse important model output with brittle regexes or free-form text.

## Core state

Keep state in memory.

A page refresh may reset the demo.

Suggested state:

```ts
type GhostState = {
  events: GhostEvent[];
  nodes: GhostNode[];
  edges: GhostEdge[];
  facts: GhostFact[];
  intent: string;
  confidence: number;
  currentApp: AppId;
};
```

## Visual priority

The live graph is the hero feature.

It must visibly evolve as the user visits Slack, GitHub and CRM.

Each navigation should:

* add or update graph nodes;
* add relationships;
* update intent;
* update confidence.

The graph should be understandable at a glance.

Prefer deterministic visual layouts over clever but unstable layouts.

Animations should support comprehension, not distract.

## Intent behavior

Intent must evolve progressively.

Example:

Email:
`Investigate customer issue — 40%`

Slack:
`Understand ACME payment incident — 70%`

GitHub:
`Respond to ACME with incident resolution — 90%`

CRM:
`Resolve ACME escalation and protect renewal — 97%`

Do not expose hidden chain-of-thought.

You may show concise evidence such as:

* ACME raised a churn concern;
* user opened the related payment incident;
* renewal is in 19 days;
* user returned to reply.

## Reply behavior

When the user returns to the email and clicks Reply:

Show:

> Here's what you learned since opening this email.

Include the relevant facts with provenance.

Then expose one primary action:

`Draft reply`

The resulting draft must only use grounded facts already collected by GHOST.

## Build order

Always prioritize in this order:

1. complete static clickable demo;
2. GHOST sidebar;
3. hard-coded graph transitions;
4. live agent extraction;
5. live intent inference;
6. reply generation;
7. polish;
8. optional sponsor integrations.

If AI integration becomes unreliable, preserve a deterministic demo path.

## Reliability

This is a hackathon demo.

Prefer:

* deterministic fixtures;
* small schemas;
* few model calls;
* predictable state;
* graceful fallback behavior.

Avoid:

* unnecessary concurrency;
* complex orchestration;
* speculative abstractions;
* premature generalization.

## Tests

Prioritize tests for:

* event → state updates;
* Zod schemas;
* graph merge logic;
* intent-state updates;
* draft grounding.

Do not spend significant time testing presentational Tailwind markup.

## Verification

Before considering a major feature complete, run:

```bash
npx tsc --noEmit
npm run lint
npm test
```

Use the actual repository scripts if they differ.

## Hackathon decision rule

If a feature does not improve the 2-minute demo, do not build it.

````

## 3. Je ferais aussi un `README.md` humain

`AGENTS.md` = instructions à Codex.

`README.md` = explication du projet pour le jury / GitHub.

Ne surcharge pas `AGENTS.md` avec du marketing.

## 4. Et le spec GHOST

Le fichier qu’on a déjà produit, `GHOST_VISUAL_BUILD_SPEC.md`, je le mettrais par exemple dans :

```text
docs/GHOST_VISUAL_BUILD_SPEC.md
````

Puis dans `AGENTS.md` :

```md
For product details and demo intent, read:
`docs/GHOST_VISUAL_BUILD_SPEC.md`
```