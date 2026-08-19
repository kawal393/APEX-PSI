-- 1. Rebuild the narrowed public view (no user_id), adding the columns public pages need.
DROP VIEW IF EXISTS public.gallows_public_ledger;

CREATE VIEW public.gallows_public_ledger
WITH (security_invoker = off) AS
SELECT
  id, commit_id, action, predicate_id, phase, status,
  commit_hash, merkle_leaf_hash, challenge_hash, proof_hash,
  merkle_root, merkle_proof, violation_found, verification_time_ms,
  challenged_at, proven_at, created_at, sequence_number,
  ed25519_signature, pq_signature, pq_algorithm,
  tribunal_votes_approve, tribunal_votes_reject,
  ratification_hash, ratified_at
FROM public.gallows_ledger;

GRANT SELECT ON public.gallows_public_ledger TO anon, authenticated;
GRANT ALL ON public.gallows_public_ledger TO service_role;

-- 2. Remove the blanket public read on the base table.
DROP POLICY IF EXISTS "Public read access for transparency" ON public.gallows_ledger;

REVOKE SELECT ON public.gallows_ledger FROM anon;

-- 3. Owners and admins keep direct access to the base table.
DROP POLICY IF EXISTS "Owners can read own ledger entries" ON public.gallows_ledger;
CREATE POLICY "Owners can read own ledger entries"
ON public.gallows_ledger FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all ledger entries" ON public.gallows_ledger;
CREATE POLICY "Admins can read all ledger entries"
ON public.gallows_ledger FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.gallows_ledger TO authenticated;
GRANT ALL ON public.gallows_ledger TO service_role;