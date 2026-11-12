-- 1. Private scheduler token so scheduled jobs can prove they are internal
CREATE TABLE IF NOT EXISTS public.internal_job_tokens (
  name text PRIMARY KEY,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.internal_job_tokens FROM anon, authenticated;
GRANT ALL ON public.internal_job_tokens TO service_role;
ALTER TABLE public.internal_job_tokens ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.internal_job_tokens IS 'Private: scheduler credentials read by pg_cron and server functions only. No client access.';

-- 2. has_role only answers about the caller (server/scheduler contexts may ask about anyone)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
      AND (_user_id = auth.uid() OR coalesce(auth.role(), '') NOT IN ('anon', 'authenticated'))
  )
$function$;

-- 3. API keys: browsers may create a free key and rename/revoke it, never set limits or tiers
CREATE OR REPLACE FUNCTION public.guard_notary_api_key()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(auth.role(), '') NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.user_id := auth.uid();
    NEW.tier := 'free';
    NEW.daily_limit := 100;
    NEW.daily_used := 0;
    NEW.last_reset := now();
    NEW.revoked := false;
    NEW.stripe_subscription_id := NULL;
    IF NEW.api_key_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid key hash'; END IF;
    IF length(coalesce(NEW.name, '')) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'invalid key name'; END IF;
    RETURN NEW;
  END IF;
  NEW.id := OLD.id; NEW.user_id := OLD.user_id; NEW.api_key_hash := OLD.api_key_hash;
  NEW.tier := OLD.tier; NEW.daily_limit := OLD.daily_limit; NEW.daily_used := OLD.daily_used;
  NEW.last_reset := OLD.last_reset; NEW.created_at := OLD.created_at;
  NEW.stripe_subscription_id := OLD.stripe_subscription_id;
  NEW.revoked := OLD.revoked OR NEW.revoked;
  IF length(coalesce(NEW.name, '')) NOT BETWEEN 1 AND 80 THEN NEW.name := OLD.name; END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS guard_notary_api_key ON public.notary_api_keys;
CREATE TRIGGER guard_notary_api_key BEFORE INSERT OR UPDATE ON public.notary_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.guard_notary_api_key();

CREATE OR REPLACE FUNCTION public.guard_apex_api_key()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(auth.role(), '') NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.user_id := auth.uid();
    NEW.tier := 'free';
    NEW.daily_limit := 1000;
    NEW.daily_used := 0;
    NEW.last_reset := now();
    NEW.revoked := false;
    NEW.last_used_at := NULL;
    IF NEW.key_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid key hash'; END IF;
    IF length(coalesce(NEW.name, '')) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'invalid key name'; END IF;
    IF NOT (NEW.scopes <@ ARRAY['notarize:write','verify:read','sync:read','sync:write','ledger:read']::text[]) THEN
      NEW.scopes := ARRAY(SELECT s FROM unnest(NEW.scopes) s WHERE s = ANY (ARRAY['notarize:write','verify:read','sync:read','sync:write','ledger:read']));
    END IF;
    RETURN NEW;
  END IF;
  NEW.id := OLD.id; NEW.user_id := OLD.user_id; NEW.key_hash := OLD.key_hash; NEW.prefix := OLD.prefix;
  NEW.scopes := OLD.scopes; NEW.tier := OLD.tier; NEW.daily_limit := OLD.daily_limit;
  NEW.daily_used := OLD.daily_used; NEW.last_reset := OLD.last_reset;
  NEW.last_used_at := OLD.last_used_at; NEW.created_at := OLD.created_at;
  NEW.revoked := OLD.revoked OR NEW.revoked;
  IF length(coalesce(NEW.name, '')) NOT BETWEEN 1 AND 80 THEN NEW.name := OLD.name; END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS guard_apex_api_key ON public.apex_api_keys;
CREATE TRIGGER guard_apex_api_key BEFORE INSERT OR UPDATE ON public.apex_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.guard_apex_api_key();

-- 4. Retired chatbot tables: no more public writes
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.chat_feedback;
DROP POLICY IF EXISTS "Anyone can insert knowledge gaps" ON public.chat_knowledge_gaps;
REVOKE INSERT ON public.chat_feedback FROM anon, authenticated;
REVOKE INSERT ON public.chat_knowledge_gaps FROM anon, authenticated;

-- 5. Marketing leads are written only by the lead-capture function
DROP POLICY IF EXISTS "Anyone can submit a marketing lead" ON public.marketing_leads;
REVOKE INSERT ON public.marketing_leads FROM anon;

-- 6. Public forms: only well-formed submissions
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback_submissions;
CREATE POLICY "Anyone can submit well-formed feedback" ON public.feedback_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    category IN ('suggestion', 'issue', 'complaint', 'praise')
    AND length(message) BETWEEN 1 AND 2000
    AND (email IS NULL OR (length(email) <= 254 AND email ~* '^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$'))
    AND (page_url IS NULL OR length(page_url) <= 512)
  );

DROP POLICY IF EXISTS "Anyone can insert visits" ON public.site_visits;
CREATE POLICY "Anyone can record a well-formed visit" ON public.site_visits
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(visitor_id) BETWEEN 1 AND 128
    AND length(page_path) BETWEEN 1 AND 512 AND left(page_path, 1) = '/'
    AND (session_id IS NULL OR length(session_id) <= 128)
    AND (referrer IS NULL OR length(referrer) <= 2048)
    AND (user_agent IS NULL OR length(user_agent) <= 1024)
    AND (language IS NULL OR length(language) <= 64)
    AND (landing_page IS NULL OR length(landing_page) <= 2048)
    AND (utm_source IS NULL OR length(utm_source) <= 256)
    AND (utm_medium IS NULL OR length(utm_medium) <= 256)
    AND (utm_campaign IS NULL OR length(utm_campaign) <= 256)
    AND (utm_content IS NULL OR length(utm_content) <= 256)
    AND (utm_term IS NULL OR length(utm_term) <= 256)
    AND country IS NULL AND city IS NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Allow anonymous insert" ON public.assessment_leads;
CREATE POLICY "Anyone can save a well-formed assessment" ON public.assessment_leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(email) <= 254 AND email ~* '^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$'
    AND (company_name IS NULL OR length(company_name) <= 200)
    AND (industry IS NULL OR length(industry) <= 100)
    AND (status IS NULL OR length(status) <= 40)
    AND (score IS NULL OR score BETWEEN 0 AND 100)
    AND (share_id IS NULL OR share_id ~ '^[a-z0-9]{20,40}$')
  );

-- 7. Lattice config is operator-only; silos are visible to admins and assigned members
DROP POLICY IF EXISTS "Authenticated users can read lattice config" ON public.lattice_config;
DROP POLICY IF EXISTS "Authenticated read silos" ON public.industry_silos;
CREATE POLICY "Assigned members read their silos" ON public.industry_silos
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.silo_assignments sa
      WHERE sa.silo_id = industry_silos.id AND sa.user_id = auth.uid() AND sa.is_active
    )
  );