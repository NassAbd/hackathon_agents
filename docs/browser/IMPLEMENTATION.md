# Browser Reality Layer

Branch: `feat/browser-reality-layer`.

Architecture: MV3 content script → window-scoped service-worker message → side panel iframe → separate `/api/ghost/browser` transport → existing GHOST agent, schemas, grounding validators and graph renderer. `/` and `/api/ghost` keep the simulated flow.

`ObservationSchema` validates source/page identity and normalized navigation. Existing source evidence IDs now accept page identities, while `Source.app` retains app coloring. Source objects carry canonical URLs and object type/ID. `GhostEvent` remains unchanged. Browser event/session state is an adapter around real sources, not the fixture-dependent simulated reducer.

`runIncremental` in the existing agent module extracts one changed source, semantically verifies its records, retires obsolete evidence from that source, and merges accepted records. `runGroundedDraft` uses the same agent, customer-safe filtering and sentence verifier. Browser transport never invokes `replay`, fixture fallback, or fixed incident sentence variants.

All sessions are bounded, ephemeral process memory; requests within a session serialize. Client events coalesce while processing and sequence numbers reject stale responses/events. Existing accepted graph provenance retains its source snapshot after a rejected page change. No browser content is logged server-side.

Verification commands:

```sh
npm run typecheck
npm run lint
npm test
npm run build
# Optional actual OpenAI calls; reads .env.local without printing credentials:
GHOST_BROWSER_LIVE_TEST=true npx vitest run tests/browser-live.test.ts
```

Manual verification requires Chrome with the unpacked extension and the dedicated Gmail account. See `extension/README.md`. A DOM fixture test is not proof of installed-extension behavior.

## Verification status

The offline suite includes DOM isolation, credential-like text exclusion, canonical provenance, stale-event rejection, repeated-source deduplication, source-change replacement, model-ID collision handling, reply boundaries, bounded timeout, source-only fallback, transport validation and explicit-action grounding checks. The original simulated tests remain in the same suite.

The public GitHub issue was inspected in the available browser to confirm the current `issue-title`, `header-state`, `issue-body-viewer` and `markdown-body` DOM markers. The Gmail DOM fixture is representative; it is not a capture from the private demo inbox.

The opt-in live adaptation test sends a synthetic email and the saved public issue fixture to OpenAI, then changes resolution to an ongoing incident with a rolled-back fix. It asserts different entities/intent/draft and removal of the old 14:32 resolution claim. `LIVE_VERIFICATION.json` records the most recent successful before/after run and its limited scope. It contains only synthetic/public fixture results.

The installed Chrome extension and real Gmail account still require manual verification. Chrome was unavailable through the connected browser-control surface; only the in-app browser was connected. No real Gmail content was read or transmitted during development.

Grounding is conservative: exact schema-enumerated source excerpts, local reference checks, semantic verification and an additional explicit-action check. A rejected output gets at most one repair within the same 18-second budget. Semantic verification is model-based and can still miss paraphrased unsupported claims; generated drafts remain reviewable and are never sent automatically.
