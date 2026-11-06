
-- The machine-payable door (x402 v2, `exact` scheme).
--
-- One signed authorization buys exactly one hosted issuance. The unique nonce key
-- is the replay gate and it is claimed BEFORE the work runs, so a second delivery of
-- the same bytes cannot buy a second receipt. Refusals are recorded too: a payment we
-- turned away is part of the record, not something we quietly dropped.

CREATE TABLE IF NOT EXISTS public.x402_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nonce_key TEXT NOT NULL UNIQUE,
  payment_digest TEXT NOT NULL,
  network TEXT NOT NULL,
  asset TEXT NOT NULL,
  pay_to TEXT NOT NULL,
  amount_atomic TEXT NOT NULL,
  payer TEXT,
  status TEXT NOT NULL DEFAULT 'claimed',
  reason TEXT,
  transaction TEXT,
  resource_url TEXT,
  receipt_commit_id TEXT,
  requester_digest TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ,
  CONSTRAINT x402_payments_status CHECK (
    status IN ('claimed', 'settled', 'verify_failed', 'settle_failed', 'refused_replay', 'refused_malformed')
  )
);

ALTER TABLE public.x402_payments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.x402_payments TO service_role;

CREATE INDEX IF NOT EXISTS idx_x402_payments_digest ON public.x402_payments(payment_digest);
CREATE INDEX IF NOT EXISTS idx_x402_payments_receipt ON public.x402_payments(receipt_commit_id);
CREATE INDEX IF NOT EXISTS idx_x402_payments_created ON public.x402_payments(created_at);

-- Atomic first-delivery claim. True only for the request that owns the attempt.
-- A payment the facilitator refused moved no funds, so the same bytes may be tried
-- again; anything past that point is refused, because settling twice for one
-- execution is the double-spend this gate exists to make impossible.
CREATE OR REPLACE FUNCTION public.claim_x402_payment(
  p_nonce_key text,
  p_payment_digest text,
  p_network text,
  p_asset text,
  p_pay_to text,
  p_amount_atomic text,
  p_payer text,
  p_resource_url text,
  p_requester_digest text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted integer;
BEGIN
  UPDATE public.x402_payments
     SET status = 'claimed', reason = NULL, transaction = NULL, created_at = now()
   WHERE nonce_key = p_nonce_key AND status = 'verify_failed';
  IF FOUND THEN
    RETURN true;
  END IF;

  INSERT INTO public.x402_payments (
    nonce_key, payment_digest, network, asset, pay_to, amount_atomic,
    payer, resource_url, requester_digest, status
  ) VALUES (
    p_nonce_key, p_payment_digest, p_network, p_asset, p_pay_to, p_amount_atomic,
    p_payer, p_resource_url, p_requester_digest, 'claimed'
  )
  ON CONFLICT (nonce_key) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 0 THEN
    UPDATE public.x402_payments
       SET reason = 'apex_payment_nonce_already_claimed'
     WHERE nonce_key = p_nonce_key AND status <> 'settled';
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_x402_payment(text, text, text, text, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_x402_payment(text, text, text, text, text, text, text, text, text)
  TO service_role;
