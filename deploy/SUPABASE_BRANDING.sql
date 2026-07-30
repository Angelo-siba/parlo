-- ============================================================
-- Parlo — Freelancer branding settings
-- Run this once in your Supabase SQL Editor.
-- Safe to re-run (IF NOT EXISTS / DROP IF EXISTS).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.freelancer_settings (
  user_id      uuid PRIMARY KEY,
  display_name text,
  logo_url     text,
  accent_color text DEFAULT '#d4521a',
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.freelancer_settings ENABLE ROW LEVEL SECURITY;

-- Drop old policies before recreating
DROP POLICY IF EXISTS "Freelancers manage own settings"      ON public.freelancer_settings;
DROP POLICY IF EXISTS "Anyone can read freelancer settings"  ON public.freelancer_settings;
DROP POLICY IF EXISTS "Freelancers insert own settings"      ON public.freelancer_settings;
DROP POLICY IF EXISTS "Freelancers update own settings"      ON public.freelancer_settings;

-- Anyone (including anon clients) can read branding for the client portal
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
