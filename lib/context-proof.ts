import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { LiveContext } from "./live-schemas";
import type { Source } from "./live-context";
// Process-local proof of validation, not user authentication. Restart resets it.
const key = randomBytes(32);
export function signContext(context: LiveContext, sources: Source[]) {
  return createHmac("sha256", key)
    .update(JSON.stringify({ context, sources }))
    .digest("hex");
}
export function verifyContextProof(
  context: LiveContext,
  sources: Source[],
  proof?: string,
) {
  if (!proof || proof.length !== 64) return false;
  const expected = Buffer.from(signContext(context, sources));
  const actual = Buffer.from(proof);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
