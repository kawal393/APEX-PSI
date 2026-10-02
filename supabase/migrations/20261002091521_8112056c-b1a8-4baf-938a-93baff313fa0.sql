ALTER TABLE public.notary_api_keys ADD COLUMN IF NOT EXISTS revoked boolean NOT NULL DEFAULT false;
ALTER TABLE public.notary_api_keys ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE TABLE IF NOT EXISTS public.notary_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier text NOT NULL DEFAULT 'free',
  daily_limit integer NOT NULL DEFAULT 100,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'canceled',
  welcome_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notary_subscriptions TO authenticated;
GRANT ALL ON public.notary_subscriptions TO service_role;
ALTER TABLE public.notary_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own hosted plan" ON public.notary_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_notary_subscriptions_updated_at BEFORE UPDATE ON public.notary_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();