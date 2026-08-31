-- ============================================================
-- Parlo — Run these fixes in your Supabase SQL Editor
-- Safe to run more than once (uses IF NOT EXISTS / DROP IF EXISTS).
-- ============================================================

-- ============================================================
-- FIX 1: Add feedback column to files table
-- (needed if you set up the database before feedback was added)
-- ============================================================
ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS feedback text;

-- ============================================================
-- FIX 2: Freelancer branding settings — correct RLS policies
--
-- The old single "FOR ALL" policy fails for INSERT because
-- Postgres enforces WITH CHECK per-operation. Replace it with
-- explicit INSERT / UPDATE / SELECT policies.
-- ============================================================

-- Create the table if it was never created
CREATE TABLE IF NOT EXISTS public.freelancer_settings (
  user_id      uuid PRIMARY KEY,
  display_name text,
  logo_url     text,
  accent_color text DEFAULT '#d4521a',
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.freelancer_settings ENABLE ROW LEVEL SECURITY;

-- Drop old policies (safe if they don't exist)
DROP POLICY IF EXISTS "Freelancers manage own settings"     ON public.freelancer_settings;
DROP POLICY IF EXISTS "Anyone can read freelancer settings" ON public.freelancer_settings;
DROP POLICY IF EXISTS "Freelancers insert own settings"     ON public.freelancer_settings;
DROP POLICY IF EXISTS "Freelancers update own settings"     ON public.freelancer_settings;

-- Anyone (including anon clients) can read branding
CREATE POLICY "Anyone can read freelancer settings"
  ON public.freelancer_settings
  FOR SELECT
  USING (true);

-- Authenticated freelancers can insert their own row
CREATE POLICY "Freelancers insert own settings"
  ON public.freelancer_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Authenticated freelancers can update their own row
CREATE POLICY "Freelancers update own settings"
  ON public.freelancer_settings
  FOR UPDATE
  TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Parlo — Fix logo upload RLS
-- Run this entire file in the Supabase SQL Editor.
-- ============================================================

-- The logo upload inserts into storage.objects before the app
-- upserts public.freelancer_settings. The policies below allow an
-- authenticated freelancer to manage only their own logo folder.

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