import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type LemonPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    type?: string;
    id?: string;
    attributes?: Record<string, unknown>;
  };
};

const SUBSCRIPTION_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_resumed",
  "subscription_expired",
  "subscription_paused",
  "subscription_unpaused",
  "subscription_plan_changed",
]);

const EVENT_STATUS_FALLBACKS: Record<string, string> = {
  subscription_cancelled: "cancelled",
  subscription_resumed: "active",
  subscription_expired: "expired",
  subscription_paused: "paused",
  subscription_unpaused: "active",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function signatureFor(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function signaturesMatch(expected: string, received: string): boolean {
  const expectedBytes = new TextEncoder().encode(expected.toLowerCase());
  const receivedBytes = new TextEncoder().encode(received.toLowerCase());
  if (expectedBytes.length !== receivedBytes.length) return false;

  let difference = 0;
  for (let i = 0; i < expectedBytes.length; i++) {
    difference |= expectedBytes[i] ^ receivedBytes[i];
  }
  return difference === 0;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const secret = Deno.env.get("LEMON_SQUEEZY_WEBHOOK_SECRET");
  const signature = request.headers.get("X-Signature");
  if (!secret || !signature) {
    return jsonResponse({ error: "Webhook signature is not configured" }, 401);
  }

  const rawBody = await request.text();
  const expectedSignature = await signatureFor(rawBody, secret);
  if (!signaturesMatch(expectedSignature, signature)) {
    return jsonResponse({ error: "Invalid webhook signature" }, 401);
  }

  let payload: LemonPayload;
  try {
    payload = JSON.parse(rawBody) as LemonPayload;
  } catch {
    return jsonResponse({ error: "Invalid JSON payload" }, 400);
  }

  const eventName = payload.meta?.event_name;
  if (!eventName || !SUBSCRIPTION_EVENTS.has(eventName)) {
    return jsonResponse({ received: true, ignored: true });
  }

  const data = payload.data;
  const attributes = data?.attributes ?? {};
  const subscriptionId = data?.id;
  const customUserId = payload.meta?.custom_data?.user_id;
  const userId = typeof customUserId === "string" ? customUserId : "";

  if (data?.type !== "subscriptions" || !subscriptionId || !isUuid(userId)) {
    return jsonResponse({ error: "Missing subscription ID or valid custom user_id" }, 422);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase service configuration is missing" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const status = String(
    attributes.status ?? EVENT_STATUS_FALLBACKS[eventName] ?? "active",
  );
  const row = {
    user_id: userId,
    lemon_squeezy_subscription_id: subscriptionId,
    store_id: (attributes.store_id as number | undefined) ?? null,
    order_id: (attributes.order_id as number | undefined) ?? null,
    customer_id: (attributes.customer_id as number | undefined) ?? null,
    product_id: (attributes.product_id as number | undefined) ?? null,
    variant_id: (attributes.variant_id as number | undefined) ?? null,
    status,
    status_formatted: (attributes.status_formatted as string | undefined) ?? null,
    variant_name: (attributes.variant_name as string | undefined) ?? null,
    product_name: (attributes.product_name as string | undefined) ?? null,
    renews_at: (attributes.renews_at as string | undefined) ?? null,
    ends_at: (attributes.ends_at as string | undefined) ?? null,
    urls: (attributes.urls as Record<string, unknown> | undefined) ?? {},
    test_mode: Boolean(attributes.test_mode),
    provider_created_at: (attributes.created_at as string | undefined) ?? null,
    provider_updated_at: (attributes.updated_at as string | undefined) ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("subscriptions")
    .upsert(row, { onConflict: "user_id" });

  if (error) {
    console.error("subscription_upsert_failed", error.message);
    return jsonResponse({ error: "Could not save subscription" }, 500);
  }

  return jsonResponse({ received: true });
});
