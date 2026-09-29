-- ============================================================
-- Parlo — Private freelancer calendar events
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete cascade,
  title        text not null,
  description  text,
  event_type   text not null default 'task'
               check (event_type in ('deadline', 'meeting', 'task', 'reminder')),
  event_date   date not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS calendar_events_user_date_idx
  ON public.calendar_events(user_id, event_date);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Freelancers manage own calendar events"
  ON public.calendar_events;

CREATE POLICY "Freelancers manage own calendar events"
  ON public.calendar_events
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (
      project_id IS NULL
      OR project_id IN (
        SELECT id FROM public.projects WHERE user_id = auth.uid()
      )
    )
  );

CREATE OR REPLACE FUNCTION public.set_calendar_event_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calendar_events_set_updated_at
  ON public.calendar_events;

CREATE TRIGGER calendar_events_set_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_calendar_event_updated_at();