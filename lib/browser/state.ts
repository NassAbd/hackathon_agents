import { z } from "zod";
import { LiveContextSchema, LiveDraftSchema } from "../live-schemas";
import { EventSchema } from "../schemas";
import type { LiveContext, LiveDraft } from "../live-schemas";
import type { Source } from "../live-context";
import type { GhostEvent } from "../schemas";
export type BrowserSession = {
  sources: Source[];
  verifiedSources: Source[];
  context?: LiveContext;
  events: GhostEvent[];
  sequence: number;
  currentSource?: string;
  emailSource?: string;
  leftEmail: boolean;
  boundary: boolean;
  origin: "live" | "fallback";
  draftOrigin: "live" | "fallback" | null;
  draft: LiveDraft | null;
  reason: string | null;
  timings: Record<string, number>;
};
export function newBrowserSession(): BrowserSession {
  return {
    sources: [],
    verifiedSources: [],
    events: [],
    sequence: -1,
    leftEmail: false,
    boundary: false,
    origin: "fallback",
    draftOrigin: null,
    draft: null,
    reason: null,
    timings: {},
  };
}

const BrowserSourceSchema = z
  .object({
    id: z.string().min(1).max(500),
    app: z.enum(["email", "github"]),
    object: z
      .object({
        kind: z.enum(["gmail-thread", "github-issue"]),
        id: z.string().min(1).max(300),
      })
      .strict(),
    title: z.string().max(250),
    url: z.string().url().max(1000),
    content: z.string().max(16000),
  })
  .strict();
export const BrowserSessionSchema = z
  .object({
    sources: z.array(BrowserSourceSchema).max(8),
    verifiedSources: z.array(BrowserSourceSchema).max(8),
    context: LiveContextSchema.optional(),
    events: z.array(EventSchema).max(100),
    sequence: z.number().int().min(-1),
    currentSource: z.string().optional(),
    emailSource: z.string().optional(),
    leftEmail: z.boolean(),
    boundary: z.boolean(),
    origin: z.enum(["live", "fallback"]),
    draftOrigin: z.enum(["live", "fallback"]).nullable(),
    draft: LiveDraftSchema.nullable(),
    reason: z.string().nullable(),
    timings: z.record(z.string(), z.number()),
  })
  .strict();
