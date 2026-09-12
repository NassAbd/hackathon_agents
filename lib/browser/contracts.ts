import { z } from "zod";
import type { Source } from "../live-context";
export const ObservationSchema = z
  .object({
    id: z.string().uuid(),
    sequence: z.number().int().nonnegative(),
    timestamp: z.number().nonnegative(),
    app: z.enum(["email", "github"]),
    url: z.string().url().max(1000),
    objectId: z.string().min(1).max(300),
    title: z.string().min(1).max(250),
    content: z.string().min(3).max(16000),
    action: z.enum(["OPEN", "REPLY"]),
    extractionMs: z.number().nonnegative().max(60000),
  })
  .strict();
export type Observation = z.infer<typeof ObservationSchema>;
export const BrowserRequestSchema = z
  .object({
    session: z.string().uuid(),
    mode: z.enum(["observe", "draft", "read", "reset"]),
    observation: ObservationSchema.optional(),
  })
  .strict();
export function normalizeObservation(input: unknown): {
  observation: Observation;
  source: Source;
} {
  const observation = ObservationSchema.parse(input);
  if (
    /(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|(?:password|authorization|cookie|access_token|refresh_token|api[_ -]?key)\s*[:=]\s*\S+)/i.test(
      observation.content,
    )
  )
    throw new Error("Credential-like content excluded");
  const url = new URL(observation.url);
  let objectId: string;
  if (observation.app === "email") {
    if (
      url.origin !== "https://mail.google.com" ||
      !/^\/mail\/u\/\d+\/$/.test(url.pathname)
    )
      throw new Error("Unsupported Gmail page");
    const thread = url.hash.match(
      /^#(?:inbox|all|sent|starred|important|label\/[^/]+|search\/[^/]+)\/([A-Za-z0-9_-]{10,})$/,
    );
    if (!thread) throw new Error("An open Gmail thread is required");
    objectId = `${url.pathname}${thread[1]}`;
    // Search terms and unrelated query parameters must not enter provenance.
    url.hash = `#all/${thread[1]}`;
  } else {
    if (
      url.origin !== "https://github.com" ||
      !/^\/NassAbd\/ghost-demo-workspace\/issues\/\d+\/?$/.test(url.pathname)
    )
      throw new Error("Unsupported GitHub issue");
    objectId = url.pathname.replace(/\/$/, "");
    url.hash = "";
  }
  url.search = "";
  if (observation.objectId !== objectId)
    throw new Error("Source object mismatch");
  return {
    observation,
    source: {
      id: `${observation.app}:${objectId}`,
      app: observation.app,
      object: {
        kind: observation.app === "email" ? "gmail-thread" : "github-issue",
        id: objectId,
      },
      url: url.href,
      title: observation.title,
      content: observation.content
        .split(/\n+/)
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join("\n"),
    },
  };
}
