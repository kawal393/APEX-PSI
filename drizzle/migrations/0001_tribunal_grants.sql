GRANT SELECT, INSERT, UPDATE, DELETE ON public.tribunal_auditors TO authenticated;
GRANT SELECT, INSERT ON public.tribunal_reviews TO authenticated;
GRANT ALL ON public.tribunal_auditors TO service_role;
GRANT ALL ON public.tribunal_reviews TO service_role;