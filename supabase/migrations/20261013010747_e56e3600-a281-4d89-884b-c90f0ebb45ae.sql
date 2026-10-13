CREATE SEQUENCE IF NOT EXISTS public.pq_lms_counter START WITH 5920 MINVALUE 0;
CREATE OR REPLACE FUNCTION public.next_lms_slot(p_count integer DEFAULT 1)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE first bigint; i integer;
BEGIN
  IF p_count < 1 OR p_count > 500 THEN RAISE EXCEPTION 'invalid count'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('apex_pq_lms_counter'));
  first := nextval('public.pq_lms_counter');
  FOR i IN 2..p_count LOOP PERFORM nextval('public.pq_lms_counter'); END LOOP;
  RETURN first;
END $$;
REVOKE ALL ON FUNCTION public.next_lms_slot(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_lms_slot(integer) TO service_role;
REVOKE ALL ON SEQUENCE public.pq_lms_counter FROM PUBLIC, anon, authenticated;