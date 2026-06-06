import type { ProposedAction } from "./types.js";

/**
 * Tripwires monitor agent behavior against predefined safe bounds. When a
 * tripwire fires at "halt" severity, the agent's runtime is severed: the action
 * never reaches the human gate, and the caller is expected to stop the agent.
 *
 * Fail closed. The safe failure mode is STOP, not "continue and hope."
 */

export type TripwireSeverity = "warn" | "halt";

export interface TripwireContext {
  /** Recent action types proposed by this agent, oldest first. */
  recentActionTypes: string[];
  /** Total spend (any unit) this agent has committed in the current window. */
  spendSoFar: number;
  /** Tools/action types this agent is permitted to use at all. */
  allowedActionTypes: string[];
}

export interface Tripwire {
  name: string;
  severity: TripwireSeverity;
  /** Return a string reason to TRIP, or null to pass. */
  check: (action: ProposedAction, ctx: TripwireContext) => string | null;
}

export class TripwireError extends Error {
  constructor(
    public readonly tripwire: string,
    public readonly reason: string,
  ) {
    super(`Tripwire "${tripwire}" severed runtime: ${reason}`);
    this.name = "TripwireError";
  }
}

/** A set of sensible defaults. Compose your own and pass them to evaluate(). */
export const defaultTripwires = (opts: {
  spendCeiling: number;
  maxRepeats: number;
}): Tripwire[] => [
  {
    name: "out-of-scope-tool",
    severity: "halt",
    check: (action, ctx) =>
      ctx.allowedActionTypes.includes(action.type)
        ? null
        : `action type "${action.type}" is outside this agent's permitted scope`,
  },
  {
    name: "spend-ceiling",
    severity: "halt",
    check: (_action, ctx) =>
      ctx.spendSoFar > opts.spendCeiling
        ? `spend ${ctx.spendSoFar} exceeded ceiling ${opts.spendCeiling}`
        : null,
  },
  {
    name: "loop-detection",
    severity: "halt",
    check: (action, ctx) => {
      const streak = [...ctx.recentActionTypes, action.type];
      const tail = streak.slice(-opts.maxRepeats);
      const looping =
        tail.length === opts.maxRepeats &&
        tail.every((t) => t === action.type);
      return looping
        ? `agent repeated "${action.type}" ${opts.maxRepeats}x — likely stuck in a loop`
        : null;
    },
  },
];

/**
 * Run every tripwire. Throws TripwireError on the first "halt" breach (sever).
 * Returns any "warn"-level reasons for logging.
 */
export function evaluateTripwires(
  action: ProposedAction,
  ctx: TripwireContext,
  tripwires: Tripwire[],
): { warnings: string[] } {
  const warnings: string[] = [];
  for (const tw of tripwires) {
    const reason = tw.check(action, ctx);
    if (!reason) continue;
    if (tw.severity === "halt") throw new TripwireError(tw.name, reason);
    warnings.push(`${tw.name}: ${reason}`);
  }
  return { warnings };
}
