-- Provenance Ledger schema for Supabase / PostgreSQL.
-- Design goal: append-only and tamper-EVIDENT at the database layer, so the
-- guarantee does not depend on application code behaving.

create table if not exists provenance_ledger (
  seq          bigint primary key,
  timestamp    bigint not null,
  actor        text   not null check (actor in ('agent', 'human', 'system')),
  event_type   text   not null,
  payload_hash text   not null,
  meta         jsonb  not null default '{}'::jsonb,
  prev_hash    char(64) not null,
  entry_hash   char(64) not null unique,
  created_at   timestamptz not null default now()
);

create index if not exists idx_ledger_event_type on provenance_ledger (event_type);
create index if not exists idx_ledger_actor on provenance_ledger (actor);

-- Block UPDATE and DELETE entirely. The ledger is append-only, full stop.
create or replace function reject_ledger_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'provenance_ledger is append-only; % is not permitted', tg_op;
end;
$$;

drop trigger if exists no_update_ledger on provenance_ledger;
create trigger no_update_ledger
  before update on provenance_ledger
  for each row execute function reject_ledger_mutation();

drop trigger if exists no_delete_ledger on provenance_ledger;
create trigger no_delete_ledger
  before delete on provenance_ledger
  for each row execute function reject_ledger_mutation();

-- Approvals issued by humans. Bound to a specific action hash.
create table if not exists approvals (
  id           uuid primary key default gen_random_uuid(),
  action_hash  char(64) not null,
  approver_id  text not null,
  signed_at    bigint not null,
  expires_at   bigint not null,
  signature    text not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_approvals_action_hash on approvals (action_hash);

-- Enable RLS; policies are intentionally omitted so you define them per-deploy.
alter table provenance_ledger enable row level security;
alter table approvals enable row level security;
