# @hcai/provenance-ledger

The truth layer. `ProvenanceLedger` is an append-only hash chain — `verifyChain()` pinpoints any tampering. `watermark` tags content as machine vs. human-verified. `supabase/schema.sql` enforces append-only at the database with UPDATE/DELETE triggers.
