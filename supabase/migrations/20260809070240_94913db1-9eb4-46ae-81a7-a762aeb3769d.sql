CREATE TABLE public.service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  service_key text NOT NULL CHECK (service_key IN ('conformity_receipt', 'prover', 'registry_listing')),
  stripe_checkout_session_id text UNIQUE,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  amount_total integer,
  currency text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'active', 'cancelled', 'refunded', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_orders TO authenticated;
GRANT ALL ON public.service_orders TO service_role;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view their own service orders" ON public.service_orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER update_service_orders_updated_at BEFORE UPDATE ON public.service_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX service_orders_user_created_idx ON public.service_orders (user_id, created_at DESC);

CREATE TABLE public.service_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  service_key text NOT NULL CHECK (service_key IN ('conformity_receipt', 'prover', 'registry_listing')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'consumed', 'expired')),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  stripe_subscription_id text,
  source_order_id uuid REFERENCES public.service_orders(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, service_key)
);
GRANT SELECT ON public.service_entitlements TO authenticated;
GRANT ALL ON public.service_entitlements TO service_role;
ALTER TABLE public.service_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view their own service entitlements" ON public.service_entitlements FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER update_service_entitlements_updated_at BEFORE UPDATE ON public.service_entitlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX service_entitlements_user_status_idx ON public.service_entitlements (user_id, status);