-- ============================================================
-- Parlo — Fix Storage Policies for Authenticated Users
-- Run this in your Supabase SQL Editor
--
-- The original setup only allowed anon uploads. Now that
-- Parlo uses authentication, the storage bucket also needs
-- policies for the authenticated role.
-- ============================================================

-- Drop the old anon-only policies
DROP POLICY IF EXISTS "anon upload parlo-files"  ON storage.objects;
DROP POLICY IF EXISTS "anon read parlo-files"    ON storage.objects;
DROP POLICY IF EXISTS "anon delete parlo-files"  ON storage.objects;

-- Allow both anon (clients) and authenticated (freelancers) to read files
CREATE POLICY "read parlo-files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'parlo-files');

-- Allow authenticated freelancers to upload files
CREATE POLICY "authenticated upload parlo-files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'parlo-files');

-- Allow authenticated freelancers to delete files
CREATE POLICY "authenticated delete parlo-files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'parlo-files');

-- ============================================================
-- Also make sure the files and projects tables allow
-- authenticated operations (in case SUPABASE_RLS.sql
-- wasn't run yet — this is safe to run more than once)
-- ============================================================

-- Projects: authenticated freelancers manage their own
DROP POLICY IF EXISTS "Freelancers manage own projects" ON projects;
CREATE POLICY "Freelancers manage own projects"
  ON projects FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Files: authenticated freelancers manage files for their own projects
DROP POLICY IF EXISTS "Freelancers manage own files" ON files;
CREATE POLICY "Freelancers manage own files"
  ON files FOR ALL
  TO authenticated
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );
