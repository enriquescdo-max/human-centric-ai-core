import type { ProposedAction } from "@hcai/ethical-middleware";

/**
 * Left brain: routes tasks to narrow, specialized workers rather than one
 * monolithic, hallucination-prone model. Critically, workers PROPOSE actions —
 * they are structurally unable to execute. Execution is the host application's
 * job, and only after the action clears the HITL checkpoint.
 */

export interface Worker {
  /** Action types this worker is allowed to propose. */
  capabilities: string[];
  /** Analyze input and propose (never execute) an action. */
  propose: (input: unknown) => Omit<ProposedAction, "id" | "proposedAt">;
}

export class TaskRouter {
  private workers = new Map<string, Worker>();

  register(name: string, worker: Worker): this {
    this.workers.set(name, worker);
    return this;
  }

  /** Find the worker that can handle a task type. */
  route(taskType: string): { name: string; worker: Worker } {
    for (const [name, worker] of this.workers) {
      if (worker.capabilities.includes(taskType)) return { name, worker };
    }
    throw new Error(`No worker registered for task type "${taskType}"`);
  }

  /** Run a worker and stamp a complete, immutable proposal. */
  propose(taskType: string, input: unknown): ProposedAction {
    const { name, worker } = this.route(taskType);
    const partial = worker.propose(input);
    return {
      ...partial,
      proposedBy: name,
      id: `act_${Math.random().toString(36).slice(2, 10)}`,
      proposedAt: Date.now(),
    };
  }
}
