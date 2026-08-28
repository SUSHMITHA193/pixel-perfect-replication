import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfile } from "@/lib/account.functions";

export type DbRole = "farmer" | "veterinarian" | "coop_admin" | "authority";
export type Role = "Farmer" | "Veterinarian" | "Cooperative Admin" | "Animal Health Authority";

export const ROLE_LABEL: Record<DbRole, Role> = {
  farmer: "Farmer",
  veterinarian: "Veterinarian",
  coop_admin: "Cooperative Admin",
  authority: "Animal Health Authority",
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  farm_id: string | null;
  cooperative_id: string | null;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  dbRole: DbRole | null;
  role: Role;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dbRole, setDbRole] = useState<DbRole | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (uid: string) => {
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone, farm_id, cooperative_id").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);

    if (!prof || !roles || roles.length === 0) {
      // First sign-in after signup: create profile + role server-side.
      try {
        await ensureProfile();
      } catch (e) {
        console.error("ensureProfile failed", e);
      }
      const [{ data: prof2 }, { data: roles2 }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, phone, farm_id, cooperative_id")
          .eq("id", uid)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      setProfile((prof2 as Profile) ?? null);
      setDbRole((roles2?.[0]?.role as DbRole) ?? null);
      return;
    }

    setProfile(prof as Profile);
    setDbRole(roles[0]!.role as DbRole);
  };

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!active) return;
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED" && event !== "INITIAL_SESSION")
        return;
      setSession(s);
      if (!s?.user) {
        setProfile(null);
        setDbRole(null);
        setLoading(false);
        return;
      }
      setTimeout(() => {
        void load(s.user.id).finally(() => active && setLoading(false));
      }, 0);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (!data.session?.user) setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    profile,
    dbRole,
    role: dbRole ? ROLE_LABEL[dbRole] : "Farmer",
    loading,
    refreshProfile: async () => {
      if (session?.user) await load(session.user.id);
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
      setDbRole(null);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
