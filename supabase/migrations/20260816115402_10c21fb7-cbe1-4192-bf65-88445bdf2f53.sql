-- 1. Chat data: remove client-spoofable header-based access.
DROP POLICY IF EXISTS "Visitors can read own conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Visitors can update own conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can read own conversation messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own conversation messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can insert conversations" ON public.chat_conversations;

CREATE POLICY "Signed-in users read their own conversations"
ON public.chat_conversations FOR SELECT TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Signed-in users read their own conversation messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (conversation_id IN (
  SELECT cc.id FROM public.chat_conversations cc
  WHERE cc.user_id IS NOT NULL AND cc.user_id = auth.uid()
));

REVOKE ALL ON public.chat_conversations FROM anon;
REVOKE ALL ON public.chat_messages FROM anon;
GRANT SELECT ON public.chat_conversations TO authenticated;
GRANT SELECT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_conversations TO service_role;
GRANT ALL ON public.chat_messages TO service_role;

-- 2. Supplier directory: stop exposing contact_email publicly.
DROP POLICY IF EXISTS "Active supplier listings are public" ON public.verified_suppliers;

CREATE OR REPLACE VIEW public.public_supplier_directory
WITH (security_invoker = off) AS
SELECT id, domain, display_name, status, created_at
FROM public.verified_suppliers
WHERE status = 'active';

REVOKE ALL ON public.verified_suppliers FROM anon;
GRANT SELECT ON public.public_supplier_directory TO anon, authenticated;
GRANT ALL ON public.verified_suppliers TO service_role;