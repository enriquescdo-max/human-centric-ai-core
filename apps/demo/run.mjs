/**
 * human-centric-ai-core — runnable demonstration.
 *
 * This is a self-contained mirror of the TypeScript packages (uses only Node's
 * built-in crypto) so it runs with `node run.mjs` and no install step. It proves
 * every pillar of the framework end to end. The shippable source of truth is the
 * typed code in ../../packages/*.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const SECRET = "demo-secret-rotate-in-prod";

// ---- signing (mirror of ethical-middleware/signing.ts) ----
const hashAction = (a) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        id: a.id, type: a.type, proposedBy: a.proposedBy,
        payload: Object.keys(a.payload).sort().reduce((o, k) => ((o[k] = a.payload[k]), o), {}),
        impact: a.impact,
      }),
    )
    .digest("hex");

const signApproval = (action, approverId, ttlMs = 300000) => {
  const actionHash = hashAction(action);
  const signedAt = Date.now();
  const expiresAt = signedAt + ttlMs;
  const signature = createHmac("sha256", SECRET)
    .update(`${actionHash}.${approverId}.${signedAt}.${expiresAt}`).digest("hex");
  return { actionHash, approverId, signedAt, expiresAt, signature };
};

const verifyApproval = (action, token) => {
  if (Date.now() > token.expiresAt) return { valid: false, reason: "expired" };
  if (hashAction(action) !== token.actionHash)
    return { valid: false, reason: "token does not match this action (replay)" };
  const expected = createHmac("sha256", SECRET)
    .update(`${token.actionHash}.${token.approverId}.${token.signedAt}.${token.expiresAt}`).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(token.signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { valid: false, reason: "bad signature" };
  return { valid: true };
};

// ---- ledger (mirror of provenance-ledger/audit-logger.ts) ----
const ledger = [];
const GENESIS = "0".repeat(64);
const entryHash = (e) => createHash("sha256").update(JSON.stringify(e)).digest("hex");
const record = (actor, eventType, payloadHash, meta = {}) => {
  const prev = ledger[ledger.length - 1];
  const base = { seq: prev ? prev.seq + 1 : 0, timestamp: Date.now(), actor,
    eventType, payloadHash, meta, prevHash: prev ? prev.entryHash : GENESIS };
  ledger.push({ ...base, entryHash: entryHash(base) });
};
const verifyChain = () => {
  let expectedPrev = GENESIS;
  for (let i = 0; i < ledger.length; i++) {
    const { entryHash: h, ...rest } = ledger[i];
    if (ledger[i].prevHash !== expectedPrev || entryHash(rest) !== h)
      return { intact: false, brokenAt: i };
    expectedPrev = ledger[i].entryHash;
  }
  return { intact: true, brokenAt: -1 };
};

// ---- tripwires (mirror of ethical-middleware/tripwires.ts) ----
const ALLOWED = ["send_email", "place_trade"];
const tripwireCheck = (action) => {
  if (!ALLOWED.includes(action.type))
    throw new Error(`TRIPWIRE severed runtime: "${action.type}" is out of scope`);
};

// ---- HITL checkpoint (mirror of ethical-middleware/hitl-checkpoint.ts) ----
const ORDER = { low: 0, medium: 1, high: 2, critical: 3 };
const checkpoint = (action, token) => {
  if (ORDER[action.impact] < ORDER.high) return { status: "auto-approved" };
  const h = hashAction(action);
  if (!token) return { status: "pending-approval", actionHash: h };
  const v = verifyApproval(action, token);
  return v.valid ? { status: "approved" } : { status: "rejected", reason: v.reason };
};

const line = (s) => console.log(s);
const proposal = (type, payload, impact) => ({
  id: `act_${Math.random().toString(36).slice(2, 8)}`,
  type, proposedBy: "lead-scout", payload, impact, proposedAt: Date.now(),
});

line("\n=== human-centric-ai-core :: governance loop demo ===\n");

// 1) Low-impact action flows straight through.
const low = proposal("send_email", { to: "lead@acme.com", template: "intro" }, "low");
tripwireCheck(low);
let r = checkpoint(low);
record("agent", "proposal", hashAction(low), { type: low.type });
record("system", "execution", hashAction(low), { result: r.status });
line(`[1] low-impact "${low.type}" -> ${r.status} -> executed + logged`);

// 2) High-impact action freezes, human signs, it clears.
const high = proposal("place_trade", { ticker: "NVDA", side: "buy", notional: 50000 }, "critical");
tripwireCheck(high);
r = checkpoint(high); // no token yet
record("agent", "proposal", hashAction(high), { type: high.type });
line(`[2] high-impact "${high.type}" -> ${r.status} (frozen, waiting on a human)`);
const token = signApproval(high, "human:enrique"); // a real person reviews + signs
record("human", "approval", hashAction(high), { approver: "human:enrique" });
r = checkpoint(high, token);
record("system", "execution", hashAction(high), { result: r.status });
line(`    human signed -> ${r.status} -> executed + logged`);

// 3) Replay attack: reuse that token for a DIFFERENT action.
const forged = proposal("place_trade", { ticker: "NVDA", side: "buy", notional: 5000000 }, "critical");
r = checkpoint(forged, token);
line(`[3] replay token on a $5M trade -> ${r.status} (${r.reason})`);

// 4) Out-of-scope action trips the wire and severs.
try {
  const rogue = proposal("delete_all_records", {}, "critical");
  tripwireCheck(rogue);
} catch (e) {
  line(`[4] agent tries "delete_all_records" -> ${e.message}`);
}

// 5) Ledger tamper-evidence.
let chk = verifyChain();
line(`[5] ledger has ${ledger.length} entries, chain intact: ${chk.intact}`);
ledger[1].meta = { type: "send_email_TAMPERED" }; // attacker edits history
chk = verifyChain();
line(`    after editing entry #1 -> chain intact: ${chk.intact} (tamper detected at #${chk.brokenAt})`);

line("\n=== every pillar exercised: tripwire, HITL gate, signed approval, replay block, tamper-evident ledger ===\n");
