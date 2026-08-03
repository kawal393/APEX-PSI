CREATE TABLE public.visit_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_number bigint NOT NULL UNIQUE,
  page_path text NOT NULL,
  visitor_hash text NOT NULL,
  prev_hash text NOT NULL,
  entry_hash text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX visit_ledger_seq_desc_idx ON public.visit_ledger (sequence_number DESC);

GRANT SELECT ON public.visit_ledger TO anon;
GRANT SELECT ON public.visit_ledger TO authenticated;
GRANT ALL ON public.visit_ledger TO service_role;

ALTER TABLE public.visit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visit ledger is publicly readable"
ON public.visit_ledger FOR SELECT
USING (true);

CREATE OR REPLACE FUNCTION public.witness_visit(p_page_path text, p_visitor_id text)
RETURNS TABLE(sequence_number bigint, entry_hash text, prev_hash text, visitor_hash text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq bigint;
  v_prev text;
  v_hash text;
  v_vh text;
  v_ts timestamp with time zone := now();
  v_ts_text text;
BEGIN
  IF p_page_path IS NULL OR length(p_page_path) = 0 OR length(p_page_path) > 512 THEN
    RAISE EXCEPTION 'invalid page path';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('apex_visit_ledger'));

  SELECT l.sequence_number, l.entry_hash
    INTO v_seq, v_prev
    FROM public.visit_ledger l
   ORDER BY l.sequence_number DESC
   LIMIT 1;

  IF v_seq IS NULL THEN
    v_seq := 0;
    v_prev := repeat('0', 64);
  END IF;

  v_seq := v_seq + 1;
  v_vh := encode(sha256(convert_to(coalesce(nullif(p_visitor_id, ''), 'anonymous'), 'utf8')), 'hex');
  v_ts_text := to_char(v_ts AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_hash := encode(sha256(convert_to(
    v_seq::text || '|' || v_prev || '|' || p_page_path || '|' || v_vh || '|' || v_ts_text, 'utf8')), 'hex');

  INSERT INTO public.visit_ledger (sequence_number, page_path, visitor_hash, prev_hash, entry_hash, created_at)
  VALUES (v_seq, p_page_path, v_vh, v_prev, v_hash, v_ts);

  RETURN QUERY SELECT v_seq, v_hash, v_prev, v_vh, v_ts;
END;
$$;

GRANT EXECUTE ON FUNCTION public.witness_visit(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.witness_visit(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.visit_ledger_head()
RETURNS TABLE(total_visits bigint, head_hash text, head_sequence bigint, first_entry_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.visit_ledger),
    (SELECT entry_hash FROM public.visit_ledger ORDER BY sequence_number DESC LIMIT 1),
    (SELECT sequence_number FROM public.visit_ledger ORDER BY sequence_number DESC LIMIT 1),
    (SELECT min(created_at) FROM public.visit_ledger);
$$;

GRANT EXECUTE ON FUNCTION public.visit_ledger_head() TO anon;
GRANT EXECUTE ON FUNCTION public.visit_ledger_head() TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.visit_ledger;