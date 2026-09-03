# Lemon Squeezy billing setup

This change adds secure Pro entitlements, but the migration and Edge Function must be deployed to the Supabase project. No secret is stored in GitHub.

## 1. Apply the database migration

Run SUPABASE_BILLING.sql in the Supabase SQL Editor. It creates the subscription record, restricts reads to the matching user, and adds a database trigger that blocks a third active project for free users.

## 2. Deploy the webhook

From the repository root, with the Supabase CLI linked to the Parlo project:

~~~sh
supabase functions deploy lemon-squeezy-webhook --no-verify-jwt
supabase secrets set LEMON_SQUEEZY_TEST_WEBHOOK_SECRET="<the test webhook signing secret>"
supabase secrets set LEMON_SQUEEZY_WEBHOOK_SECRET="<the live webhook signing secret>"
~~~

The endpoint is:

~~~text
https://<supabase-project-ref>.supabase.co/functions/v1/lemon-squeezy-webhook
~~~

Keep the signing secret in Supabase secrets only. Do not commit it or paste it into chat.

## 3. Configure Lemon Squeezy

In Lemon Squeezy, create a webhook for the endpoint above, set the same signing secret, and subscribe to these events:

- subscription_created
- subscription_updated
- subscription_cancelled
- subscription_resumed
- subscription_expired
- subscription_paused
- subscription_unpaused
- subscription_plan_changed

Authenticated dashboard checkout links now include checkout[custom][user_id]. The webhook uses that value to attach the subscription to the correct Supabase user.

## 4. Test

Use Lemon Squeezy’s test mode webhook simulator. Confirm a row appears in public.subscriptions, then confirm that the user can create more than two active projects. Simulate cancellation/expiration and confirm the database trigger blocks new active projects again.
