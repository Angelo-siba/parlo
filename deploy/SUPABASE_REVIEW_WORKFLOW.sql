-- ============================================================
-- Parlo — Review workflow, reminders, and file versioning
-- Run this in the Supabase SQL Editor before using these features.
-- Safe to run once; the guards make it safe to re-run.
-- ============================================================

ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS review_status text;

UPDATE public.files
SET review_status = CASE
  WHEN approved = true THEN 'approved'
  WHEN feedback IS NOT NULL AND btrim(feedback) <> '' THEN 'changes_requested'
  ELSE 'pending'
END
WHERE review_status IS NULL;

ALTER TABLE public.files
  ALTER COLUMN review_status SET DEFAULT 'pending';

ALTER TABLE public.files
  ALTER COLUMN review_status SET NOT NULL;

ALTER TABLE public.files
  DROP CONSTRAINT IF EXISTS files_review_status_check;

ALTER TABLE public.files
  ADD CONSTRAINT files_review_status_check
  CHECK (review_status IN ('pending', 'changes_requested', 'approved'));

ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS version_group_id uuid;

UPDATE public.files
SET version_group_id = id
WHERE version_group_id IS NULL;

ALTER TABLE public.files
  ALTER COLUMN version_group_id SET DEFAULT gen_random_uuid();

ALTER TABLE public.files
  ALTER COLUMN version_group_id SET NOT NULL;

ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS version_number integer;

UPDATE public.files
SET version_number = 1
WHERE version_number IS NULL;

ALTER TABLE public.files
  ALTER COLUMN version_number SET DEFAULT 1;

ALTER TABLE public.files
  ALTER COLUMN version_number SET NOT NULL;

ALTER TABLE public.files
  DROP CONSTRAINT IF EXISTS files_version_number_check;

ALTER TABLE public.files
  ADD CONSTRAINT files_version_number_check
  CHECK (version_number > 0);

CREATE INDEX IF NOT EXISTS files_version_group_idx
  ON public.files(version_group_id, version_number DESC);

ALTER TABLE public.activity_log
  DROP CONSTRAINT IF EXISTS activity_log_event_type_check;

ALTER TABLE public.activity_log
  ADD CONSTRAINT activity_log_event_type_check
  CHECK (event_type IN (
    'file_uploaded',
    'file_version_uploaded',
    'file_deleted',
    'file_approved',
    'feedback_submitted',
    'changes_requested',
    'client_reminder_sent'
  ));