DROP POLICY "Anyone authed can view profiles" ON public.profiles;
CREATE POLICY "Users view own profile, admins view all" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
