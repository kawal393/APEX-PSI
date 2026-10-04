CREATE TABLE IF NOT EXISTS public.notary_action_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id TEXT NOT NULL UNIQUE,
  user_id UUID,
  agent_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  policy_ref TEXT NOT NULL DEFAULT 'APEX-GATE/1',
  predicate_id TEXT NOT NULL DEFAULT 'EU_ART_50',
  canonical_payload TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  commit_hash TEXT NOT NULL,
  merkle_leaf_hash TEXT NOT NULL,
  merkle_root TEXT,
  ed25519_signature TEXT,
  pq_signature JSONB,
  pq_public_key TEXT,
  pq_algorithm TEXT,
  status TEXT NOT NULL DEFAULT 'issued',
  revoked_at TIMESTAMPTZ,
  anchor_commit_id TEXT,
  schema_id TEXT NOT NULL DEFAULT 'PSI-ACT/1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notary_action_receipts TO authenticated;
GRANT ALL ON public.notary_action_receipts TO service_role;
ALTER TABLE public.notary_action_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own action receipts" ON public.notary_action_receipts;
CREATE POLICY "Users can read own action receipts" ON public.notary_action_receipts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_action_receipts_agent ON public.notary_action_receipts(agent_id);
CREATE INDEX IF NOT EXISTS idx_action_receipts_type ON public.notary_action_receipts(action_type);
CREATE INDEX IF NOT EXISTS idx_action_receipts_status ON public.notary_action_receipts(status);