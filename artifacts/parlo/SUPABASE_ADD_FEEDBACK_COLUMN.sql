-- ============================================================
-- Parlo — Add feedback column to files table
-- Run this if you set up Supabase before feedback was added.
-- Safe to run more than once (IF NOT EXISTS).
-- ============================================================

ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS feedback text;
