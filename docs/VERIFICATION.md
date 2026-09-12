# Verification — September 12, 2026

## Automated checks

- Phase 1: fixture tests, strict TypeScript and lint passed.
- Phase 2: 8 tests, strict TypeScript and lint passed.
- Phase 3: 13 tests, strict TypeScript and lint passed. Local API returned a valid missing-key fallback.
- Phase 4: 18 tests, strict TypeScript and lint passed.
- Final: 19 tests, strict TypeScript, lint and optimized production build passed.
- npm dependency audit: zero reported vulnerabilities after patching PostCSS and Vitest.

## Browser rehearsal

Verified the complete Email → Slack → GitHub → CRM → Email → Reply → Draft reply interaction in the local browser. Observed graph counts 3 → 5 → 8 → 10, confidence 40% → 70% → 90% → 97%, eight restored cross-app facts and a draft with seven customer-safe facts. The draft includes EU impact, deployment timing, routing cause, 14:32 UTC fix, normal errors and renewal context. It excludes ARR and internal account-risk labels.

Verified the production build renders, early Reply shows investigation guidance, skipping directly to CRM stays at 60% without a resolution claim, and Reset returns to the initial email with three entities, one fact and 40% confidence. Tightened the desktop layout so graph and intent are visible together at the browser's 1280 × 720 viewport.

Production API smoke checks passed: malformed requests return 400; drafting before the Reply boundary returns 409; full-path observation returns nine facts and 97%; drafting selects supported customer-safe sentences.

## Limits

No OPENAI_API_KEY was configured in the workspace. Live OpenAI account access, latency and actual model behavior are not verified. Offline tests exercise valid structured model responses, invalid outputs, unsupported source facts, model failures and fallback. Live draft composition is constrained to approved source-backed sentence variants.

The entire deterministic demo works without credentials. All application records are simulated. Nothing is sent or persisted.
