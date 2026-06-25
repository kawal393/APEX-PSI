
CREATE TABLE public.foundation_witness_attestations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  target_ref TEXT NOT NULL,
  credential_id TEXT NOT NULL,
  public_key TEXT,
  signature TEXT NOT NULL,
  client_data_json TEXT,
  authenticator_data TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_witness_action ON public.foundation_witness_attestations (action_type, created_at DESC);
CREATE INDEX idx_witness_credential ON public.foundation_witness_attestations (credential_id);

GRANT SELECT ON public.foundation_witness_attestations TO anon;
GRANT SELECT, INSERT ON public.foundation_witness_attestations TO authenticated;
GRANT ALL ON public.foundation_witness_attestations TO service_role;

ALTER TABLE public.foundation_witness_attestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for transparency"
  ON public.foundation_witness_attestations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users record their own witness"
  ON public.foundation_witness_attestations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
