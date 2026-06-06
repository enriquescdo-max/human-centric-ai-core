import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { ProposedAction, ApprovalToken } from "./types.js";

/**
 * Makes "cryptographic sign-off" concrete.
 *
 * The design goal: an approval must be impossible to forge without the secret,
 * and impossible to REUSE for a different action. We achieve the second property
 * by binding every approval to a hash of the exact action payload. Approving
 * "send $50 to Alice" produces a token that is worthless for "send $5000 to Bob".
 *
 * For multi-operator deployments you would swap HMAC for asymmetric signatures
 * (one keypair per approver). The interface below stays identical.
 */

/** Canonicalize an action so the same logical action always hashes the same way. */
function canonicalize(action: ProposedAction): string {
  // Sort payload keys so {a,b} and {b,a} produce an identical hash.
  const sortedPayload = Object.keys(action.payload)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = action.payload[k];
      return acc;
    }, {});
  return JSON.stringify({
    id: action.id,
    type: action.type,
    proposedBy: action.proposedBy,
    payload: sortedPayload,
    impact: action.impact,
  });
}

/** Deterministic hash of an action. This is what a human is asked to approve. */
export function hashAction(action: ProposedAction): string {
  return createHash("sha256").update(canonicalize(action)).digest("hex");
}

/**
 * Sign an approval for a specific action. In production this is called only
 * AFTER a real human has reviewed the proposal in your UI / Telegram / Slack.
 */
export function signApproval(params: {
  action: ProposedAction;
  approverId: string;
  secret: string;
  /** Token lifetime in milliseconds. Default 5 minutes. */
  ttlMs?: number;
}): ApprovalToken {
  const { action, approverId, secret, ttlMs = 5 * 60 * 1000 } = params;
  const actionHash = hashAction(action);
  const signedAt = Date.now();
  const expiresAt = signedAt + ttlMs;
  const signature = createHmac("sha256", secret)
    .update(`${actionHash}.${approverId}.${signedAt}.${expiresAt}`)
    .digest("hex");
  return { actionHash, approverId, signedAt, expiresAt, signature };
}

/**
 * Verify a token actually authorizes THIS action, right now.
 * Rejects: forged signatures, expired tokens, and tokens minted for a
 * different action (the replay-prevention property).
 */
export function verifyApproval(params: {
  action: ProposedAction;
  token: ApprovalToken;
  secret: string;
}): { valid: true } | { valid: false; reason: string } {
  const { action, token, secret } = params;

  if (Date.now() > token.expiresAt) {
    return { valid: false, reason: "approval token expired" };
  }
  if (hashAction(action) !== token.actionHash) {
    return {
      valid: false,
      reason: "token does not match this action (possible replay)",
    };
  }
  const expected = createHmac("sha256", secret)
    .update(
      `${token.actionHash}.${token.approverId}.${token.signedAt}.${token.expiresAt}`,
    )
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(token.signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, reason: "invalid signature" };
  }
  return { valid: true };
}
