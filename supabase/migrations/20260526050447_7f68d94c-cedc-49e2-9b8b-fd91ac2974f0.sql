
CREATE TABLE IF NOT EXISTS public.apex_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Default',
  prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT ARRAY['notarize:write','verify:read']::text[],
  tier text NOT NULL DEFAULT 'free',
  daily_limit integer NOT NULL DEFAULT 1000,
  daily_used integer NOT NULL DEFAULT 0,
  last_reset timestamptz NOT NULL DEFAULT now(),
  revoked boolean NOT NULL DEFAULT false,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.apex_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own api keys" ON public.apex_api_keys
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own api keys" ON public.apex_api_keys
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own api keys" ON public.apex_api_keys
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own api keys" ON public.apex_api_keys
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_apex_api_keys_user ON public.apex_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_apex_api_keys_hash ON public.apex_api_keys(key_hash);
