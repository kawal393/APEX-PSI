DROP POLICY IF EXISTS "Signed-in users read auditor roster" ON public.tribunal_auditors;
DROP POLICY IF EXISTS "Admins read auditor roster" ON public.tribunal_auditors;
CREATE POLICY "Admins read auditor roster" ON public.tribunal_auditors FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);