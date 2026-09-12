"use client";
import { useEffect, useRef, useState } from "react";
import { ContextStory } from "@/components/ContextStory";
import { graphFromContext } from "@/lib/live-context";
import { ObservationSchema, type Observation } from "@/lib/browser/contracts";
import {
  BrowserSessionSchema,
  newBrowserSession,
  type BrowserSession,
} from "@/lib/browser/state";
// The session token is an in-memory handle, never a browser credential.
export default function BrowserPage() {
  const [state, setState] = useState<BrowserSession>(newBrowserSession);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [insertState, setInsertState] = useState<
    "idle" | "inserting" | "blocked" | "inserted" | "error"
  >("idle");
  const [insertMessage, setInsertMessage] = useState("");
  const session = useRef("");
  const sequence = useRef(0);
  const queue = useRef<Observation[]>([]);
  const processing = useRef(false);
  const parentOrigin = useRef("");
  const mounted = useRef(true);
  const draftInsertionRef = useRef("");
  const insertionRequest = useRef("");
  const currentView = useRef<Observation | null>(null);
  const sendRef = useRef<
    (
      mode: "observe" | "draft" | "reset",
      observation?: Observation,
    ) => Promise<BrowserSession | undefined>
  >(async () => undefined);
  sendRef.current = async (mode, observation) => {
    setBusy(true);
    try {
      const response = await fetch("/api/ghost/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session: session.current,
          mode,
          ...(observation ? { observation } : {}),
        }),
        signal: AbortSignal.timeout(23000),
      });
      if (!response.ok) throw new Error("Request rejected");
      const result = BrowserSessionSchema.parse(await response.json());
      if (mounted.current) {
        setState(result);
        setError("");
        if (mode === "draft" || mode === "reset") {
          setInsertState("idle");
          setInsertMessage("");
        }
        if (!result.draft) {
          setInsertState("idle");
          setInsertMessage("");
        }
      }
      return result;
    } catch {
      if (mounted.current)
        setError(
          "GHOST could not reach the agent. Your previous context is preserved. Check the local server.",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  useEffect(() => {
    mounted.current = true;
    session.current ||= crypto.randomUUID();
    async function drain() {
      if (processing.current) return;
      processing.current = true;
      while (queue.current.length && mounted.current) {
        const result = await sendRef.current("observe", queue.current.shift());
        // Finish queued navigation before acting; the backend still owns all verification.
        if (!queue.current.length && result?.boundary && !result.draft)
          await sendRef.current("draft");
      }
      processing.current = false;
    }
    function receive(event: MessageEvent) {
      if (
        event.source !== window.parent ||
        !/^chrome-extension:\/\/[a-p]{32}$/.test(event.origin)
      )
        return;
      if (event.data?.type === "ghost-draft-result") {
        if (event.data.requestId !== insertionRequest.current) return;
        if (event.data.ok) {
          setInsertState("inserted");
          setInsertMessage("");
        } else if (event.data.reason === "composer-has-content") {
          setInsertState("blocked");
          setInsertMessage(
            "Insertion blocked: Gmail already contains text. Your draft was left unchanged.",
          );
        } else {
          setInsertState("error");
          setInsertMessage(event.data.reason || "Insert blocked");
        }
        return;
      }
      if (event.data?.type !== "observation") return;
      if (parentOrigin.current && parentOrigin.current !== event.origin) return;
      parentOrigin.current = event.origin;
      const parsed = ObservationSchema.safeParse({
        ...event.data.observation,
        sequence: ++sequence.current,
      });
      if (!parsed.success) return;
      currentView.current = parsed.data;
      const last = queue.current.at(-1);
      if (
        last?.objectId === parsed.data.objectId &&
        last.app === parsed.data.app
      )
        queue.current.pop();
      queue.current.push(parsed.data);
      void drain();
    }
    window.addEventListener("message", receive);
    // Ready contains no source information. Subsequent messages require the exact parent origin.
    window.parent.postMessage({ type: "ghost-ready" }, "*");
    return () => {
      mounted.current = false;
      window.removeEventListener("message", receive);
    };
  }, []);
  const graph = state.context
    ? graphFromContext(state.context, state.verifiedSources)
    : {
        nodes: [],
        edges: [],
        facts: [],
        intent: {
          label: "Collecting visible source context",
          confidence: 0,
          evidenceIds: [],
        },
      };
  const draftText =
    state.draft?.sentences.map((s) => s.text).join("\n\n") ?? "";
  const citedIds = new Set(
    state.draft?.sentences.flatMap((s) => s.factIds) ?? [],
  );
  const citedFacts =
    state.context?.facts.filter((f) => citedIds.has(f.id)) ?? [];
  const groundedFactCount = citedIds.size;
  const sourceCount = new Set(
    citedFacts.flatMap((f) => f.evidence.map((e) => e.sourceId)),
  ).size;
  useEffect(() => {
    if (!state.draft) {
      draftInsertionRef.current = "";
      return;
    }
    // A fallback acknowledgement or a failed verification must never alter Gmail.
    if (
      !state.boundary ||
      state.origin !== "live" ||
      state.draftOrigin !== "live" ||
      !draftText ||
      busy
    )
      return;
    const source = state.sources.find((s) => s.id === state.emailSource);
    const view = currentView.current;
    if (
      !source?.object ||
      view?.app !== "email" ||
      view.action !== "REPLY" ||
      view.objectId !== source.object.id ||
      queue.current.length
    )
      return;
    const key = `${source.id}:${draftText}`;
    if (draftInsertionRef.current === key || !parentOrigin.current) return;
    draftInsertionRef.current = key;
    insertionRequest.current = crypto.randomUUID();
    setInsertState("inserting");
    window.parent.postMessage(
      {
        type: "ghost-insert-draft",
        text: draftText,
        objectId: source.object.id,
        requestId: insertionRequest.current,
      },
      parentOrigin.current,
    );
  }, [state, draftText, busy]);
  useEffect(() => {
    if (insertState !== "inserting") return;
    const timer = setTimeout(() => {
      setInsertState("error");
      setInsertMessage(
        "Gmail did not confirm insertion. Check the composer before retrying.",
      );
    }, 8000);
    return () => clearTimeout(timer);
  }, [insertState]);
  return (
    <main
      style={{
        maxWidth: 650,
        margin: "0 auto",
        padding: 20,
        background: "#f9faf6",
        minHeight: "100vh",
        color: "#243127",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ letterSpacing: 5 }}>GHOST</h1>
        <span>
          {busy
            ? "Gathering context…"
            : state.origin === "live"
              ? "● Live AI mode"
              : "◌ Deterministic fallback mode"}
        </span>
      </div>
      <p style={{ opacity: 0.65 }}>The prompt is what you do.</p>
      {!state.sources.length && (
        <p>
          Open the ACME Gmail thread, then the demo GitHub issue. Keep this
          panel open as you move between them.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {state.reason && <p role="status">{state.reason}</p>}
      <section
        style={{
          margin: "24px 0",
          padding: 16,
          borderRadius: 14,
          background: "#eaf0df",
        }}
      >
        <small>
          INFERRED INTENT ·{" "}
          {state.context
            ? state.origin === "live"
              ? "LIVE AI"
              : "LIVE AI · LAST ACCEPTED"
            : "FALLBACK"}
        </small>
        <h2 style={{ fontSize: 20 }}>{graph.intent.label}</h2>
        <strong>{Math.round(graph.intent.confidence * 100)}% confidence</strong>
      </section>
      <ContextStory context={state.context} sources={state.verifiedSources} />
      {state.boundary && (
        <section className="browser-draft-status" aria-live="polite">
          {insertState === "inserted" ? (
            <>
              <strong>✓ Draft placed in Gmail</strong>
              <p>
                {groundedFactCount} grounded claims · {sourceCount} sources
              </p>
              <small>No internal data disclosed</small>
            </>
          ) : insertState === "blocked" || insertState === "error" ? (
            <p role="alert">{insertMessage}</p>
          ) : busy ? (
            <>
              <strong>Preparing your grounded reply…</strong>
              <p>
                Checking claims and source evidence before placing it in Gmail.
              </p>
            </>
          ) : insertState === "inserting" ? (
            <strong>Verified · placing draft in Gmail…</strong>
          ) : state.draftOrigin === "fallback" ? (
            <p>Draft could not be verified. Gmail was left unchanged.</p>
          ) : error ? (
            <p>Draft generation stopped. Gmail was left unchanged.</p>
          ) : (
            <p>Context restored. Preparing your reply…</p>
          )}
        </section>
      )}
      {state.context && (
        <details style={{ marginTop: 18 }}>
          <summary>Grounded facts and provenance</summary>
          {state.draft && (
            <details>
              <summary>Verified draft and claim references</summary>
              {state.draft.sentences.map((sentence, i) => (
                <p key={i}>
                  {sentence.text}
                  <small>
                    {" "}
                    · {sentence.factIds.join(", ") || "Non-factual courtesy"}
                  </small>
                </p>
              ))}
            </details>
          )}
          {state.context.facts.map((fact) => (
            <article key={fact.id} style={{ padding: "10px 0" }}>
              <strong>{fact.text}</strong>
              {!fact.customerSafe && (
                <small> · Internal, excluded from replies</small>
              )}
              {fact.evidence.map((evidence, index) => {
                const source = state.verifiedSources.find(
                  (source) => source.id === evidence.sourceId,
                );
                return (
                  <blockquote
                    key={index}
                    style={{
                      margin: "8px 0",
                      paddingLeft: 12,
                      borderLeft: "2px solid #cad6ba",
                    }}
                  >
                    <small>{evidence.quote}</small>
                    <br />
                    <a href={source?.url} target="_blank" rel="noreferrer">
                      {source?.title} · {source?.object?.kind}
                    </a>
                  </blockquote>
                );
              })}
            </article>
          ))}
        </details>
      )}
      <h3>Collected sources · {state.sources.length}</h3>
      {state.sources.map((source) => (
        <details
          key={source.id}
          style={{ padding: "10px 0", borderBottom: "1px solid #dbe2d1" }}
        >
          <summary>{source.title}</summary>
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.object?.kind} · view source
          </a>
          <p style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
            {source.content}
          </p>
        </details>
      ))}
      <details style={{ marginTop: 18 }}>
        <summary>Navigation history</summary>
        {state.events.map((event) => (
          <p key={event.id}>
            {event.app} → {event.action}
          </p>
        ))}
      </details>
      {process.env.NODE_ENV === "development" && (
        <details style={{ marginTop: 18 }}>
          <summary>Diagnostics · structured output & timings</summary>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 11 }}>
            {JSON.stringify(
              {
                graph: state.context ? "live" : "fallback",
                intent: state.context ? "live" : "fallback",
                draft: state.draftOrigin,
                timings: state.timings,
                context: state.context,
                generatedDraft: state.draft,
              },
              null,
              2,
            )}
          </pre>
        </details>
      )}
      <button
        disabled={busy}
        onClick={() => {
          queue.current = [];
          draftInsertionRef.current = "";
          insertionRequest.current = "";
          void sendRef.current("reset");
        }}
        style={{ marginTop: 24 }}
      >
        Reset browser session
      </button>
    </main>
  );
}
