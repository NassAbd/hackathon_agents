# GHOST Browser Reality Layer

Runs alongside the unchanged simulated demo. No Google/GitHub API, OAuth, screenshots, OCR, storage, or account credentials in the extension.

## Run locally

1. From the project root, run `npm run dev -- --port 3000`. Keep `OPENAI_API_KEY` in `.env.local`, with `GHOST_DEMO_MODE=false`. The server must listen at **http://127.0.0.1:3000** (not another port).
2. In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select this `extension` directory.
3. Refresh the Gmail demo tab and the demo GitHub issue tab after loading/reloading the extension.
4. Click the GHOST toolbar icon to open its side panel. Keep the panel open throughout the demo.
5. Open the dedicated ACME Gmail thread → visit `https://github.com/NassAbd/ghost-demo-workspace/issues/1` → return to the same Gmail thread → click Gmail's **Reply** → click **Draft reply** in GHOST.
6. Review the generated draft and copy it into Gmail yourself. GHOST never inserts or sends email.

No manual agent prompt is needed. Opening the panel starts collection. Unrelated mailbox views and repository pages produce no observation. Only Gmail and issues in the demo repository are matched.

## Session lifetime

Source content and accepted context live in process memory. No extension storage, localStorage, database, or logs of page content are used. Keep the side panel open: closing/reloading it creates a fresh session. Restarting Next.js also resets sessions. Idle server sessions expire after one hour; Reset clears the active session. The service worker carries observations only; accepted context survives its suspension in the panel/server session.

The page identity contains site, object ID and canonical URL. URL query parameters and Gmail search terms are removed. The parser ignores hidden messages/comments, editable drafts, form values and unrelated sidebars. Recognizable credential-like strings in visible prose are redacted; the server rejects unredacted credential-like observations. It observes DOM mutations with a 600ms debounce and does not read cookies, tokens or auth headers. Only relevant expanded message/issue text is sent to the local server and OpenAI.

## Reliability and latency

Repeated identical page views and stale sequence numbers never invoke the model. New sources use the existing GHOST extractor and semantic verifier, followed by a local graph merge. Model source IDs and evidence excerpts are constrained by the structured schema. Each stage permits at most one grounding repair inside the same request deadline. Previously accepted context is supplied as structured context, not re-extracted. Intent is inferred in the same extraction call. Drafting uses only collected customer-safe facts and verifies each sentence. Calls have an 18-second total budget and SDK cancellation.

When AI fails, source evidence and the last accepted graph remain visible. Fallback drafting produces only a generic acknowledgement, with no incident claims or ACME fixture facts. A rejected change disables live drafting rather than using stale facts. A new session can retry after fixing connectivity/model availability.

Development diagnostics show accepted structured context, output origins, and timings in the panel. Server logs contain timings only. Intent timing is included in extraction (the separate local intent update time is zero).

## DOM limitations

Gmail selectors are intentionally scoped to the active thread, with visible `.a3s` message bodies and the thread heading. Collapsed messages are not read; expand the relevant message manually. If Gmail changes these markers, collection pauses rather than reading the mailbox. Inline reply detection requires a visible textbox inside that thread; pop-out compose windows are unsupported.

GitHub extraction uses current issue title, header state and rendered markdown-body markers, plus visible comment-body fallbacks. It does not fetch more comments. The GitHub issue's workflow state can be Open while the body reports a deployed fix; both are preserved as evidence.

Official Chrome references: [Side Panel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), [Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts).
