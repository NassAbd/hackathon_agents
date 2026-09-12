"use client";
import { useEffect, useRef, useState } from "react";
import { ContextGraph } from "@/components/ContextGraph";
import { graphFromContext } from "@/lib/live-context";
import type { GhostState } from "@/lib/ghost-state";
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
  const session = useRef("");
  const sequence = useRef(0);
  const queue = useRef<Observation[]>([]);
  const processing = useRef(false);
  const parentOrigin = useRef("");
  const mounted = useRef(true);
  const sendRef = useRef<
    (
      mode: "observe" | "draft" | "reset",
      observation?: Observation,
    ) => Promise<void>
  >(async () => {});
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
      }
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
      while (queue.current.length && mounted.current)
        await sendRef.current("observe", queue.current.shift());
      processing.current = false;
    }
    function receive(event: MessageEvent) {
      if (
        event.source !== window.parent ||
        !/^chrome-extension:\/\/[a-p]{32}$/.test(event.origin) ||
        event.data?.type !== "observation"
      )
        return;
      if (parentOrigin.current && parentOrigin.current !== event.origin) return;
      parentOrigin.current = event.origin;
      const parsed = ObservationSchema.safeParse({
        ...event.data.observation,
        sequence: ++sequence.current,
      });
      if (!parsed.success) return;
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
  const graphState: GhostState = {
    ...graph,
    events: state.events,
    visited: [...new Set(state.sources.map((s) => s.app!).filter(Boolean))],
    currentApp:
      state.sources.find((s) => s.id === state.currentSource)?.app ?? "email",
    returned: state.leftEmail,
    boundary: state.boundary,
  };
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
      <ContextGraph
        state={graphState}
        onSource={(app) => {
          const source = state.sources.find((s) => s.app === app);
          if (source) window.open(source.url, "_blank", "noopener,noreferrer");
        }}
      />
      {state.boundary && (
        <section
          style={{
            padding: 16,
            background: "#eaf0df",
            borderRadius: 14,
            marginTop: 20,
          }}
        >
          <h2>Here’s what you learned since opening this email.</h2>
          {graph.facts
            .filter((f) => f.customerSafe)
            .map((f) => (
              <p key={f.id}>
                {f.text} <small>— {f.source}</small>
              </p>
            ))}
          <button
            disabled={busy}
            onClick={() => void sendRef.current("draft")}
            style={{
              padding: "12px 20px",
              borderRadius: 20,
              background: "#26372b",
              color: "white",
            }}
          >
            Draft reply
          </button>
        </section>
      )}
      {state.draft && (
        <section>
          <h2>
            Draft reply ·{" "}
            {state.draftOrigin === "live"
              ? "Live AI"
              : "Deterministic fallback"}
          </h2>
          <textarea
            aria-label="Grounded reply draft"
            readOnly
            rows={14}
            value={state.draft.sentences.map((s) => s.text).join("\n\n")}
            style={{ width: "100%", padding: 14, font: "inherit" }}
          />
          <p>Review and copy into Gmail. GHOST never sends email.</p>
          {state.draft.sentences
            .flatMap((s) => s.factIds)
            .filter((id, i, all) => all.indexOf(id) === i)
            .map((id) => (
              <p key={id}>
                <small>
                  {state.context?.facts.find((f) => f.id === id)?.text}
                </small>
              </p>
            ))}
        </section>
      )}
      {state.context && (
        <details style={{ marginTop: 18 }}>
          <summary>Grounded facts and provenance</summary>
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
          void sendRef.current("reset");
        }}
        style={{ marginTop: 24 }}
      >
        Reset browser session
      </button>
    </main>
  );
}
