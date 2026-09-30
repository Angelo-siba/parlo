---
name: Freelancer greeting name
description: Persistence boundary for the freelancer's personal dashboard greeting.
---

The freelancer's preferred greeting name belongs in Supabase Auth user metadata, separate from the `freelancer_settings.display_name` business name used in client portals.

First-run onboarding dismissal and completed portal-sharing actions also belong in Auth user metadata, with browser-local persistence as a fallback; they are private account state, not client-facing settings.

**Why:** The greeting is personal and should persist across devices without requiring a database schema migration or changing the business identity shown to clients.

**How to apply:** Read and update the `preferred_name` Auth metadata field through the authenticated Supabase client. Prompt only when it is absent, and keep the prompt dismissible.