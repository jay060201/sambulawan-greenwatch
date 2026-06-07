
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS photo_url text;

-- Storage RLS for evaluation-evidence bucket
CREATE POLICY "Authed view evaluation evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'evaluation-evidence');

CREATE POLICY "BHW and admins upload evaluation evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'evaluation-evidence'
  AND (public.has_role(auth.uid(), 'bhw'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "BHW and admins update evaluation evidence"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'evaluation-evidence'
  AND (public.has_role(auth.uid(), 'bhw'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "BHW and admins delete evaluation evidence"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'evaluation-evidence'
  AND (public.has_role(auth.uid(), 'bhw'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);
