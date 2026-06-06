/**
 * Core types shared across the ethical-middleware package.
 */

/** How consequential an action is. Drives whether a human gate is required. */
export type ImpactLevel = "low" | "medium" | "high" | "critical";

/** An action an agent wants to take. Agents PROPOSE these; they do not run them. */
export interface ProposedAction {
  /** Stable identifier for this proposal. */
  id: string;
  /** What kind of action, e.g. "send_email", "place_trade", "delete_records". */
  type: string;
  /** Which agent/worker proposed it. */
  proposedBy: string;
  /** Arbitrary, JSON-serializable parameters for the action. */
  payload: Record<string, unknown>;
  /** Declared impact. The middleware may also override this via policy. */
  impact: ImpactLevel;
  /** Unix epoch millis when proposed. */
  proposedAt: number;
}

/** A signed human approval, bound to one specific action hash. */
export interface ApprovalToken {
  /** Hash of the exact action this approval is valid for. */
  actionHash: string;
  /** Who approved (a human identity, not an agent). */
  approverId: string;
  /** Unix epoch millis when signed. */
  signedAt: number;
  /** Unix epoch millis after which the token is rejected. */
  expiresAt: number;
  /** HMAC signature over the fields above. */
  signature: string;
}

/** The result of running an action through the checkpoint. */
export type CheckpointResult =
  | { status: "approved"; action: ProposedAction }
  | { status: "auto-approved"; action: ProposedAction }
  | {
      status: "pending-approval";
      action: ProposedAction;
      /** The hash a human must sign to release this action. */
      actionHash: string;
    }
  | { status: "rejected"; action: ProposedAction; reason: string };
