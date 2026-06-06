import type {
  ProposedAction,
  ApprovalToken,
  CheckpointResult,
  ImpactLevel,
} from "./types.js";
import { hashAction, verifyApproval } from "./signing.js";

/**
 * The Human-in-the-Loop checkpoint. This is the execution gate.
 *
 * Drop it between "agent proposed an action" and "system executes the action".
 * Low-impact actions pass through automatically. Anything at or above the
 * configured threshold freezes until a valid, signed human approval is supplied.
 */

const IMPACT_ORDER: Record<ImpactLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export interface CheckpointConfig {
  /** Shared secret used to verify approval signatures. */
  secret: string;
  /** Minimum impact that requires a human. Default "high". */
  requireApprovalAtOrAbove?: ImpactLevel;
  /**
   * Optional policy hook to override an agent's self-declared impact.
   * Never let the agent be the only judge of how dangerous its own action is.
   */
  classifyImpact?: (action: ProposedAction) => ImpactLevel;
  /**
   * Called when an action needs a human. Wire this to your approval queue
   * (dashboard, Telegram, Slack). It does not block — the action returns
   * "pending-approval" and is released on a later call once a token exists.
   */
  onApprovalRequired?: (action: ProposedAction, actionHash: string) => void;
}

export class HumanCheckpoint {
  private threshold: number;

  constructor(private config: CheckpointConfig) {
    this.threshold =
      IMPACT_ORDER[config.requireApprovalAtOrAbove ?? "high"];
  }

  /**
   * Evaluate a proposed action.
   * @param token An approval token, if a human has already signed off.
   */
  evaluate(action: ProposedAction, token?: ApprovalToken): CheckpointResult {
    const impact = this.config.classifyImpact
      ? this.config.classifyImpact(action)
      : action.impact;
    const effective: ProposedAction = { ...action, impact };

    if (IMPACT_ORDER[impact] < this.threshold) {
      return { status: "auto-approved", action: effective };
    }

    const actionHash = hashAction(effective);

    if (!token) {
      this.config.onApprovalRequired?.(effective, actionHash);
      return { status: "pending-approval", action: effective, actionHash };
    }

    const check = verifyApproval({
      action: effective,
      token,
      secret: this.config.secret,
    });
    if (!check.valid) {
      return { status: "rejected", action: effective, reason: check.reason };
    }
    return { status: "approved", action: effective };
  }

  /** Convenience: did this result clear the gate? */
  static isCleared(result: CheckpointResult): boolean {
    return result.status === "approved" || result.status === "auto-approved";
  }
}
