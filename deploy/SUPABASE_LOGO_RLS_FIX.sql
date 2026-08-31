-- ============================================================
-- Parlo — Fix logo upload RLS
-- Run this entire file in the Supabase SQL Editor.
-- ============================================================

-- The logo upload inserts into storage.objects before the app
-- upserts public.freelancer_settings. The policies below allow
-- authenticated freelancers to manage files in Parlo's storage bucket.
-- The database settings row remains restricted to the user's own user_id.

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;

DROP POLICY IF EXISTS "anon upload parlo-files" ON storage.objects;
DROP POLICY IF EXISTS "authenticated upload parlo-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload parlo-files" ON storage.objects;
DROP POLICY IF EXISTS "authenticated update parlo-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update parlo-files" ON storage.objects;
DROP POLICY IF EXISTS "authenticated delete parlo-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete parlo-files" ON storage.objects;

CREATE POLICY "authenticated upload parlo-files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'parlo-files');

CREATE POLICY "authenticated update parlo-files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'parlo-files')
  WITH CHECK (bucket_id = 'parlo-files');

CREATE POLICY "authenticated delete parlo-files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'parlo-files');