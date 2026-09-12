import { z } from "zod";
import { apps } from "./fixtures";
export const AppSchema = z.enum(apps);
export const EventSchema = z
  .object({
    id: z.string().min(1),
    app: AppSchema,
    action: z.enum(["OPEN", "REPLY", "DRAFT"]),
    timestamp: z.number().nonnegative(),
  })
  .strict();
export type GhostEvent = z.infer<typeof EventSchema>;
export const IntentSchema = z
  .object({
    label: z.string().min(1).max(120),
    confidence: z.number().min(0).max(1),
    evidenceIds: z.array(z.string()).max(9),
  })
  .strict();
export type Intent = z.infer<typeof IntentSchema>;
// The model selects grounded records; source text and graph identifiers remain server-owned.
export const AgentOutputSchema = z
  .object({
    extractedFacts: z
      .array(z.object({ factId: z.string(), quote: z.string() }).strict())
      .max(9),
    intent: IntentSchema,
    draftSentenceIds: z.array(z.string()).max(12),
  })
  .strict();
export type AgentOutput = z.infer<typeof AgentOutputSchema>;
// Constrain model-generated references to facts actually collected in this request.
export function agentOutputSchemaForFacts(factIds: string[]) {
  if (!factIds.length) throw new Error("No collected facts");
  const factId = z.enum(factIds);
  return AgentOutputSchema.extend({
    extractedFacts: z
      .array(z.object({ factId, quote: z.string() }).strict())
      .length(factIds.length),
    intent: IntentSchema.extend({
      evidenceIds: z.array(factId).min(1).max(factIds.length),
    }),
  });
}
export const RequestSchema = z
  .object({
    mode: z.enum(["observe", "draft"]),
    events: z.array(EventSchema).min(1).max(100),
    factIds: z.array(z.string()).max(9).optional(),
  })
  .strict();
export const ResponseSchema = z
  .object({
    output: AgentOutputSchema,
    mode: z.enum(["live", "fallback"]),
    reason: z.enum(["no_key", "disabled", "unavailable"]).nullable(),
  })
  .strict();
export type AgentResponse = z.infer<typeof ResponseSchema>;
