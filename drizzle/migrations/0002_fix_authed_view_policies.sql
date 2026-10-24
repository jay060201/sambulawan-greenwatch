-- Replace tautological USING (true) SELECT policies with role-based predicates.
-- Any user holding an assigned role (admin, bhw, or viewer) keeps read access;
-- users with no role in public.user_roles are no longer able to read records.

DROP POLICY IF EXISTS "All authed view households" ON public.households;
CREATE POLICY "Role-holding users view households"
  ON public.households FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'bhw'::app_role)
    OR public.has_role(auth.uid(), 'viewer'::app_role)
  );

DROP POLICY IF EXISTS "All authed view evaluations" ON public.evaluations;
CREATE POLICY "Role-holding users view evaluations"
  ON public.evaluations FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'bhw'::app_role)
    OR public.has_role(auth.uid(), 'viewer'::app_role)
  );

DROP POLICY IF EXISTS "All authed view results" ON public.evaluation_results;
CREATE POLICY "Role-holding users view results"
  ON public.evaluation_results FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'bhw'::app_role)
    OR public.has_role(auth.uid(), 'viewer'::app_role)
  );
