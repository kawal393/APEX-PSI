CREATE TABLE public.ots_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commit_id TEXT NOT NULL,
  target_hash TEXT NOT NULL,
  ots_base64 TEXT NOT NULL,
  calendar_url TEXT NOT NULL,
  bitcoin_block_height BIGINT,
  bitcoin_txid TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ots_proofs_commit_id ON public.ots_proofs (commit_id);
CREATE INDEX idx_ots_proofs_target_hash ON public.ots_proofs (target_hash);

GRANT SELECT ON public.ots_proofs TO anon;
GRANT SELECT ON public.ots_proofs TO authenticated;
GRANT ALL ON public.ots_proofs TO service_role;

ALTER TABLE public.ots_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read timestamp proofs"
  ON public.ots_proofs FOR SELECT USING (true);

CREATE TRIGGER update_ots_proofs_updated_at
  BEFORE UPDATE ON public.ots_proofs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.anchor_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anchor_hash TEXT NOT NULL,
  bitcoin_txid TEXT,
  block_height BIGINT,
  explorer_url TEXT,
  entries_count INTEGER NOT NULL DEFAULT 0,
  merkle_roots JSONB NOT NULL DEFAULT '[]'::jsonb,
  chain TEXT NOT NULL DEFAULT 'bitcoin',
  status TEXT NOT NULL DEFAULT 'pending',
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_anchor_records_status ON public.anchor_records (status);

GRANT SELECT ON public.anchor_records TO anon;
GRANT SELECT ON public.anchor_records TO authenticated;
GRANT ALL ON public.anchor_records TO service_role;

ALTER TABLE public.anchor_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read anchor records"
  ON public.anchor_records FOR SELECT USING (true);

CREATE TRIGGER update_anchor_records_updated_at
  BEFORE UPDATE ON public.anchor_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_seal_counts()
RETURNS TABLE(
  total_seals BIGINT,
  approved_seals BIGINT,
  pq_signed_seals BIGINT,
  attestations BIGINT,
  confirmed_anchors BIGINT,
  ots_proofs BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.gallows_ledger),
    (SELECT count(*) FROM public.gallows_ledger WHERE status = 'APPROVED'),
    (SELECT count(*) FROM public.gallows_ledger WHERE pq_signature IS NOT NULL),
    (SELECT count(*) FROM public.public_attestations),
    (SELECT count(*) FROM public.anchor_records WHERE status = 'confirmed'),
    (SELECT count(*) FROM public.ots_proofs);
$$;

GRANT EXECUTE ON FUNCTION public.get_seal_counts() TO anon, authenticated, service_role;