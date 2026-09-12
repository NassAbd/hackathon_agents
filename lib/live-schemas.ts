import { z } from "zod";
import { apps } from "./fixtures";
import { RequestSchema, AgentOutputSchema } from "./schemas";
const id = z.string().min(1).max(80);
const refs = z.array(id).min(1).max(24);
export const EvidenceSchema = z
  .object({
    sourceId: z.enum(apps),
    quote: z.string().min(3).max(1600),
  })
  .strict();
export const LiveContextSchema = z
  .object({
    entities: z
      .array(
        z
          .object({
            id,
            label: z
              .string()
              .min(1)
              .max(60)
              .describe(
                "Short visual node label, including evidence-backed status/cause/timing concepts as well as named entities",
              ),
            type: z.string().min(1).max(40),
            evidence: z.array(EvidenceSchema).min(1).max(4),
          })
          .strict(),
      )
      .min(1)
      .max(16),
    facts: z
      .array(
        z
          .object({
            id,
            text: z.string().min(1).max(350),
            entityIds: refs,
            customerSafe: z.boolean(),
            evidence: z.array(EvidenceSchema).min(1).max(4),
          })
          .strict(),
      )
      .min(1)
      .max(24),
    relationships: z
      .array(
        z
          .object({
            id,
            source: id.describe("An ID from entities, never a fact ID"),
            target: id.describe("An ID from entities, never a fact ID"),
            label: z.string().min(1).max(50),
            factIds: refs.describe("Supporting IDs from the facts array"),
          })
          .strict(),
      )
      .max(24),
    intent: z
      .object({
        label: z.string().min(1).max(120),
        confidence: z.number().min(0).max(1),
        evidenceIds: refs,
      })
      .strict(),
  })
  .strict();
export type LiveContext = z.infer<typeof LiveContextSchema>;
export const LiveDraftSchema = z
  .object({
    sentences: z
      .array(
        z
          .object({
            text: z.string().min(1).max(500),
            factIds: z.array(id).max(24),
          })
          .strict(),
      )
      .min(1)
      .max(14),
  })
  .strict();
export type LiveDraft = z.infer<typeof LiveDraftSchema>;
export const VerificationSchema = z
  .object({
    checks: z.array(z.object({ id, supported: z.boolean() }).strict()).max(100),
  })
  .strict();
export const LiveRequestSchema = RequestSchema.extend({
  context: LiveContextSchema.optional(),
  contextProof: z.string().length(64).optional(),
});
export const ApiResponseSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("live"),
      reason: z.null(),
      context: LiveContextSchema,
      contextProof: z.string().length(64),
      draft: LiveDraftSchema.nullable(),
    })
    .strict(),
  z
    .object({
      mode: z.literal("fallback"),
      reason: z.enum(["no_key", "disabled", "unavailable"]),
      output: AgentOutputSchema,
    })
    .strict(),
]);
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
