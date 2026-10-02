REVOKE EXECUTE ON FUNCTION public.reserve_public_notary_quota(text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_public_notary_quota(text, integer, integer, integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.acquire_witness_lock(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_witness_lock(integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_engine_sequence() FROM PUBLIC, anon, authenticated;
CREATE POLICY "No direct access to witness job state" ON public.witness_job_state FOR SELECT TO authenticated USING (false);

CREATE TABLE public.witness_contradictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_id text NOT NULL,
  earlier_hash text NOT NULL,
  later_hash text NOT NULL,
  earlier_observed_at timestamptz NOT NULL,
  later_observed_at timestamptz NOT NULL,
  contradiction_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.witness_contradictions TO anon, authenticated;
GRANT ALL ON public.witness_contradictions TO service_role;
ALTER TABLE public.witness_contradictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contradiction records are public" ON public.witness_contradictions FOR SELECT USING (true);