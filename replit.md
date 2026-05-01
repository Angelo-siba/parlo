# Parlo — Client portal for freelancers

## Overview

Parlo is a lightweight client portal where freelancers can manage projects, share files with clients, and collect approvals + feedback through a public, no-login link.

## Architecture

- Single React + Vite + TypeScript artifact at `/` (`artifacts/parlo`)
- Tailwind CSS with a custom warm theme (off-white `#f5f0e8`, burnt orange `#d4521a`)
- Routing via `wouter`
- Backend: **Supabase** (Postgres + Storage), accessed directly from the browser via `@supabase/supabase-js`. No custom server.
- No authentication — fully open. Access control on individual project portals is via opaque `share_token` URLs.

## Routes

- `/` — Freelancer dashboard (project list, stats, reminders for pending approvals)
- `/projects/:id` — Project detail (upload files, copy share link, delete files)
- `/client/:token` — Public client portal (view files, approve with timestamp, leave feedback)

## Data

Two Supabase tables: `projects` and `files`. Storage bucket: `parlo-files` (public). Setup SQL is in `artifacts/parlo/SUPABASE_SETUP.md`.

## Reminder system

Pending approvals show up on the dashboard with one-click "Remind {client}" buttons that open the freelancer's email client (mailto:) pre-filled with the project share link. This keeps the app server-less while still giving freelancers a fast nudge workflow.

## Secrets

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon (public) key

## Other artifacts

- `artifacts/api-server` — scaffolded but unused for Parlo (kept from template).
- `artifacts/mockup-sandbox` — design preview server, not part of Parlo.
