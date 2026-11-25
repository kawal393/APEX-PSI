CREATE TABLE public.gate_replay (
  replay_key text PRIMARY KEY,
  scope text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gate_replay ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gate_replay FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.gate_replay TO service_role;
COMMENT ON TABLE public.gate_replay IS 'Consumed PSI-ACT/1 proposal ids for the machine-checkout receiver gate; server-only. Durable across instances so a proposal cannot be replayed on another worker.';