CREATE TYPE public.founding_status AS ENUM ('PENDING','VERIFIED','RESERVED','INSCRIBED','LAPSED');

CREATE TABLE public.founding_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id text NOT NULL UNIQUE,
  display_name text NOT NULL,
  email text NOT NULL,
  witness_line text NOT NULL,
  ack_hash text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  status public.founding_status NOT NULL DEFAULT 'PENDING',
  seat_number integer UNIQUE,
  reserved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.founding_members (
  seat_number integer PRIMARY KEY CHECK (seat_number BETWEEN 1 AND 100),
  display_name text NOT NULL,
  receipt_id text NOT NULL,
  leaf_hash text NOT NULL,
  ack_hash text NOT NULL,
  sealed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.founding_applications TO authenticated;
GRANT ALL ON public.founding_applications TO service_role;
GRANT SELECT ON public.founding_members TO anon;
GRANT SELECT ON public.founding_members TO authenticated;
GRANT ALL ON public.founding_members TO service_role;

ALTER TABLE public.founding_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founding_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants read their own application"
ON public.founding_applications FOR SELECT TO authenticated
USING (lower(email) = lower(coalesce((auth.jwt() ->> 'email'), '')));

CREATE POLICY "Founding wall is public"
ON public.founding_members FOR SELECT TO anon, authenticated
USING (true);

CREATE TRIGGER founding_applications_updated_at
BEFORE UPDATE ON public.founding_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();