CREATE TABLE public.notary_public_usage (
  visitor_digest text NOT NULL,
  usage_day date NOT NULL,
  receipts_used integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  window_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (visitor_digest, usage_day),
  CONSTRAINT notary_public_usage_nonnegative CHECK (receipts_used >= 0 AND window_used >= 0)
);
GRANT ALL ON public.notary_public_usage TO service_role;
ALTER TABLE public.notary_public_usage ENABLE ROW LEVEL SECURITY;
-- Only service functions may access the usage counters; there are no visitor-facing policies.
CREATE TRIGGER update_notary_public_usage_updated_at BEFORE UPDATE ON public.notary_public_usage FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.reserve_public_notary_quota(
  p_visitor_digest text,
  p_count integer,
  p_daily_limit integer DEFAULT 100,
  p_minute_limit integer DEFAULT 20
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_day date := (now() AT TIME ZONE 'UTC')::date;
  v_row public.notary_public_usage%ROWTYPE;
BEGIN
  IF p_visitor_digest !~ '^[a-f0-9]{64}$' OR p_count < 1 OR
     p_count > p_minute_limit OR p_daily_limit < 1 OR p_minute_limit < 1 THEN
    RETURN false;
  END IF;
  INSERT INTO public.notary_public_usage(visitor_digest, usage_day)
  VALUES (p_visitor_digest, v_day)
  ON CONFLICT DO NOTHING;
  SELECT * INTO v_row FROM public.notary_public_usage
  WHERE visitor_digest = p_visitor_digest AND usage_day = v_day FOR UPDATE;
  IF v_row.receipts_used + p_count > p_daily_limit OR
     (v_row.window_start > now() - interval '1 minute' AND
      v_row.window_used + p_count > p_minute_limit) THEN
    RETURN false;
  END IF;
  UPDATE public.notary_public_usage SET
    receipts_used = receipts_used + p_count,
    window_start = CASE WHEN window_start <= now() - interval '1 minute' THEN now() ELSE window_start END,
    window_used = CASE WHEN window_start <= now() - interval '1 minute' THEN p_count ELSE window_used + p_count END
  WHERE visitor_digest = p_visitor_digest AND usage_day = v_day;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_public_notary_quota(text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_public_notary_quota(text, integer, integer, integer) TO service_role;