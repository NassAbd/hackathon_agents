import { runIncremental, runGroundedDraft, type Invoke } from "../live-agent";
import { normalizeObservation, type Observation } from "./contracts";
import type { BrowserSession } from "./state";
export { newBrowserSession, type BrowserSession } from "./state";
export async function bounded<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export async function observeBrowser(
  state: BrowserSession,
  input: Observation,
  invoke?: Invoke,
) {
  const { observation, source } = normalizeObservation(input);
  if (observation.sequence <= state.sequence) return state;
  const next = structuredClone(state);
  next.sequence = observation.sequence;
  next.timings = { "DOM extraction": observation.extractionMs };
  const total = performance.now();
  const timing = (stage: string, ms: number) => {
    next.timings[stage] = Math.round(ms);
  };
  const old = state.sources.find((s) => s.id === source.id);
  const changed =
    !old || old.content !== source.content || old.title !== source.title;
  if (source.app === "email" && !next.emailSource) next.emailSource = source.id;
  if (source.app === "github" && next.emailSource) next.leftEmail = true;
  next.currentSource = source.id;
  next.boundary =
    source.id === next.emailSource &&
    next.leftEmail &&
    observation.action === "REPLY";
  next.events = [
    ...next.events,
    {
      id: observation.id,
      app: observation.app,
      action: observation.action,
      timestamp: observation.timestamp,
    },
  ].slice(-100);
  if (changed) {
    if (!old && next.sources.length >= 8) {
      next.reason = "Session source limit reached. Start a new session.";
      return next;
    }
    next.sources = [...next.sources.filter((s) => s.id !== source.id), source];
    next.draft = null;
    next.draftOrigin = null;
    if (invoke) {
      try {
        // Work against a snapshot. A timed-out promise cannot mutate accepted state later.
        const context = await bounded(
          runIncremental({
            source,
            sources: next.sources,
            previous: state.context,
            events: next.events,
            invoke,
            timing,
          }),
          18000,
        );
        next.context = context;
        next.verifiedSources = structuredClone(next.sources);
        next.origin = "live";
        next.reason = null;
      } catch (error) {
        if (
          process.env.NODE_ENV === "development" ||
          process.env.NODE_ENV === "test"
        )
          console.warn("GHOST browser rejected", {
            category:
              error instanceof Error ? error.constructor.name : "unknown",
          });
        next.origin = "fallback";
        next.reason =
          "AI unavailable or grounding rejected. Collected page evidence is preserved.";
      }
    } else {
      next.origin = "fallback";
      next.reason =
        "Live AI disabled or no server key. Collected page evidence is preserved.";
    }
  }
  timing("total request duration", performance.now() - total);
  return next;
}
export async function draftBrowser(state: BrowserSession, invoke?: Invoke) {
  if (!state.boundary)
    throw new Error("Return to the original Gmail thread and open Reply first");
  if (state.draftOrigin === "live" && state.draft) return state;
  const next = structuredClone(state);
  const total = performance.now();
  const timing = (stage: string, ms: number) => {
    next.timings[stage] = Math.round(ms);
  };
  // A changed source with rejected extraction invalidates live drafting until re-observed successfully.
  if (invoke && state.context && state.origin === "live") {
    try {
      next.draft = await bounded(
        runGroundedDraft(state.context, invoke, timing),
        18000,
      );
      next.draftOrigin = "live";
      timing("total request duration", performance.now() - total);
      return next;
    } catch {
      /* Safe, non-factual fallback below. */
    }
  }
  next.draft = {
    sentences: [
      {
        text: "Thank you for raising this concern. I’m sorry for the frustration.",
        factIds: [],
      },
    ],
  };
  next.draftOrigin = "fallback";
  next.reason =
    "Safe acknowledgement only. Review the preserved source evidence before adding details.";
  timing("total request duration", performance.now() - total);
  return next;
}
