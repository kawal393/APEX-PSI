CREATE TABLE public.public_witness_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_id text NOT NULL,
  title text NOT NULL,
  source_url text NOT NULL,
  content_hash text NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_id, content_hash)
);
GRANT SELECT ON public.public_witness_records TO anon, authenticated;
GRANT ALL ON public.public_witness_records TO service_role;
ALTER TABLE public.public_witness_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Witness records are public" ON public.public_witness_records FOR SELECT USING (true);

CREATE TABLE public.witness_job_state (
  id text PRIMARY KEY,
  locked_until timestamptz,
  paused_reason text,
  last_run_at timestamptz,
  last_result jsonb
);
GRANT ALL ON public.witness_job_state TO service_role;
ALTER TABLE public.witness_job_state ENABLE ROW LEVEL SECURITY;
INSERT INTO public.witness_job_state (id) VALUES ('autonomous-witness');

CREATE OR REPLACE FUNCTION public.acquire_witness_lock(p_seconds int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  UPDATE witness_job_state SET locked_until = now() + make_interval(secs => p_seconds)
  WHERE id = 'autonomous-witness' AND (locked_until IS NULL OR locked_until < now()) AND paused_reason IS NULL
  RETURNING true INTO ok;
  RETURN coalesce(ok, false);
END $$;
REVOKE EXECUTE ON FUNCTION public.acquire_witness_lock(int) FROM PUBLIC, anon, authenticated;