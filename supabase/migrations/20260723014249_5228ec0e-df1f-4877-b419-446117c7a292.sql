
-- Tighten storage policies on evaluation-evidence bucket
DROP POLICY IF EXISTS "Authed view evaluation evidence" ON storage.objects;
DROP POLICY IF EXISTS "BHW and admins delete evaluation evidence" ON storage.objects;
DROP POLICY IF EXISTS "BHW and admins update evaluation evidence" ON storage.objects;
DROP POLICY IF EXISTS "BHW and admins upload evaluation evidence" ON storage.objects;
DROP POLICY IF EXISTS evidence_delete ON storage.objects;
DROP POLICY IF EXISTS evidence_insert ON storage.objects;
DROP POLICY IF EXISTS evidence_update ON storage.objects;
DROP POLICY IF EXISTS evidence_view ON storage.objects;

-- Uploads are stored under path `{auth.uid()}/...` so first folder = owner
CREATE POLICY "evidence_insert_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'evaluation-evidence'
  AND (has_role(auth.uid(), 'bhw'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "evidence_select_scoped" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'evaluation-evidence'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'viewer'::app_role)
  )
);

CREATE POLICY "evidence_update_own" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'evaluation-evidence'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'evaluation-evidence'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "evidence_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'evaluation-evidence'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
