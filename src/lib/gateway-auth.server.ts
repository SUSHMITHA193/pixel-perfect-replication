// Server-only helpers for IoT gateway API keys.
// Keys are only ever stored as SHA-256 hashes; the plaintext is shown once at creation.

export async function hashApiKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateApiKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `mg_live_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export type GatewayKeyRecord = { id: string; name: string };

/** Returns the matching active key record, or null when the key is unknown/inactive. */
export async function verifyGatewayKey(rawKey: string | null): Promise<GatewayKeyRecord | null> {
  if (!rawKey || rawKey.length < 16) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const key_hash = await hashApiKey(rawKey);
  const { data } = await supabaseAdmin
    .from("gateway_api_keys")
    .select("id, name, active")
    .eq("key_hash", key_hash)
    .maybeSingle();
  if (!data || !data.active) return null;
  return { id: data.id, name: data.name };
}
