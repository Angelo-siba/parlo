---
name: GitHub push authentication
description: Non-obvious GitHub authentication behavior for pushing from this workspace
---

When pushing to the GitHub remote from this workspace, a bearer authorization header may be rejected even when the secure token is present. GitHub accepts the same token using basic authentication with `x-access-token` as the username.

**Why:** The repository's stored HTTPS credential and bearer-form header both returned invalid credentials during a push, while the basic `x-access-token` form succeeded.

**How to apply:** Keep the token in the secure workspace secret and use Git's `http.extraheader` with a base64-encoded `x-access-token:<token>` value. Never print the header or token.