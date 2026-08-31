-- ============================================================
-- Parlo — Fix logo upload RLS
-- Run this entire file in the Supabase SQL Editor.
-- ============================================================

-- The logo upload inserts into storage.objects before the app
-- upserts public.freelancer_settings. The policies below allow an
-- authenticated freelancer to manage only their own logo folder.

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
  WITH CHECK (
    bucket_id = 'parlo-files'
    AND name LIKE 'settings/' || auth.uid()::text || '/%'
  );

CREATE POLICY "authenticated update parlo-files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'parlo-files'
    AND name LIKE 'settings/' || auth.uid()::text || '/%'
  )
  WITH CHECK (
    bucket_id = 'parlo-files'
    AND name LIKE 'settings/' || auth.uid()::text || '/%'
  );

CREATE POLICY "authenticated delete parlo-files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'parlo-files'
    AND name LIKE 'settings/' || auth.uid()::text || '/%'
  );