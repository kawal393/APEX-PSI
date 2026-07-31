ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS landing_page text;

CREATE INDEX IF NOT EXISTS idx_site_visits_campaign ON public.site_visits (utm_campaign);
CREATE INDEX IF NOT EXISTS idx_site_visits_created_at ON public.site_visits (created_at DESC);

CREATE TABLE public.marketing_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  name text,
  company text,
  source_page text,
  intent text NOT NULL DEFAULT 'compliance_pack',
  visitor_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  landing_page text,
  referrer text,
  country text,
  score integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_leads_created_at ON public.marketing_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_campaign ON public.marketing_leads (utm_campaign);

GRANT INSERT ON public.marketing_leads TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.marketing_leads TO authenticated;
GRANT ALL ON public.marketing_leads TO service_role;

ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a marketing lead"
  ON public.marketing_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view marketing leads"
  ON public.marketing_leads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update marketing leads"
  ON public.marketing_leads FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete marketing leads"
  ON public.marketing_leads FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));