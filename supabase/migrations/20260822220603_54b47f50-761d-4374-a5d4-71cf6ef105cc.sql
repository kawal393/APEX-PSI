CREATE SEQUENCE IF NOT EXISTS public.crypto_btc_index_seq START 0 MINVALUE 0;

CREATE TABLE public.crypto_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_ref text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  asset text NOT NULL CHECK (asset IN ('BTC','ETH','USDC')),
  address text NOT NULL,
  derivation_index integer,
  amount_asset numeric NOT NULL,
  amount_atomic text NOT NULL,
  fiat_amount_cents integer NOT NULL,
  rate_usd numeric NOT NULL,
  rate_source text NOT NULL,
  status text NOT NULL DEFAULT 'awaiting' CHECK (status IN ('awaiting','seen','confirming','paid','expired','underpaid')),
  txid text,
  confirmations integer NOT NULL DEFAULT 0,
  seen_at timestamp with time zone,
  paid_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL,
  provisioned boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX crypto_invoices_status_idx ON public.crypto_invoices (status, expires_at);
CREATE INDEX crypto_invoices_user_idx ON public.crypto_invoices (user_id, created_at DESC);

GRANT SELECT ON public.crypto_invoices TO authenticated;
GRANT ALL ON public.crypto_invoices TO service_role;

ALTER TABLE public.crypto_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers read own crypto invoices"
  ON public.crypto_invoices FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_crypto_invoices_updated_at
  BEFORE UPDATE ON public.crypto_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.crypto_rate_cache (
  asset text NOT NULL PRIMARY KEY,
  usd numeric NOT NULL,
  source text NOT NULL,
  fetched_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.crypto_rate_cache TO anon, authenticated;
GRANT ALL ON public.crypto_rate_cache TO service_role;

ALTER TABLE public.crypto_rate_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cached public rates"
  ON public.crypto_rate_cache FOR SELECT
  USING (true);