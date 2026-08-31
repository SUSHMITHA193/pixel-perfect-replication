import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: { rpc: (fn: string, args: unknown) => Promise<{ data: unknown }> }, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "coop_admin" });
  if (data !== true) throw new Error("Forbidden: cooperative admins only");
}

/** Lists issued gateway keys (never the plaintext). */
export const listGatewayKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("gateway_api_keys")
      .select("id, name, active, created_at")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

/** Issues a new key and returns the plaintext exactly once. */
export const createGatewayKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string }) => z.object({ name: z.string().min(2).max(60) }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { generateApiKey, hashApiKey } = await import("@/lib/gateway-auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const key = generateApiKey();
    const { data: row, error } = await supabaseAdmin
      .from("gateway_api_keys")
      .insert({ name: data.name, key_hash: await hashApiKey(key) })
      .select("id, name, created_at")
      .single();
    if (error || !row) throw new Error("Could not create gateway key");

    await supabaseAdmin.from("audit_log").insert({
      actor_id: context.userId,
      entity: "gateway_api_keys",
      entity_id: row.id,
      action: "create",
      detail: { name: data.name },
    });

    return { ...row, key };
  });

/** Deactivates a key so collars using it stop being accepted. */
export const revokeGatewayKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("gateway_api_keys").update({ active: false }).eq("id", data.id);
    await supabaseAdmin.from("audit_log").insert({
      actor_id: context.userId,
      entity: "gateway_api_keys",
      entity_id: data.id,
      action: "revoke",
      detail: {},
    });
    return { ok: true };
  });
