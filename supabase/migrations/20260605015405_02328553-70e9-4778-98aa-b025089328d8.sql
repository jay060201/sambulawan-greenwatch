
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','bhw','viewer');
CREATE TYPE public.compliance_status AS ENUM ('compliant','partially_compliant','non_compliant');
CREATE TYPE public.item_status AS ENUM ('compliant','partially_compliant','non_compliant');
CREATE TYPE public.checklist_category AS ENUM ('waste_segregation','sanitation','gardening','ordinance');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles policies
CREATE POLICY "Anyone authed can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins manage profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "View own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- HOUSEHOLDS
CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_number TEXT UNIQUE NOT NULL,
  head_of_family TEXT NOT NULL,
  purok TEXT NOT NULL,
  address TEXT NOT NULL,
  contact_number TEXT,
  total_members INT NOT NULL DEFAULT 1,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authed view households" ON public.households
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage households" ON public.households
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "BHW insert households" ON public.households
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'bhw'));

-- COMPLIANCE CHECKLIST
CREATE TABLE public.compliance_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.checklist_category NOT NULL,
  item_name TEXT NOT NULL,
  points INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.compliance_checklist TO authenticated;
GRANT ALL ON public.compliance_checklist TO service_role;
ALTER TABLE public.compliance_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authed view checklist" ON public.compliance_checklist
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage checklist" ON public.compliance_checklist
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- EVALUATIONS
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_score INT NOT NULL DEFAULT 0,
  max_score INT NOT NULL DEFAULT 0,
  compliance_status public.compliance_status NOT NULL DEFAULT 'non_compliant',
  remarks TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluations TO authenticated;
GRANT ALL ON public.evaluations TO service_role;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authed view evaluations" ON public.evaluations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "BHW create evaluations" ON public.evaluations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'bhw') AND evaluator_id = auth.uid());
CREATE POLICY "BHW update own evaluations" ON public.evaluations
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'bhw') AND evaluator_id = auth.uid() AND approved = false);
CREATE POLICY "Admins manage evaluations" ON public.evaluations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX evaluations_household_idx ON public.evaluations(household_id);
CREATE INDEX evaluations_evaluator_idx ON public.evaluations(evaluator_id);
CREATE INDEX evaluations_date_idx ON public.evaluations(evaluation_date);

-- EVALUATION RESULTS
CREATE TABLE public.evaluation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES public.compliance_checklist(id) ON DELETE CASCADE,
  status public.item_status NOT NULL,
  score INT NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluation_results TO authenticated;
GRANT ALL ON public.evaluation_results TO service_role;
ALTER TABLE public.evaluation_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authed view results" ON public.evaluation_results
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "BHW manage own results" ON public.evaluation_results
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.evaluations e
      WHERE e.id = evaluation_id AND e.evaluator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.evaluations e
      WHERE e.id = evaluation_id AND e.evaluator_id = auth.uid()
    )
  );
CREATE POLICY "Admins manage results" ON public.evaluation_results
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX results_evaluation_idx ON public.evaluation_results(evaluation_id);

-- AUTO PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1) || '_' || substring(NEW.id::text,1,4))
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SEED CHECKLIST
INSERT INTO public.compliance_checklist (category, item_name, points, sort_order) VALUES
  ('waste_segregation','Has Segregator',5,1),
  ('waste_segregation','Has Separate Waste Bins',5,2),
  ('waste_segregation','Waste Properly Segregated and Labelled',5,3),
  ('waste_segregation','No Open Burning of Waste Observed',5,4),
  ('waste_segregation','Composting Practiced',5,5),
  ('waste_segregation','Recycling Practices Observed',5,6),
  ('sanitation','Clean Household Surroundings',5,1),
  ('sanitation','Functional Toilet',5,2),
  ('sanitation','Proper Drainage',5,3),
  ('sanitation','No Standing Water',5,4),
  ('sanitation','Proper Wastewater Disposal',5,5),
  ('gardening','Has Vegetable Garden',5,1),
  ('gardening','Maintains Garden Regularly',5,2),
  ('gardening','Uses Organic Practices',5,3),
  ('ordinance','Follows Barangay Regulations',5,1),
  ('ordinance','Participates in Clean-Up Activities',5,2),
  ('ordinance','No Recorded Violations',5,3);
