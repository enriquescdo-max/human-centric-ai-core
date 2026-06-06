import { createHash } from "node:crypto";

/**
 * Tags any content the system produces with a provenance envelope, so
 * "machine-generated" and "human-verified" can never be silently confused.
 * The contentHash lets a downstream consumer confirm the content wasn't altered
 * after it was tagged.
 */

export type Origin = "machine" | "human-verified" | "hybrid";

export interface ProvenanceEnvelope {
  origin: Origin;
  /** Model or person responsible, e.g. "claude-sonnet-4" or "user:enrique". */
  source: string;
  generatedAt: number;
  contentHash: string;
}

export interface WatermarkedContent {
  content: string;
  provenance: ProvenanceEnvelope;
}

export function watermark(params: {
  content: string;
  origin: Origin;
  source: string;
}): WatermarkedContent {
  const contentHash = createHash("sha256")
    .update(params.content)
    .digest("hex");
  return {
    content: params.content,
    provenance: {
      origin: params.origin,
      source: params.source,
      generatedAt: Date.now(),
      contentHash,
    },
  };
}

/** Confirm a watermarked payload hasn't been tampered with since tagging. */
export function verifyWatermark(wc: WatermarkedContent): boolean {
  const recomputed = createHash("sha256").update(wc.content).digest("hex");
  return recomputed === wc.provenance.contentHash;
}
