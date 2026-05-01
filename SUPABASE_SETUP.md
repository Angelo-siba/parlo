# Parlo — Supabase setup

Run this once in your Supabase project before using Parlo.

## 1. Create the tables

Open **SQL Editor** in Supabase and run:

```sql
-- Projects
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  client_name   text not null,
  client_email  text not null,
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  share_token   text not null unique
);

-- Files
create table if not exists public.files (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  file_name    text not null,
  file_url     text not null,
  file_size    bigint not null default 0,
  approved     boolean not null default false,
  approved_at  timestamptz,
  feedback     text,
  created_at   timestamptz not null default now()
);

create index if not exists files_project_id_idx on public.files(project_id);
create index if not exists projects_share_token_idx on public.projects(share_token);
```

## 2. Open access (no auth required)

Parlo runs without login, so the anon role needs full access on both tables:

```sql
alter table public.projects enable row level security;
alter table public.files    enable row level security;

create policy "anon read projects"   on public.projects for select to anon using (true);
create policy "anon insert projects" on public.projects for insert to anon with check (true);
create policy "anon update projects" on public.projects for update to anon using (true) with check (true);
create policy "anon delete projects" on public.projects for delete to anon using (true);

create policy "anon read files"   on public.files for select to anon using (true);
create policy "anon insert files" on public.files for insert to anon with check (true);
create policy "anon update files" on public.files for update to anon using (true) with check (true);
create policy "anon delete files" on public.files for delete to anon using (true);
```

## 3. Create the storage bucket

In **Storage**, create a **public** bucket named exactly `parlo-files`.

Then run this SQL to allow uploads/deletes from the anon role:

```sql
create policy "anon upload parlo-files"
  on storage.objects for insert to anon
  with check (bucket_id = 'parlo-files');

create policy "anon read parlo-files"
  on storage.objects for select to anon
  using (bucket_id = 'parlo-files');

create policy "anon delete parlo-files"
  on storage.objects for delete to anon
  using (bucket_id = 'parlo-files');
```

That's it — refresh Parlo and create your first project.
