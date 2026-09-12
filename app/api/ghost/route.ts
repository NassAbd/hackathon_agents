import { signContext, verifyContextProof } from "@/lib/context-proof";
import { GroundingError } from "@/lib/live-context";
import { replay, processRequest } from "@/lib/agent-service";
import { pages } from "@/lib/fixtures";
import { LiveRequestSchema } from "@/lib/live-schemas";
import { openAIInvoke, runLive } from "@/lib/live-agent";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = LiveRequestSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: "Invalid GHOST event request" },
      { status: 400 },
    );
  const { context, contextProof, ...input } = parsed.data;
  const state = replay(input.events);
  if (input.mode === "draft" && !state.boundary)
    return Response.json(
      { error: "Return to Email and click Reply first" },
      { status: 409 },
    );
  const disabled = process.env.GHOST_DEMO_MODE === "true";
  if (!disabled && process.env.OPENAI_API_KEY) {
    try {
      const sources = state.visited.map((id) => ({ id, ...pages[id] }));
      if (
        input.mode === "draft" &&
        (!context || !verifyContextProof(context, sources, contextProof))
      )
        throw new GroundingError("Missing or stale verified context");
      const response = await runLive({
        sources,
        verifiedContext: input.mode === "draft",
        events: state.events,
        previous: context,
        mode: input.mode,
        invoke: openAIInvoke(
          AbortSignal.any([request.signal, AbortSignal.timeout(45000)]),
        ),
      });
      return Response.json({
        ...response,
        contextProof: signContext(response.context, sources),
      });
    } catch (error) {
      console.warn("GHOST live output rejected or unavailable", {
        errorType: error instanceof Error ? error.name : "UnknownError",
        validation: error instanceof GroundingError ? error.message : undefined,
      });
      const fallback = await processRequest(input, {
        enabled: false,
        invoke: async () => null,
      });
      return Response.json({ ...fallback, reason: "unavailable" });
    }
  }
  return Response.json(
    await processRequest(input, {
      enabled: false,
      reason: disabled ? "disabled" : "no_key",
      invoke: async () => null,
    }),
  );
}
