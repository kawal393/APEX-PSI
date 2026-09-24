
-- THE GATE — pre-action Authorization Receipts (PSI-ACT/1).
-- notarize seals an OUTPUT after it happened; authorize seals an INTENT
-- before it happens, and verify-action lets a counterparty recompute the
-- integrity of that intent and refuse it. Apex stores the record and its
-- seals; it never executes or judges the action.

CREATE TABLE IF NOT EXISTS public.notary_action_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id TEXT NOT NULL UNIQUE,
  user_id UUID,
  agent_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  policy_ref TEXT NOT NULL DEFAULT 'APEX-GATE/1',
  predicate_id TEXT NOT NULL DEFAULT 'EU_ART_50',
  canonical_payload TEXT NOT NULL,          -- exact sealed string
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,                  -- NULL = no self-expiry (still revocable)

  -- seal chain (mirrors gallows_ledger semantics)
  commit_hash TEXT NOT NULL,
  merkle_leaf_hash TEXT NOT NULL,
  merkle_root TEXT,
  ed25519_signature TEXT,
  pq_signature JSONB,
  pq_public_key TEXT,
  pq_algorithm TEXT,

  -- gate state
  status TEXT NOT NULL DEFAULT 'issued',    -- issued | revoked
  revoked_at TIMESTAMPTZ,
  anchor_commit_id TEXT,                    -- links to ots_proofs via commit_id
  schema_id TEXT NOT NULL DEFAULT 'PSI-ACT/1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notary_action_receipts ENABLE ROW LEVEL SECURITY;

-- Owners may read their own issued receipts. The gate itself (verify-action)
-- reads via the service role, so no public SELECT policy is required.
CREATE POLICY "Users can read own action receipts"
  ON public.notary_action_receipts FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_action_receipts_agent   ON public.notary_action_receipts(agent_id);
CREATE INDEX idx_action_receipts_type    ON public.notary_action_receipts(action_type);
CREATE INDEX idx_action_receipts_status  ON public.notary_action_receipts(status);
