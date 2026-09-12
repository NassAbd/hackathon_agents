"use client";
import {
  Activity,
  ArrowUpRight,
  Check,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { appNames, type AppId } from "@/lib/fixtures";
import { type ApiResponse } from "@/lib/live-schemas";
import { type GhostState } from "@/lib/ghost-state";
import { ContextGraph } from "./ContextGraph";
export function GhostMark() {
  return (
    <svg
      className="ghost-mark"
      width="27"
      height="29"
      viewBox="0 0 28 30"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 25V13a10 10 0 0 1 20 0v12l-4-3-3 3-3-3-3 3-3-3-4 3Z"
        fill="currentColor"
      />
      <circle cx="10" cy="13" r="2" fill="#10231d" />
      <circle cx="18" cy="13" r="2" fill="#10231d" />
    </svg>
  );
}
export function GhostSidebar({
  state,
  onSource,
  agentStatus,
  reason,
  onDraft,
  draftStatus,
  draftFactIds,
  contextOrigin,
  diagnostic,
}: {
  state: GhostState;
  onSource: (app: AppId) => void;
  onDraft: () => void;
  draftStatus: "idle" | "loading" | "live" | "fallback";
  draftFactIds: string[];
  agentStatus: "checking" | "live" | "fallback";
  reason: ApiResponse["reason"];
  contextOrigin: "live" | "fallback";
  diagnostic: ApiResponse | null;
}) {
  return (
    <aside className="ghost-panel">
      <div className="ghost-heading">
        <div>
          <GhostMark />
          <strong>GHOST</strong>
          <span className="pill">Visual</span>
        </div>
        <span className="watching">
          <span className="live-dot" /> Observing
        </span>
      </div>
      <div className="ghost-intro">
        <span className="eyebrow">THE CONTEXT BETWEEN YOUR APPS</span>
        <p>
          {state.returned && state.currentApp === "email" ? (
            <>
              Back where you started.
              <br />
              <strong>Your context came with you.</strong>
            </>
          ) : state.visited.length === 1 ? (
            <>
              Go about your work.
              <br />
              <strong>I’ll keep the context.</strong>
            </>
          ) : (
            <>
              Different apps.
              <br />
              <strong>One connected story.</strong>
            </>
          )}
        </p>
      </div>
      <p className="mode-indicator">
        {contextOrigin === "live"
          ? "Live AI mode"
          : "Deterministic fallback mode"}
        {agentStatus === "checking" ? " · updating context…" : ""}
      </p>
      <ContextGraph state={state} onSource={onSource} />
      {state.boundary && (
        <section className="restoration" aria-live="polite">
          <span className="eyebrow">
            <Sparkles size={12} /> INVESTIGATION → ACTION
          </span>
          <h2>Here’s what you learned since opening this email.</h2>
          <div className="restored-facts">
            {state.facts
              .filter((f) => f.app !== "email")
              .map((f) => (
                <button key={f.id} onClick={() => onSource(f.app)}>
                  <Check size={12} />
                  <span>
                    {f.text}
                    <small>
                      {f.source} <ArrowUpRight size={9} />
                    </small>
                  </span>
                </button>
              ))}
          </div>
          <button
            className="primary"
            onClick={onDraft}
            disabled={
              agentStatus === "checking" ||
              draftStatus === "loading" ||
              draftStatus === "live" ||
              draftStatus === "fallback"
            }
          >
            {draftStatus === "loading" ? (
              <LoaderCircle size={14} className="spin" />
            ) : draftStatus === "live" || draftStatus === "fallback" ? (
              <Check size={14} />
            ) : (
              <Sparkles size={14} />
            )}{" "}
            {draftStatus === "loading"
              ? "Drafting from your context…"
              : draftStatus === "live" || draftStatus === "fallback"
                ? "Draft placed in Email"
                : "Draft reply"}
          </button>
          {draftFactIds.length > 0 && (
            <p className="draft-provenance">
              {draftFactIds.length} grounded facts ·{" "}
              {draftStatus === "live"
                ? "Live AI generated reply"
                : "deterministic fallback"}
              <br />
              Internal account metrics stay out of customer prose.
            </p>
          )}
        </section>
      )}
      <div className="intent-card" aria-live="polite">
        <span className="eyebrow">
          <Sparkles size={12} />{" "}
          {state.intent.confidence > 0.9
            ? "INTENT CONNECTED"
            : "EMERGING INTENT"}
        </span>
        <h2>{state.intent.label}</h2>
        <div className="confidence">
          <span>
            Confidence{" "}
            <span title="A demo confidence score, not a calibrated probability">
              ⓘ
            </span>
          </span>
          <strong>{Math.round(state.intent.confidence * 100)}%</strong>
        </div>
        <div className="progress">
          <i style={{ width: `${state.intent.confidence * 100}%` }} />
        </div>
        <p>
          {
            state.facts.find((f) => f.id === state.intent.evidenceIds.at(-1))
              ?.text
          }
        </p>
      </div>
      <details className="sources">
        <summary>
          <ShieldCheck size={13} /> Grounded context{" "}
          <span>{state.facts.length} facts</span>
        </summary>
        <div>
          {state.facts.map((f) => (
            <button key={f.id} onClick={() => onSource(f.app)}>
              <span>{f.text}</span>
              <small>
                {f.source}
                <ArrowUpRight size={10} />
              </small>
            </button>
          ))}
        </div>
      </details>
      <details className="history">
        <summary>
          <Activity size={13} /> Event history{" "}
          <span>{state.events.length} events</span>
        </summary>
        <ol>
          {state.events
            .slice()
            .reverse()
            .map((e, i) => (
              <li key={e.id}>
                <span className="timeline-dot" />
                <div>
                  <strong>
                    {e.action === "OPEN"
                      ? `Opened ${appNames[e.app]}`
                      : e.action === "REPLY"
                        ? "Reply · action boundary"
                        : "Draft requested"}
                  </strong>
                  <small>
                    {e.id === "initial-email"
                      ? "Session started"
                      : new Date(e.timestamp).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                  </small>
                </div>
                {i === 0 && <span className="pill">Latest</span>}
              </li>
            ))}
        </ol>
      </details>
      {process.env.NODE_ENV === "development" && (
        <details className="sources diagnostic-panel">
          <summary>Developer diagnostics</summary>
          <p>
            Graph: {contextOrigin} · Intent: {contextOrigin} · Draft:{" "}
            {draftStatus}
          </p>
          <pre>
            {JSON.stringify(
              diagnostic,
              (key, value: unknown) =>
                key === "contextProof" ? undefined : value,
              2,
            )}
          </pre>
        </details>
      )}
      <div className="panel-bottom">
        <ShieldCheck size={14} />{" "}
        {agentStatus === "checking"
          ? "Connecting context…"
          : agentStatus === "live"
            ? "OpenAI agent · live structured inference"
            : reason === "unavailable"
              ? "AI unavailable · deterministic fallback"
              : reason === "disabled"
                ? "Demo mode · deterministic context"
                : "Demo mode · no OpenAI key configured"}
      </div>
    </aside>
  );
}
