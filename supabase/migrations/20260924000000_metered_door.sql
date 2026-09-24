
-- Metered door: subscription state + key revoke flag.
-- The gate (notary_api_keys) already exists; this records what a user paid for
-- so API keys can be minted at the right daily_limit, and lets keys be revoked.

CREATE TABLE IF NOT EXISTS public.notary_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free',
  daily_limit INTEGER NOT NULL DEFAULT 100,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notary_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription"
  ON public.notary_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_notary_subscriptions_user ON public.notary_subscriptions(user_id);
CREATE INDEX idx_notary_subscriptions_stripe_sub ON public.notary_subscriptions(stripe_subscription_id);

ALTER TABLE public.notary_api_keys
  ADD COLUMN IF NOT EXISTS revoked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.notary_api_keys
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
