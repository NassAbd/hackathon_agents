We are starting the Agents Everywhere hackathon.

Our goal is to build GHOST Visual, as defined in this repository.

Before writing code:

1. Read the active AGENTS.md instructions.
2. Read docs/GHOST_VISUAL_BUILD_SPEC.md.
3. Read docs/RESOURCES.md if present.
4. Inspect the official Agents Everywhere starter kit if available locally.
   Focus only on:
   - its AGENTS.md
   - hackathon overview/rules
   - sponsor tooling guidance
   - the Web template and its README
5. Consult the official OpenAI Agents SDK and CopilotKit documentation only
   when needed for APIs or implementation details.

Then inspect the current repository.

## First decision

Determine the fastest and most reliable path to the GHOST MVP:

A. reuse the official Web starter/template and replace its example domain, or
B. use/build a minimal Next.js implementation.

Optimize for:
1. demo reliability,
2. implementation speed,
3. minimal complexity,
4. hackathon theme alignment.

Do not choose technology because it is available or sponsored.
Use it only if it materially helps the GHOST demo.

Make this decision autonomously and briefly record the rationale.

## Product goal

Build ONE polished end-to-end scenario:

Email from ACME
→ Slack investigation
→ GitHub incident
→ CRM account context
→ return to Email
→ Reply
→ GHOST restores cross-app context
→ Draft Reply.

GHOST must progressively:

- observe application/navigation events,
- collect grounded entities and facts,
- preserve source provenance,
- build a live visual context graph,
- infer and refine the user's intent,
- increase intent confidence as context accumulates,
- recognize the return to Email as an action boundary,
- generate a grounded reply from the collected context.

The live graph and evolving intent are the hero features.

No manual prompt should be required during the demo.

Core idea:

"Every app understands what happens inside it.
GHOST understands why you move between them."

"The prompt isn't what you type. The prompt is what you do."

## Scope discipline

Do NOT build:

- real Gmail/Slack/GitHub/CRM integrations,
- authentication,
- database persistence,
- multi-agent orchestration,
- voice,
- browser-wide/OS-wide tracking,
- autonomous background browsing,
- "find missing context",
- unrelated sponsor integrations,
- generic platform abstractions.

Use realistic simulated applications and deterministic ACME fixtures.

The event processing, graph/state behavior, intent inference, and final
draft-generation path should be real.

## Execution strategy

Work autonomously in phases.

Phase 1:
Create the complete polished static/clickable workspace and ACME scenario.

Phase 2:
Implement deterministic GHOST events, graph evolution, intent evolution,
confidence and provenance.

Phase 3:
Integrate the OpenAI agent using strict structured outputs/Zod where AI
materially improves extraction or intent inference.

Phase 4:
Implement the Email return → Reply → contextual restoration → grounded
Draft Reply flow.

Phase 5:
Polish animations, transitions, loading/error states and demo reliability.

IMPORTANT:

Do not wait until all phases are complete before having something runnable.

At the end of every phase:
- keep the application runnable,
- run relevant tests,
- type-check,
- lint,
- fix regressions before continuing.

If an AI-powered behavior threatens demo reliability, preserve a deterministic
fallback path.

Prefer the simplest implementation that produces the intended experience.

Do not over-engineer.

Do not stop to ask me about low-risk implementation details.
Make reasonable decisions and continue.

Stop only for:
- a consequential product ambiguity,
- an architectural decision that materially changes the MVP,
- missing credentials required for the core path,
- destructive/irreversible operations,
- or a blocker you cannot reasonably solve.

## Start now

First inspect the instructions, spec, repository, and relevant starter-kit
Web implementation.

Give me a concise assessment containing:
- starter kit vs minimal implementation decision,
- architecture you will use,
- any genuine blocker.

Then immediately begin Phase 1 unless there is a genuine blocker.

The overriding rule for the entire hackathon:

IF IT DOES NOT IMPROVE THE 2-MINUTE DEMO, DO NOT BUILD IT.