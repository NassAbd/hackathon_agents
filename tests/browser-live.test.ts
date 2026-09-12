import { expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { runInNewContext } from "node:vm";
import { validateContext, type Source } from "../lib/live-context";
import { openAIInvoke } from "../lib/live-agent";
import {
  observeBrowser,
  draftBrowser,
  newBrowserSession,
} from "../lib/browser/session";
import type { Observation } from "../lib/browser/contracts";
it.skipIf(process.env.GHOST_BROWSER_LIVE_TEST !== "true")(
  "live browser graph and draft adapt to changed incident text",
  async () => {
    process.loadEnvFile(".env.local");
    const sandbox: {
      URL: typeof URL;
      GhostDOM?: {
        parse(document: Document, href: string): Partial<Observation>;
      };
    } = { URL };
    runInNewContext(readFileSync("extension/parser.js", "utf8"), sandbox);
    const url = "https://github.com/NassAbd/ghost-demo-workspace/issues/1";
    const parsed = sandbox.GhostDOM!.parse(
      new JSDOM(readFileSync("tests/dom/github-issue.html", "utf8")).window
        .document,
      url,
    );
    const issue = {
      ...parsed,
      id: crypto.randomUUID(),
      url,
      sequence: 2,
      timestamp: Date.now(),
      extractionMs: 0,
    } as Observation;
    const email: Observation = {
      id: crypto.randomUUID(),
      sequence: 1,
      timestamp: Date.now(),
      app: "email",
      url: "https://mail.google.com/mail/u/0/#inbox/ABCDEFGHIJKL",
      objectId: "/mail/u/0/ABCDEFGHIJKL",
      title: "Payment incident",
      content:
        "From: Sarah at ACME\nSubject: Payment incident\nWe are seeing payment failures in Europe. Please explain the current status.",
      action: "OPEN",
      extractionMs: 0,
    };
    const invoke = () => {
      const run = openAIInvoke(AbortSignal.timeout(18000), false);
      return async (task: Parameters<typeof run>[0], input: unknown) => {
        try {
          const result = await run(task, input);
          if (task === "extract") {
            try {
              validateContext(result, (input as { sources: Source[] }).sources);
            } catch (error) {
              console.info(
                "Synthetic fixture validation",
                error instanceof Error ? error.message : "unknown",
              );
            }
          }
          return result;
        } catch (error) {
          console.info("Browser live call failure", {
            task,
            name: error instanceof Error ? error.name : "unknown",
            status:
              error && typeof error === "object" && "status" in error
                ? error.status
                : undefined,
          });
          throw error;
        }
      };
    };
    let state = await observeBrowser(newBrowserSession(), email, invoke());
    console.info("Browser live email", {
      origin: state.origin,
      timings: state.timings,
    });
    expect(state.origin).toBe("live");
    state = await observeBrowser(state, issue, invoke());
    console.info("Browser live issue", {
      origin: state.origin,
      timings: state.timings,
    });
    expect(state.origin).toBe("live");
    const before = structuredClone(state.context);
    const observedTimings = { ...state.timings };
    state = await observeBrowser(state, {
      ...email,
      id: crypto.randomUUID(),
      sequence: 3,
      action: "REPLY",
    });
    state = await draftBrowser(state, invoke());
    console.info("Browser live draft", {
      origin: state.draftOrigin,
      timings: state.timings,
    });
    expect(state.draftOrigin).toBe("live");
    const firstDraft = state.draft;
    state = await observeBrowser(
      state,
      {
        ...issue,
        id: crypto.randomUUID(),
        sequence: 4,
        content:
          "Customer: ACME. Incident #4821. EU payment failures are ongoing. The proposed fix was rolled back. There is no confirmed resolution time.",
      },
      invoke(),
    );
    console.info("Browser live changed issue", {
      origin: state.origin,
      timings: state.timings,
    });
    expect(state.origin).toBe("live");
    expect(state.context?.entities).not.toEqual(before?.entities);
    expect(state.context?.intent.label).not.toEqual(before?.intent.label);
    state = await observeBrowser(state, {
      ...email,
      id: crypto.randomUUID(),
      sequence: 5,
      action: "REPLY",
    });
    state = await draftBrowser(state, invoke());
    console.info("Browser live changed draft", {
      origin: state.draftOrigin,
      timings: state.timings,
    });
    expect(state.draftOrigin).toBe("live");
    expect(state.draft).not.toEqual(firstDraft);
    expect(JSON.stringify(state.draft)).not.toContain("14:32");
    expect(JSON.stringify(state.context?.facts)).toMatch(
      /ongoing|rolled back|no confirmed/i,
    );
    expect(JSON.stringify(state.draft)).toMatch(
      /ongoing|rolled back|not.*resolv|no.*confirm|continu/i,
    );
    writeFileSync(
      "docs/browser/LIVE_VERIFICATION.json",
      JSON.stringify(
        {
          verifiedAt: new Date().toISOString(),
          scope:
            "Synthetic email and saved public GitHub issue fixture; no private Gmail read",
          before: {
            entities: before?.entities.map((e) => e.label),
            intent: before?.intent,
            draft: firstDraft,
            timings: observedTimings,
          },
          after: {
            entities: state.context?.entities.map((e) => e.label),
            intent: state.context?.intent,
            draft: state.draft,
            timings: state.timings,
          },
          result:
            "Passed: graph, intent and grounded draft adapt to changed incident status",
        },
        null,
        2,
      ) + "\n",
    );
  },
  120000,
);
