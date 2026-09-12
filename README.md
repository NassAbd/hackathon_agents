# GHOST Visual

**Every app understands what happens inside it. GHOST understands why you move between them.**

GHOST is an ambient workflow agent for customer success teams. Move through a simulated Email, Slack, GitHub and CRM workspace: your navigation builds a live context graph and progressively reveals the task you are trying to complete. Return to Email and click Reply to restore the context and draft a grounded response. No manual prompt is needed.

## Run

Requires Node.js 22+ (the project was verified with Node 24).

```bash
npm ci
npm run dev
```

Open the local URL printed by Next.js. The default port is 3000; Next.js selects another port if it is occupied. Refresh or **Reset demo** starts a fresh session.

The complete demo runs **without credentials**. To enable live inference, add these values to `.env.local` without overwriting any existing settings:

```dotenv
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-4.1-mini
GHOST_DEMO_MODE=false
```

Use a model available to your API project. Restart the server after changing environment variables. Set `GHOST_DEMO_MODE=true` for deterministic rehearsals. Never expose the key in a `NEXT_PUBLIC_` variable. The checked-in `.env.example` documents these options.

## Two-minute scenario

1. Read Sarah Chen’s ACME payment escalation in Email.
2. Open Slack: EU-only failures began after the latest deployment.
3. Open GitHub issue #4821: routing configuration root cause, fix at 14:32 UTC, error rate normal.
4. Open ACME in CRM: €120,000 ARR, renewal in 19 days, account at risk.
5. Return to Email and click **Reply**. GHOST restores the context with clickable source provenance.
6. Click **Draft reply**. An editable reply appears in the email composer. Nothing is sent.

In deterministic fallback, the graph grows from 3 to 5 to 8 to 10 entities. Live mode derives its entities and confidence from source content. Deterministic confidence evolves from 40% to 70% to 90% to 97%. Skipping a source does not disclose its facts or claim its resolution. Confidence is an evidence-based demo heuristic, not a calibrated probability.

See [the presenter script](docs/DEMO.md).

## What is real

- Instrumented navigation, reply and draft events.
- In-memory state, source-aware fact collection, graph merging, intent transitions and the return-to-email action boundary.
- A server-side OpenAI Agents SDK integration: one agent with strict Zod output, grounded fact IDs and verbatim evidence quotes.
- Live mode authors structured entities, facts, relationships, source quotes, intent and confidence from opened pages. It receives no pre-authored fact catalog, graph nodes, intent strings, confidence ceilings or sentence choices. Deterministic code only validates references and lays out the model-generated graph.
- Live drafts contain newly written model prose, with fact citations for each sentence. A separate structured verification call using the same agent checks the entire context and every sentence against source evidence. Unsupported claims, internal disclosures and invented commitments reject the candidate. One bounded correction is allowed before fallback. Draft requests reuse a server-signed, previously verified context snapshot and verify each new sentence; edited or stale snapshots are rejected. Semantic verification is model-based and fallible; it is not a mathematical guarantee. Exact-quote and reference checks are deterministic. Source-owned disclosure boundaries also override model privacy flags: CRM is private except for explicitly customer-visible excerpts.
- Fallback preserves the original fixture graph, intent thresholds and sentence variants. Live and fallback origins are separately displayed for context and drafts.
- A deterministic fallback runs on missing credentials, API errors, timeouts or invalid outputs. The UI labels fallback and live modes honestly.

## What is simulated

All four applications, people, accounts, messages and incident records are fixtures. No real Gmail, Slack, GitHub or CRM connection exists. There is no sending, authentication, database, persistence, background browsing or multi-agent orchestration. State resets with the page. The agent receives only simulated source content.

## Architecture

One Next.js app with strict TypeScript, React state, React Flow, Zod and the OpenAI Agents SDK. Plain CSS provides the visual system.

- `app/page.tsx`: the four clickable simulated applications.
- `components/ContextGraph.tsx`: fixed-position source-linked context graph.
- `components/GhostSidebar.tsx`: intent, restoration, provenance and history.
- `lib/fixtures.ts`: deterministic ACME source records.
- `lib/ghost-state.ts`: event reduction, graph derivation and fallback intent.
- `lib/use-ghost.ts`: session state, request cancellation and UI orchestration.
- `lib/schemas.ts`: deterministic fallback contracts.
- `lib/live-schemas.ts`: strict live context, draft, verification and API contracts.
- `lib/live-context.ts`: source/reference validation and generic graph layout.
- `lib/live-agent.ts`: one agent, extraction/drafting and independent verification calls.
- `lib/agent-service.ts`: server-side replay, evidence checks and fallback.
- `lib/draft.ts`: customer-safe sentence choices and grounded draft rendering.
- `app/api/ghost/route.ts`: the single server-side agent endpoint.

The starter-kit decision and rationale are in [IMPLEMENTATION_DECISION.md](docs/IMPLEMENTATION_DECISION.md). No starter source was copied. CopilotKit’s prompted chat and persistent-task infrastructure did not materially help this navigation-driven demo, so it is not a dependency.

## Verify

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

Tests cover source contracts, graph growth, revisits, skipped apps, action boundaries, invalid structured output, unsupported facts, fallback, customer-safe drafting, graph reference integrity and fail-closed semantic verification. Live API verification requires your own OpenAI credentials; offline tests do not establish account access.

Official API references: [Agents and structured outputs](https://openai.github.io/openai-agents-js/guides/agents/), [running and cancelling agents](https://openai.github.io/openai-agents-js/guides/running-agents/).

**The prompt isn’t what you type. The prompt is what you do.**

## Live adaptivity audit

Developer diagnostics expand below the event history in `npm run dev`. They show graph/intent/draft origins and structured output; server development logs also show structured model and verification responses. Neither includes API keys or chain-of-thought. Production builds omit this panel and detailed logs.

Run the opt-in test using your existing local key (incurs API usage):

```bash
GHOST_LIVE_TEST=true node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/agent.live.test.ts
```

It exercises all four apps and the draft endpoint, then temporarily changes the GitHub incident from resolved to unresolved in test memory while keeping the same navigation events. It asserts changed graph nodes, intent and draft, restores the fixture in `finally`, and writes the structured comparison to `/tmp/ghost-live-adaptivity.json`. No app server is started. Wait for the context update before drafting; extraction plus verification can take several seconds. Timeouts or rejected output preserve the deterministic demo.
