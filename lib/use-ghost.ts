"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { pages, type AppId } from "./fixtures";
import { buildDraft } from "./draft";
import { initialState, reduceEvent } from "./ghost-state";
import {
  ApiResponseSchema,
  type ApiResponse,
  type LiveContext,
} from "./live-schemas";
import { graphFromContext } from "./live-context";
export function useGhost() {
  const [base, setBase] = useState(initialState);
  const [context, setContext] = useState<LiveContext | null>(null);
  const [draft, setDraft] = useState("");
  const [draftStatus, setDraftStatus] = useState<
    "idle" | "loading" | "live" | "fallback"
  >("idle");
  const [draftFactIds, setDraftFactIds] = useState<string[]>([]);
  const [agentStatus, setAgentStatus] = useState<
    "checking" | "live" | "fallback"
  >("checking");
  const [reason, setReason] = useState<ApiResponse["reason"]>(null);
  const [diagnostic, setDiagnostic] = useState<ApiResponse | null>(null);
  const [session, setSession] = useState(0);
  const draftController = useRef<AbortController | null>(null);
  const baseRef = useRef(base);
  baseRef.current = base;
  const contextProof = useRef<string | undefined>(undefined);
  const contextRef = useRef(context);
  contextRef.current = context;
  const observeKey = base.visited.join(",");
  useEffect(() => {
    const controller = new AbortController();
    const snapshot = baseRef.current;
    const previous = contextRef.current;
    setAgentStatus("checking");
    async function observe() {
      try {
        const result = await fetch("/api/ghost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "observe",
            events: snapshot.events,
            ...(previous
              ? { context: previous, contextProof: contextProof.current }
              : {}),
          }),
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(50000),
          ]),
        });
        if (!result.ok) throw new Error("Agent unavailable");
        const response = ApiResponseSchema.parse(await result.json());
        if (controller.signal.aborted) return;
        setDiagnostic(response);
        setAgentStatus(response.mode);
        setReason(response.reason);
        contextProof.current =
          response.mode === "live" ? response.contextProof : undefined;
        setContext(response.mode === "live" ? response.context : null);
      } catch {
        if (controller.signal.aborted) return;
        setContext(null);
        setAgentStatus("fallback");
        setReason("unavailable");
        setDiagnostic(null);
      }
    }
    void observe();
    return () => controller.abort();
  }, [observeKey, session]);
  const visit = useCallback((app: AppId) => {
    draftController.current?.abort();
    setDraftStatus((s) => (s === "loading" ? "idle" : s));
    setBase((previous) =>
      reduceEvent(previous, {
        id: crypto.randomUUID(),
        app,
        action: "OPEN",
        timestamp: Date.now(),
      }),
    );
  }, []);
  const reset = useCallback(() => {
    draftController.current?.abort();
    setDraft("");
    setDraftFactIds([]);
    setDraftStatus("idle");
    setContext(null);
    contextProof.current = undefined;
    setDiagnostic(null);
    setBase(initialState());
    setSession((s) => s + 1);
  }, []);
  const reply = useCallback(
    () =>
      setBase((previous) =>
        reduceEvent(previous, {
          id: crypto.randomUUID(),
          app: "email",
          action: "REPLY",
          timestamp: Date.now(),
        }),
      ),
    [],
  );
  const generateDraft = useCallback(async () => {
    const snapshot = baseRef.current;
    const previous = contextRef.current;
    if (
      !snapshot.boundary ||
      agentStatus === "checking" ||
      draftStatus === "loading"
    )
      return;
    const controller = new AbortController();
    draftController.current = controller;
    setDraftStatus("loading");
    setBase((current) =>
      reduceEvent(current, {
        id: crypto.randomUUID(),
        app: "email",
        action: "DRAFT",
        timestamp: Date.now(),
      }),
    );
    try {
      const result = await fetch("/api/ghost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "draft",
          events: snapshot.events,
          ...(previous
            ? { context: previous, contextProof: contextProof.current }
            : {}),
        }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(50000),
        ]),
      });
      if (!result.ok) throw new Error("Draft unavailable");
      const response = ApiResponseSchema.parse(await result.json());
      if (controller.signal.aborted) return;
      setDiagnostic(response);
      if (response.mode === "live") {
        if (!response.draft) throw new Error("Missing live draft");
        setDraft(response.draft.sentences.map((s) => s.text).join("\n\n"));
        setDraftFactIds([
          ...new Set(response.draft.sentences.flatMap((s) => s.factIds)),
        ]);
      } else {
        const built = buildDraft(
          snapshot.facts,
          response.output.draftSentenceIds,
        );
        setDraft(built.text);
        setDraftFactIds(built.factIds);
      }
      setDraftStatus(response.mode);
    } catch {
      if (controller.signal.aborted) return;
      const built = buildDraft(snapshot.facts);
      setDraft(built.text);
      setDraftFactIds(built.factIds);
      setDraftStatus("fallback");
    }
  }, [draftStatus, agentStatus]);
  useEffect(() => () => draftController.current?.abort(), []);
  const state = context
    ? {
        ...base,
        ...graphFromContext(
          context,
          base.visited.map((id) => ({ id, ...pages[id] })),
        ),
      }
    : base;
  const contextOrigin = context ? ("live" as const) : ("fallback" as const);
  return {
    state,
    visit,
    reset,
    agentStatus,
    contextOrigin,
    reason,
    reply,
    generateDraft,
    draft,
    setDraft,
    draftStatus,
    draftFactIds,
    diagnostic,
  };
}
