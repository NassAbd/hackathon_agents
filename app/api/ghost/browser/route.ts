import { BrowserRequestSchema } from "@/lib/browser/contracts";
import {
  newBrowserSession,
  observeBrowser,
  draftBrowser,
  type BrowserSession,
} from "@/lib/browser/session";
import { openAIInvoke } from "@/lib/live-agent";
export const runtime = "nodejs";
export const maxDuration = 25;
// Process memory only. A server restart resets the browser session. No source text is logged.
const sessions = new Map<
  string,
  { state: BrowserSession; touched: number; tail: Promise<void> }
>();
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  const host = request.headers.get("host");
  // Next may normalize 127.0.0.1 to localhost in request.url. Match the
  // actual browser-facing Host, without trusting forwarded headers or
  // allowing different ports, protocols, or arbitrary host aliases.
  const loopbackHosts = ["localhost", "127.0.0.1", "[::1]"];
  let expectedOrigin = requestUrl.origin;
  if (host && host !== requestUrl.host) {
    const allowedHosts = loopbackHosts.map(
      (name) => `${name}${requestUrl.port ? `:${requestUrl.port}` : ""}`,
    );
    if (
      !loopbackHosts.includes(requestUrl.hostname) ||
      !allowedHosts.includes(host)
    )
      return Response.json({ error: "Invalid origin" }, { status: 403 });
    expectedOrigin = `${requestUrl.protocol}//${host}`;
  }
  if (origin && origin !== expectedOrigin)
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 24000)
    return Response.json({ error: "Observation too large" }, { status: 413 });
  const text = await request.text();
  if (text.length > 24000)
    return Response.json({ error: "Observation too large" }, { status: 413 });
  let input;
  try {
    input = BrowserRequestSchema.parse(JSON.parse(text));
  } catch {
    return Response.json(
      { error: "Invalid browser observation" },
      { status: 400 },
    );
  }
  for (const [key, value] of sessions)
    if (Date.now() - value.touched > 60 * 60 * 1000) sessions.delete(key);
  let entry = sessions.get(input.session);
  if (!entry) {
    if (sessions.size >= 20)
      return Response.json({ error: "Session limit" }, { status: 429 });
    entry = {
      state: newBrowserSession(),
      touched: Date.now(),
      tail: Promise.resolve(),
    };
    sessions.set(input.session, entry);
  }
  const current = entry;
  let release!: () => void;
  const previous = current.tail;
  current.tail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    current.touched = Date.now();
    const invoke =
      process.env.OPENAI_API_KEY && process.env.GHOST_DEMO_MODE !== "true"
        ? openAIInvoke(
            AbortSignal.any([request.signal, AbortSignal.timeout(18000)]),
            false,
          )
        : undefined;
    if (input.mode === "reset") current.state = newBrowserSession();
    else if (input.mode === "observe") {
      if (!input.observation)
        return Response.json({ error: "Missing observation" }, { status: 400 });
      current.state = await observeBrowser(
        current.state,
        input.observation,
        invoke,
      );
    } else if (input.mode === "draft")
      current.state = await draftBrowser(current.state, invoke);
    if (process.env.NODE_ENV === "development")
      console.info("GHOST browser timings", current.state.timings);
    return Response.json({
      ...current.state,
      timings:
        process.env.NODE_ENV === "development" ? current.state.timings : {},
    });
  } catch {
    return Response.json(
      { error: "Browser request rejected; context preserved" },
      { status: 409 },
    );
  } finally {
    release();
  }
}
