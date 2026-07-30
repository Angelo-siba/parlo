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
DROP POLICY IF EXISTS "Freelancers manage own settings" ON public.freelancer_settings;
DROP POLICY IF EXISTS "Anyone can read freelancer settings" ON public.freelancer_settings;

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
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- FIX 3: Storage — allow authenticated users to upload logos
-- (needed if you only ran the anon storage policies before)
-- ============================================================
DO $$
BEGIN
  -- Insert policy for authenticated users uploading to settings/
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Authenticated upload parlo-files'
  ) THEN
    CREATE POLICY "Authenticated upload parlo-files"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'parlo-files');
  END IF;
END $$;
