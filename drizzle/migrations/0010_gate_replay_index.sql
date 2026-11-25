create table if not exists public.gate_replay (
  replay_key text primary key,
  scope text,
  created_at timestamptz not null default now()
);

create index if not exists gate_replay_created_at_idx on public.gate_replay (created_at);