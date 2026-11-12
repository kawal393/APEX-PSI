-- Replace the unrestricted table read with a bounded, column-explicit public reader.
DROP POLICY IF EXISTS "Contradiction records are public" ON public.witness_contradictions;
REVOKE SELECT ON public.witness_contradictions FROM anon, authenticated;
GRANT ALL ON public.witness_contradictions TO service_role;

CREATE OR REPLACE FUNCTION public.recent_witness_contradictions(p_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  source text,
  source_id text,
  earlier_hash text,
  later_hash text,
  earlier_observed_at timestamptz,
  later_observed_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.source, c.source_id, c.earlier_hash, c.later_hash,
         c.earlier_observed_at, c.later_observed_at, c.created_at
  FROM public.witness_contradictions c
  ORDER BY c.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 50)
$$;

REVOKE EXECUTE ON FUNCTION public.recent_witness_contradictions(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recent_witness_contradictions(integer) TO anon, authenticated, service_role;