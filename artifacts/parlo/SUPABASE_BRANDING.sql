-- ============================================================
-- Parlo — Freelancer branding settings
-- Run this once in your Supabase SQL Editor
-- ============================================================

create table if not exists public.freelancer_settings (
  user_id     uuid primary key,
  display_name text,
  logo_url    text,
  accent_color text default '#d4521a',
  updated_at  timestamptz default now()
);

alter table public.freelancer_settings enable row level security;

-- Anyone can read (client portal needs to load branding without auth)
create policy "Anyone can read freelancer settings"
  on public.freelancer_settings for select
  using (true);

-- Authenticated users can upsert their own settings
create policy "Freelancers manage own settings"
  on public.freelancer_settings for all
  using (true)
  with check (true);
