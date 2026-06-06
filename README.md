# human-centric-ai-core

**An open-source foundation for autonomous AI systems that keep the human in the loop — by architecture, not by good intentions.**

Capability is outrunning governance. This framework is the missing default: the
human holds the execution gate, every automated action is recorded in a
tamper-evident ledger, and agents that breach their bounds are severed instead of
trusted. Drop it under any agentic workflow — lead generation, trading, research,
cyber-defense — and the guardrails come with it.

Read **[MANIFESTO.md](./MANIFESTO.md)** first. It defines the philosophy the code enforces.

## See it work in 5 seconds

```bash
node apps/demo/run.mjs
```

```
[1] low-impact "send_email"   -> auto-approved -> executed + logged
[2] high-impact "place_trade" -> pending-approval (frozen, waiting on a human)
    human signed              -> approved -> executed + logged
[3] replay token on a $5M trade -> rejected (token does not match this action)
[4] agent tries "delete_all_records" -> TRIPWIRE severed runtime (out of scope)
[5] ledger 5 entries, chain intact: true
    after editing entry #1    -> chain intact: false (tamper detected at #1)
```

No install, no API keys — it uses only Node's built-in crypto.

## The architecture (the corrected flow)

Agents are the **left brain**: fast, narrow, high-volume. They *propose* — they
never execute. The human gate sits at the **execution boundary**, not upstream:

```
  Agents propose ──▶ Tripwires ──(breach)──▶ SEVER
   (agent-engine)        │
                      (pass)
                         ▼
              HITL gate (ethical-middleware)
                         │
            high-impact? ─▶ freeze, wait for a signed human approval
                         │
                    (cleared)
                         ▼
                    Execution ──▶ Provenance Ledger (append-only hash chain)
                         ▲
   UI Context renders proposals + pending approvals calmly to the human
   (ui-context)
```

## Packages

| Package | Role | What's inside |
| --- | --- | --- |
| `@hcai/ethical-middleware` | The guardrails | `HumanCheckpoint` (the execution gate), `tripwires` (sever on breach), `signing` (HMAC approval tokens bound to one action hash — forge-proof and replay-proof) |
| `@hcai/provenance-ledger` | The truth layer | `ProvenanceLedger` (append-only, hash-chained, `verifyChain()` detects tampering), `watermark` (machine vs. human-verified provenance), Supabase schema with append-only DB triggers |
| `@hcai/agent-engine` | The left brain | `TaskRouter` routing tasks to narrow workers that can only propose |
| `@hcai/ui-context` | The right brain | Golden-ratio scales + a narrative parser that turns raw metrics into calm summaries |

## Why the crypto is real, not decorative

- **Approvals are bound to the exact action.** A token signed for "send $50 to Alice"
  fails verification against "send $5M to Bob." Approve-once-replay-forever is closed.
- **The ledger is a hash chain.** Each entry hashes the previous one, so altering or
  deleting history breaks every downstream hash. `verifyChain()` reports exactly where.
  The Supabase schema also blocks `UPDATE`/`DELETE` at the database layer.

## Wiring it into a real app

1. Your agents call `TaskRouter.propose(...)` → you get a `ProposedAction`.
2. Run it through `evaluateTripwires(...)`. A `halt` throws → stop the agent.
3. Pass it to `HumanCheckpoint.evaluate(action, token?)`.
   - `auto-approved` → execute.
   - `pending-approval` → push `actionHash` to your approval queue (dashboard,
     Telegram, Slack). When a human signs with `signApproval(...)`, re-call
     `evaluate(action, token)`.
4. On every step, call `ledger.record(...)`.

The approval queue is deliberately yours to build — that's where this slots onto
existing HITL setups instead of replacing them.

## Put it on GitHub (one command)

Needs the GitHub CLI (`gh`). On a Mac: `brew install gh`.

```bash
./bootstrap.sh   # git init -> commit -> create the repo -> push, in one run
```

`gh` handles auth through its own secure store — no token is pasted or written
into a remote URL. To make it private, change `VISIBILITY="public"` to
`"private"` at the top of `bootstrap.sh`.

## Build the typed packages

```bash
npm install
npm run build   # turbo runs tsc across all packages
```

## Contributing

One rule from the manifesto: **if you add capability, add the matching guardrail in
the same PR.** A new agent power without a checkpoint, tripwire, or ledger entry is a
regression, not a feature.

MIT licensed. Keep the human in the loop.
