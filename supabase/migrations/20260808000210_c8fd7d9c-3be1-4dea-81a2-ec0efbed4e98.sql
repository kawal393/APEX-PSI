CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text CHECK (display_name IS NULL OR char_length(display_name) <= 120),
  avatar_url text CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 2048),
  organisation text CHECK (organisation IS NULL OR char_length(organisation) <= 160),
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE TO authenticated USING (id = auth.uid());
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_compliance_id UUID;
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    coalesce(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.compliance_results (user_id, referral_code)
  VALUES (NEW.id, substr(md5(NEW.id::text), 1, 8))
  RETURNING id INTO new_compliance_id;

  INSERT INTO public.verification_history (user_id, compliance_result_id, article_number, article_title, status) VALUES
    (NEW.id, new_compliance_id, 'Article 12', 'Record-Keeping', 'pending'),
    (NEW.id, new_compliance_id, 'Article 13', 'Transparency', 'pending'),
    (NEW.id, new_compliance_id, 'Article 14', 'Human Oversight', 'pending'),
    (NEW.id, new_compliance_id, 'Article 15', 'Accuracy & Robustness', 'pending');

  RETURN NEW;
END;
$function$;

INSERT INTO public.profiles (id, display_name, avatar_url)
SELECT id,
       coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name'),
       coalesce(raw_user_meta_data ->> 'avatar_url', raw_user_meta_data ->> 'picture')
FROM auth.users
ON CONFLICT (id) DO NOTHING;