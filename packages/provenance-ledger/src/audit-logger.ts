import { createHash } from "node:crypto";

/**
 * An append-only, hash-chained audit log.
 *
 * Each entry stores the hash of the previous entry, so entries form a chain
 * (the same idea behind a blockchain or a Merkle log, minus the consensus).
 * You cannot quietly alter or delete a past entry without breaking every hash
 * that follows it — which verifyChain() will detect. This is what makes the
 * ledger "immutable" in any way that actually means something.
 */

export type Actor = "agent" | "human" | "system";

export interface LedgerEntry {
  seq: number;
  timestamp: number;
  actor: Actor;
  /** e.g. "proposal", "tripwire_halt", "approval", "execution". */
  eventType: string;
  /** Hash of the action/payload this event concerns. */
  payloadHash: string;
  /** Free-form context (approver id, tripwire name, etc.). */
  meta: Record<string, unknown>;
  prevHash: string;
  entryHash: string;
}

const GENESIS_PREV = "0".repeat(64);

function computeEntryHash(
  e: Omit<LedgerEntry, "entryHash">,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        seq: e.seq,
        timestamp: e.timestamp,
        actor: e.actor,
        eventType: e.eventType,
        payloadHash: e.payloadHash,
        meta: e.meta,
        prevHash: e.prevHash,
      }),
    )
    .digest("hex");
}

/** Storage backends implement this. An in-memory one ships for tests/demos. */
export interface LedgerStore {
  last(): Promise<LedgerEntry | null>;
  append(entry: LedgerEntry): Promise<void>;
  all(): Promise<LedgerEntry[]>;
}

export class InMemoryLedgerStore implements LedgerStore {
  private entries: LedgerEntry[] = [];
  async last() {
    return this.entries[this.entries.length - 1] ?? null;
  }
  async append(entry: LedgerEntry) {
    this.entries.push(entry);
  }
  async all() {
    return [...this.entries];
  }
}

export class ProvenanceLedger {
  constructor(private store: LedgerStore = new InMemoryLedgerStore()) {}

  async record(params: {
    actor: Actor;
    eventType: string;
    payloadHash: string;
    meta?: Record<string, unknown>;
  }): Promise<LedgerEntry> {
    const prev = await this.store.last();
    const base: Omit<LedgerEntry, "entryHash"> = {
      seq: prev ? prev.seq + 1 : 0,
      timestamp: Date.now(),
      actor: params.actor,
      eventType: params.eventType,
      payloadHash: params.payloadHash,
      meta: params.meta ?? {},
      prevHash: prev ? prev.entryHash : GENESIS_PREV,
    };
    const entry: LedgerEntry = { ...base, entryHash: computeEntryHash(base) };
    await this.store.append(entry);
    return entry;
  }

  /**
   * Recompute the whole chain and confirm nothing was altered or removed.
   * Returns the index of the first broken entry, or -1 if intact.
   */
  async verifyChain(): Promise<{ intact: boolean; brokenAt: number }> {
    const entries = await this.store.all();
    let expectedPrev = GENESIS_PREV;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.prevHash !== expectedPrev) return { intact: false, brokenAt: i };
      const { entryHash, ...rest } = e;
      if (computeEntryHash(rest) !== entryHash)
        return { intact: false, brokenAt: i };
      expectedPrev = e.entryHash;
    }
    return { intact: true, brokenAt: -1 };
  }
}
