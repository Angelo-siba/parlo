-- Parlo billing and server-side plan enforcement
-- Run this migration in the Supabase SQL Editor before deploying the webhook.

CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lemon_squeezy_subscription_id text UNIQUE NOT NULL,
  store_id bigint,
  order_id bigint,
  customer_id bigint,
  product_id bigint,
  variant_id bigint,
  status text NOT NULL,
  status_formatted text,
  variant_name text,
  product_name text,
  renews_at timestamptz,
  ends_at timestamptz,
  urls jsonb NOT NULL DEFAULT '{}'::jsonb,
  test_mode boolean NOT NULL DEFAULT false,
  provider_created_at timestamptz,
  provider_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_status_idx
  ON public.subscriptions(status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own subscription"
  ON public.subscriptions;
CREATE POLICY "Users can read their own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.subscriptions TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_free_project_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status text;
  subscription_ends_at timestamptz;
  active_projects integer;
  has_pro_access boolean;
BEGIN
  SELECT status, ends_at
    INTO current_status, subscription_ends_at
    FROM public.subscriptions
   WHERE user_id = NEW.user_id;

  has_pro_access :=
    current_status IN ('active', 'on_trial', 'past_due')
    OR (
      current_status = 'cancelled'
      AND (subscription_ends_at IS NULL OR subscription_ends_at > now())
    );

  IF NOT COALESCE(has_pro_access, false) THEN
    SELECT count(*)
      INTO active_projects
      FROM public.projects
     WHERE user_id = NEW.user_id
       AND status = 'active';

    IF active_projects >= 2 THEN
      RAISE EXCEPTION 'FREE_PROJECT_LIMIT_REACHED'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_free_project_limit_on_projects
  ON public.projects;
CREATE TRIGGER enforce_free_project_limit_on_projects
  BEFORE INSERT OR UPDATE OF user_id, status
  ON public.projects
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION public.enforce_free_project_limit();
