-- Parlo — private freelancer notebook notes
-- Run once in the Supabase SQL Editor before using the Notebook tab.

CREATE TABLE IF NOT EXISTS public.notebook_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'Untitled note'
              check (char_length(title) <= 120),
  content     text not null default ''
              check (char_length(content) <= 50000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS notebook_notes_user_updated_idx
  ON public.notebook_notes(user_id, updated_at DESC);

ALTER TABLE public.notebook_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Freelancers manage own notebook notes"
  ON public.notebook_notes;

CREATE POLICY "Freelancers manage own notebook notes"
  ON public.notebook_notes
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.notebook_notes
  TO authenticated;

CREATE OR REPLACE FUNCTION public.set_notebook_note_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notebook_notes_set_updated_at
  ON public.notebook_notes;

CREATE TRIGGER notebook_notes_set_updated_at
  BEFORE UPDATE ON public.notebook_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_notebook_note_updated_at();