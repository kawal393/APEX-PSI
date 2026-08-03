CREATE TABLE public.verified_suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain text NOT NULL UNIQUE,
  display_name text NOT NULL,
  jurisdiction text,
  contact_email text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  verified_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.verified_suppliers TO anon;
GRANT SELECT ON public.verified_suppliers TO authenticated;
GRANT ALL ON public.verified_suppliers TO service_role;

ALTER TABLE public.verified_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active supplier listings are public"
  ON public.verified_suppliers FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can manage supplier listings"
  ON public.verified_suppliers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_verified_suppliers_updated_at
  BEFORE UPDATE ON public.verified_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_verified_suppliers_domain ON public.verified_suppliers (domain);