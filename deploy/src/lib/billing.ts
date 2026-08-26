export const LEMON_SQUEEZY_CHECKOUT_URL =
  "https://parlo-app.lemonsqueezy.com/checkout/buy/786e5bea-0f95-4612-921a-e33fbd58cde1";

export const FREE_PROJECT_LIMIT = 2;

/**
 * Lemon Squeezy entitlement sync can populate one of these Supabase user metadata fields.
 * Until then, new accounts remain on the free plan by default.
 */
type UserWithMetadata = { user_metadata?: Record<string, unknown> } | null;

export function isProUser(user: UserWithMetadata): boolean {
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;

  return (
    metadata?.plan === "pro" ||
    metadata?.tier === "pro" ||
    metadata?.subscription_status === "active" ||
    metadata?.is_pro === true
  );
}
