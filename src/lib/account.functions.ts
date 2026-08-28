import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RoleSchema = z.enum(["farmer", "veterinarian", "coop_admin", "authority"]);

/**
 * Creates the profile + role row for a freshly signed-up user.
 * Role assignment happens server-side with the service role so a client can
 * never grant itself a role it did not sign up with, and can never overwrite
 * an existing role.
 */
export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, farm_id, cooperative_id")
      .eq("id", userId)
      .maybeSingle();

    const { data: existingRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (existingProfile && existingRoles && existingRoles.length > 0) {
      return { created: false, role: existingRoles[0]!.role };
    }

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(userId);
    const meta = (userRes?.user?.user_metadata ?? {}) as Record<string, unknown>;
    const parsedRole = RoleSchema.safeParse(meta["role"]);
    const role = parsedRole.success ? parsedRole.data : "farmer";

    const { data: coop } = await supabaseAdmin.from("cooperatives").select("id").limit(1).maybeSingle();
    const { data: farms } = await supabaseAdmin.from("farms").select("id").order("name");

    const farmId =
      existingProfile?.farm_id ?? (role === "farmer" ? (farms?.[0]?.id ?? null) : null);

    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: typeof meta["full_name"] === "string" ? (meta["full_name"] as string) : null,
      phone: typeof meta["phone"] === "string" ? (meta["phone"] as string) : (userRes?.user?.phone ?? null),
      farm_id: farmId,
      cooperative_id: coop?.id ?? null,
    });

    if (!existingRoles || existingRoles.length === 0) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
    }

    // Demo convenience: veterinarians are assigned to every farm in the cooperative.
    if (role === "veterinarian" && farms && farms.length > 0) {
      await supabaseAdmin
        .from("vet_farm_assignments")
        .upsert(
          farms.map((f) => ({ vet_id: userId, farm_id: f.id })),
          { onConflict: "vet_id,farm_id" },
        );
    }

    return { created: true, role };
  });
