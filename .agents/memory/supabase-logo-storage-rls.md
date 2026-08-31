---
name: Supabase logo storage RLS
description: Durable constraints for Parlo logo uploads through Supabase Storage.
---

Parlo logo uploads require authenticated policies on `storage.objects`; project users
cannot run owner-only `ALTER TABLE` or `GRANT` statements against that managed table.
Using a unique object path with `upsert: false` avoids requiring an UPDATE policy for
replacement uploads.

**Why:** Supabase Storage owns its managed objects table, and overwrite requests can
trigger additional RLS checks that make otherwise valid logo uploads fail.

**How to apply:** Keep the app's session verification and authenticated storage INSERT
policy in place. Use the supported policy SQL only, and prefer unique upload paths when
the project does not need object overwrites.