
CREATE TABLE public.seo_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  content_md TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'ai-governance',
  published BOOLEAN NOT NULL DEFAULT true,
  indexnow_submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_articles_published ON public.seo_articles(published, created_at DESC);
CREATE INDEX idx_seo_articles_slug ON public.seo_articles(slug);

GRANT SELECT ON public.seo_articles TO anon, authenticated;
GRANT ALL ON public.seo_articles TO service_role;

ALTER TABLE public.seo_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published articles"
  ON public.seo_articles FOR SELECT
  USING (published = true);

CREATE POLICY "Admins can manage articles"
  ON public.seo_articles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_seo_articles_updated_at
  BEFORE UPDATE ON public.seo_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
