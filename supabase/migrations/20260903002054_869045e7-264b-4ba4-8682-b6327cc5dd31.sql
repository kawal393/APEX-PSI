ALTER SEQUENCE public.gallows_sequence_counter RENAME TO engine_sequence_counter;
ALTER FUNCTION public.assign_gallows_sequence() RENAME TO assign_engine_sequence;
CREATE OR REPLACE FUNCTION public.assign_engine_sequence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sequence_number IS NULL THEN
    NEW.sequence_number := nextval('engine_sequence_counter');
  END IF;
  RETURN NEW;
END;
$$;
ALTER TRIGGER gallows_auto_sequence ON public.gallows_ledger RENAME TO engine_auto_sequence;