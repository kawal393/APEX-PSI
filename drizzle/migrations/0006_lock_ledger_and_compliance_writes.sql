-- Ledger: commits are created only by the server (commit-action / notarize),
-- never by direct client inserts that could choose their own status.
DROP POLICY IF EXISTS "Authenticated users can insert own commits" ON public.gallows_ledger;
REVOKE INSERT ON public.gallows_ledger FROM anon, authenticated;

-- Per-commit control token (stored as SHA-256 only) so the creator of an
-- anonymous engine commit, and nobody else, can challenge and prove it.
ALTER TABLE public.gallows_ledger ADD COLUMN IF NOT EXISTS control_token_hash text;
COMMENT ON COLUMN public.gallows_ledger.control_token_hash IS
  'SHA-256 of the one-time control token returned to the commit creator; required to challenge/prove commits without an owner.';

-- Compliance results: score and status are computed by the server only.
REVOKE INSERT, UPDATE ON public.compliance_results FROM anon, authenticated;
GRANT UPDATE (company_name, trio_mode) ON public.compliance_results TO authenticated;

-- Server-side scoring of the self-assessment questionnaire.
CREATE OR REPLACE FUNCTION public.apply_questionnaire_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_hr integer;
  v_score integer := 0;
  v_bonus integer := 0;
  v_total integer;
  v_status text;
BEGIN
  IF NEW.completed IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_hr
  FROM unnest(coalesce(NEW.high_risk_uses, '{}'::text[])) AS u
  WHERE u <> 'None';

  v_score := v_score + CASE WHEN v_hr = 0 THEN 20 WHEN v_hr = 1 THEN 10 ELSE 0 END;
  v_score := v_score + CASE NEW.automated_decisions WHEN 'no' THEN 15 WHEN 'occasionally' THEN 10 ELSE 5 END;
  v_score := v_score + CASE NEW.governance_policy WHEN 'documented' THEN 20 WHEN 'informal' THEN 10 ELSE 0 END;
  v_score := v_score + CASE NEW.users_informed WHEN 'always' THEN 15 WHEN 'sometimes' THEN 8 ELSE 0 END;
  v_score := v_score + CASE NEW.right_to_explanation WHEN 'fully' THEN 15 WHEN 'partially' THEN 8 ELSE 0 END;
  v_score := v_score + CASE NEW.ai_content_labeled WHEN 'yes' THEN 15 WHEN 'somewhat' THEN 8 ELSE 0 END;

  IF jsonb_typeof(NEW.evidence_hashes) = 'object' THEN
    SELECT count(*) INTO v_bonus FROM jsonb_object_keys(NEW.evidence_hashes);
  END IF;
  v_bonus := LEAST(v_bonus, 5) * 2;

  v_total := LEAST(100, v_score + v_bonus);
  v_status := CASE
    WHEN v_total >= 90 THEN 'compliant'
    WHEN v_total >= 70 THEN 'mostly_compliant'
    WHEN v_total >= 50 THEN 'partially_compliant'
    ELSE 'non_compliant'
  END;

  UPDATE public.compliance_results
  SET overall_score = v_total,
      status = v_status,
      company_name = coalesce(nullif(btrim(NEW.company_name), ''), company_name)
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.apply_questionnaire_score() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS apply_questionnaire_score ON public.questionnaire_responses;
CREATE TRIGGER apply_questionnaire_score
AFTER INSERT OR UPDATE ON public.questionnaire_responses
FOR EACH ROW EXECUTE FUNCTION public.apply_questionnaire_score();