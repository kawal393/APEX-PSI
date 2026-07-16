
-- ═══════════════════════════════════════════════════════════════════════
-- APEX PSI v3 — Hardening layer
-- 1) predicate_proofs: verifiable-logic-proof records bound to receipts
-- 2) quarantine_events: t-of-n decentralized model quarantine ledger
-- 3) psi_challenges: challenge + economic-bond scaffold
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE public.predicate_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id TEXT NOT NULL,
  predicate_id TEXT NOT NULL,
  predicate_version TEXT NOT NULL DEFAULT 'v1',
  input_hash TEXT NOT NULL,
  output_hash TEXT NOT NULL,
  proof_hash TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('SATISFIED','VIOLATED','INCONCLUSIVE')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  ed25519_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_predicate_proofs_receipt ON public.predicate_proofs(receipt_id);
CREATE INDEX idx_predicate_proofs_verdict ON public.predicate_proofs(verdict);

GRANT SELECT ON public.predicate_proofs TO anon, authenticated;
GRANT ALL ON public.predicate_proofs TO service_role;
ALTER TABLE public.predicate_proofs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read predicate_proofs" ON public.predicate_proofs FOR SELECT USING (true);
CREATE POLICY "service writes predicate_proofs" ON public.predicate_proofs FOR INSERT WITH CHECK (false);

CREATE TABLE public.quarantine_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('QUARANTINE','CLEAR')),
  reason TEXT NOT NULL,
  threshold_required INT NOT NULL DEFAULT 2,
  signatures JSONB NOT NULL DEFAULT '[]'::jsonb,
  quorum_reached BOOLEAN NOT NULL DEFAULT false,
  event_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quarantine_model ON public.quarantine_events(model_id, created_at DESC);
CREATE INDEX idx_quarantine_quorum ON public.quarantine_events(quorum_reached);

GRANT SELECT ON public.quarantine_events TO anon, authenticated;
GRANT ALL ON public.quarantine_events TO service_role;
ALTER TABLE public.quarantine_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read quarantine" ON public.quarantine_events FOR SELECT USING (true);

CREATE TABLE public.psi_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id TEXT NOT NULL UNIQUE,
  receipt_id TEXT NOT NULL,
  challenger_pubkey TEXT NOT NULL,
  bond_hash TEXT NOT NULL,
  bond_amount_wei TEXT NOT NULL DEFAULT '0',
  claim TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED_VALID','RESOLVED_INVALID','EXPIRED')),
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  window_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_challenges_receipt ON public.psi_challenges(receipt_id);
CREATE INDEX idx_challenges_status ON public.psi_challenges(status);

GRANT SELECT ON public.psi_challenges TO anon, authenticated;
GRANT ALL ON public.psi_challenges TO service_role;
ALTER TABLE public.psi_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read challenges" ON public.psi_challenges FOR SELECT USING (true);
