ALTER TABLE public.gallows_ledger
  ADD COLUMN IF NOT EXISTS pq_signature jsonb,
  ADD COLUMN IF NOT EXISTS pq_public_key text,
  ADD COLUMN IF NOT EXISTS pq_algorithm text;

CREATE INDEX IF NOT EXISTS gallows_ledger_pq_public_key_idx ON public.gallows_ledger (pq_public_key);