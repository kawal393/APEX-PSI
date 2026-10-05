ALTER TABLE public.partner_referrals ADD COLUMN IF NOT EXISTS stripe_ref text;
ALTER TABLE public.partner_referrals ADD COLUMN IF NOT EXISTS gross_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.partner_referrals ADD COLUMN IF NOT EXISTS currency text;
CREATE UNIQUE INDEX IF NOT EXISTS partner_referrals_stripe_ref_key ON public.partner_referrals(stripe_ref);
GRANT ALL ON public.partner_referrals TO service_role;
GRANT ALL ON public.partners TO service_role;