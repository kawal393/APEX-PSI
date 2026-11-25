-- The durable replay store for the receiver gate.
--
-- A signed proposal buys one action. The gate asks this table whether that
-- proposal has already been spent, and the answer is written the moment the
-- gate permits it: the unique key is what refuses the second attempt. The
-- key on the money door is the proposal id alone, so a proposal is spent once
-- on every instance, forever.
--
-- The table was created live by Lovable and then added to this repository, so a
-- restored database comes back with the table the gate needs. Without it, a
-- restored project answers `enforce_unavailable` and the gate cannot enforce.
--
-- The table stays private to the server: row level security is on and no
-- policy grants anyone access, so the only reader is the service role that
-- the edge functions hold. The date index is what the retention sweep reads.

CREATE TABLE IF NOT EXISTS public.gate_replay (
  replay_key TEXT PRIMARY KEY,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gate_replay_created_at_idx ON public.gate_replay (created_at);

ALTER TABLE public.gate_replay ENABLE ROW LEVEL SECURITY;
