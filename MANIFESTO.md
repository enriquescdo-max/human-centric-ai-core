# The Human-Centric AI Manifesto

> Software should be an exoskeleton for human capability — never a replacement for
> human judgment, and never a simulation of human consciousness.

This framework exists because capability is outrunning governance. Autonomous agents
can now scrape, decide, draft, and act faster than any human can supervise them. The
default trajectory is to remove the human from the loop in the name of speed. We are
choosing the opposite default: **the human stays at the center, and the architecture
makes that structurally true — not optional, not a setting someone can quietly disable.**

## The four commitments

**1. Whole-brain by design.**
Agents are the "left brain": narrow, reductionist, fast, high-volume. They are
excellent at crunching, screening, and proposing. They are *not* trusted with
meaning, context, or final authority. The interface — the "right brain" — exists to
give the human calm, contextual oversight, not a wall of raw metrics. Cognitive
overload is treated as a design defect.

**2. The human holds the execution gate.**
Agents may analyze and *propose*. They may not *execute* high-impact actions on their
own. A high-impact action freezes until a specific, identified human signs off, and
that sign-off is cryptographic and bound to the exact action approved — it cannot be
forged, reused, or repointed at a different action.

**3. Truth is infrastructure, not a feature.**
Every automated action is recorded in an append-only, hash-chained ledger. The chain
makes tampering *detectable*: you cannot quietly rewrite history. Anything the system
generates is watermarked with its provenance, so "machine-generated" and
"human-verified" are never confused — the direct answer to deepfakes and silent
hallucination.

**4. Guardrails fail closed.**
Tripwires monitor agents against predefined operational bounds. When an agent breaches
scope, loops, exceeds a cost ceiling, or starts emitting things it shouldn't, the
tripwire severs its runtime immediately. The safe failure mode is *stop*, not
*continue and hope*.

## What this is not

This is not a "trust and safety" wrapper bolted on after the product works. The
guardrails are the foundation the product is built *on*. It is also not a claim that
the machine is conscious, moral, or your friend. It is a tool. A powerful one. Kept,
deliberately, subordinate to the person operating it.

## How to contribute

If you add capability, you add the corresponding guardrail in the same pull request.
A feature that lets an agent do more without a matching checkpoint, tripwire, or
ledger entry is not finished — it is a regression.

---

*Licensed MIT. Use it, fork it, ship it. Keep the human in the loop.*
