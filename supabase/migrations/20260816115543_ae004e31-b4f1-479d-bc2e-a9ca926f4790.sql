-- Narrow public transparency surfaces: keep verifiability, drop user_id / raw WebAuthn blobs.
DROP POLICY IF EXISTS "Public read tribunal auditors" ON public.tribunal_auditors;
DROP POLICY IF EXISTS "Public read for transparency" ON public.foundation_witness_attestations;

CREATE POLICY "Signed-in users read auditor roster"
ON public.tribunal_auditors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Witnesses read their own attestations"
ON public.foundation_witness_attestations FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE VIEW public.public_tribunal_auditors
WITH (security_invoker = off) AS
SELECT id, auditor_name, organization, jurisdiction, status, created_at
FROM public.tribunal_auditors
WHERE status = 'active';

CREATE OR REPLACE VIEW public.public_witness_attestations
WITH (security_invoker = off) AS
SELECT id, action_type, target_ref, credential_id, public_key, signature, notes, created_at
FROM public.foundation_witness_attestations;

REVOKE ALL ON public.tribunal_auditors FROM anon;
REVOKE ALL ON public.foundation_witness_attestations FROM anon;
GRANT SELECT ON public.public_tribunal_auditors TO anon, authenticated;
GRANT SELECT ON public.public_witness_attestations TO anon, authenticated;
GRANT SELECT ON public.tribunal_auditors TO authenticated;
GRANT SELECT, INSERT ON public.foundation_witness_attestations TO authenticated;
GRANT ALL ON public.tribunal_auditors TO service_role;
GRANT ALL ON public.foundation_witness_attestations TO service_role;