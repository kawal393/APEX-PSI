-- 1. Ledger append-only for owners
DROP POLICY IF EXISTS "Users can update own entries" ON public.gallows_ledger;
REVOKE UPDATE, DELETE ON public.gallows_ledger FROM authenticated, anon;

-- 2. Tribunal reviews: remove anon full-row read, expose narrowed public view
DROP POLICY IF EXISTS "Public read review verdicts" ON public.tribunal_reviews;
REVOKE SELECT ON public.tribunal_reviews FROM anon;

CREATE OR REPLACE VIEW public.tribunal_public_verdicts AS
  SELECT commit_id, verdict, created_at
  FROM public.tribunal_reviews;

GRANT SELECT ON public.tribunal_public_verdicts TO anon, authenticated;

-- 3. Public attestations: writes only via service (edge function)
DROP POLICY IF EXISTS "Anyone can submit attestations" ON public.public_attestations;
REVOKE INSERT, UPDATE, DELETE ON public.public_attestations FROM anon, authenticated;
GRANT ALL ON public.public_attestations TO service_role;