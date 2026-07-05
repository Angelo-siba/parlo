-- ============================================================
-- Parlo — Invoices & PayPal payment table
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  invoice_number text not null,
  line_items     jsonb not null default '[]'::jsonb,
  total_amount   numeric not null default 0,
  due_date       date not null,
  paypal_email   text not null,
  status         text not null default 'draft' check (status in ('draft', 'sent', 'paid')),
  created_at     timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS invoices_project_id_idx ON public.invoices(project_id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Freelancers (authenticated) manage invoices for their own projects
DROP POLICY IF EXISTS "Freelancers manage own invoices" ON public.invoices;
CREATE POLICY "Freelancers manage own invoices"
  ON public.invoices FOR ALL
  TO authenticated
  USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Clients (anon, via share link) can read non-draft invoices
DROP POLICY IF EXISTS "Clients read invoices" ON public.invoices;
CREATE POLICY "Clients read invoices"
  ON public.invoices FOR SELECT
  TO anon
  USING (status <> 'draft');

-- Clients (anon) can mark an invoice as paid after clicking Pay Now
DROP POLICY IF EXISTS "Clients mark invoice paid" ON public.invoices;
CREATE POLICY "Clients mark invoice paid"
  ON public.invoices FOR UPDATE
  TO anon
  USING (status = 'sent')
  WITH CHECK (status = 'paid');

-- That's it — refresh Parlo and you can create invoices from a project page.
