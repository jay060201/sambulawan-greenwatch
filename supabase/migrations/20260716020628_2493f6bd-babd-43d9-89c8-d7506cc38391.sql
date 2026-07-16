
ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS follow_up_date date,
  ADD COLUMN IF NOT EXISTS follow_up_completed boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_evaluations_follow_up
  ON public.evaluations (follow_up_date)
  WHERE follow_up_completed = false AND follow_up_date IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_follow_up_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.follow_up_date IS NULL THEN
    IF NEW.compliance_status = 'non_compliant' THEN
      NEW.follow_up_date := (NEW.evaluation_date + INTERVAL '14 days')::date;
    ELSIF NEW.compliance_status = 'partially_compliant' THEN
      NEW.follow_up_date := (NEW.evaluation_date + INTERVAL '30 days')::date;
    ELSE
      NEW.follow_up_date := NULL;
      NEW.follow_up_completed := true;
    END IF;
  END IF;

  -- Mark any prior open follow-ups for this household as completed
  UPDATE public.evaluations
     SET follow_up_completed = true
   WHERE household_id = NEW.household_id
     AND id <> NEW.id
     AND follow_up_completed = false;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_evaluations_follow_up ON public.evaluations;
CREATE TRIGGER trg_evaluations_follow_up
  BEFORE INSERT ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.set_follow_up_date();
