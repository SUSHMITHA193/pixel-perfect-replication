import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Role } from "@/lib/auth";
import type { Animal, PredictionResponse, RiskCategory, RiskFactor, ForecastPoint } from "./mock-data";

export type { Role };
export type DataSource = "mock" | "live";

export type Farm = {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  cooperative_id: string;
};

export type LabRecord = {
  id: string;
  animal_id: string;
  type: "SCC lab result" | "Treatment";
  value: string;
  date: string;
  note: string;
};

export type AlertRow = {
  id: string;
  animal_id: string;
  animal_name: string;
  category: RiskCategory;
  anomaly: boolean;
  created_at: string;
  actions: string[];
  status: string;
};

export type Recommendation = {
  id: string;
  animal_id: string | null;
  domain: string;
  text: string;
  source: string;
};

type Store = {
  role: Role;
  signedIn: boolean;
  loading: boolean;
  farms: Farm[];
  animals: Animal[];
  predictions: PredictionResponse[];
  alerts: AlertRow[];
  recommendations: Recommendation[];
  records: LabRecord[];
  upsertAnimal: (a: Omit<Animal, "id"> & { id?: string }) => Promise<void>;
  addRecords: (r: Omit<LabRecord, "id">[]) => Promise<void>;
  updateRecommendation: (id: string, text: string) => Promise<void>;
  setAlertStatus: (id: string, status: "acknowledged" | "resolved") => Promise<void>;
  refresh: () => void;
};

const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const { user, role, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const enabled = !!user;
  const uid = user?.id ?? "anon";

  const farmsQ = useQuery({
    queryKey: ["farms", uid],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("farms").select("*").order("name");
      if (error) throw error;
      return (data ?? []).map<Farm>((f) => ({
        id: f.id,
        name: f.name,
        district: f.district,
        lat: Number(f.gps_lat ?? 0),
        lng: Number(f.gps_lng ?? 0),
        cooperative_id: f.cooperative_id,
      }));
    },
  });

  const animalsQ = useQuery({
    queryKey: ["animals", uid],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("animals").select("*").order("name");
      if (error) throw error;
      return (data ?? []).map<Animal>((a) => ({
        id: a.id,
        tag: a.tag,
        name: a.name,
        breed: a.breed,
        age: a.age,
        lactation_number: a.lactation_number,
        vaccinated: a.vaccination_status,
        disease_history: Array.isArray(a.disease_history) ? (a.disease_history as string[]) : [],
        collar_device_id: a.collar_device_id ?? "",
        farm_id: a.farm_id,
      }));
    },
  });

  const predictionsQ = useQuery({
    queryKey: ["predictions", uid],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .order("predicted_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      const latest = new Map<string, PredictionResponse>();
      for (const p of data ?? []) {
        if (latest.has(p.animal_id)) continue;
        latest.set(p.animal_id, {
          animal_id: p.animal_id,
          risk_score: p.risk_score,
          risk_category: p.risk_category as RiskCategory,
          risk_factors: (p.risk_factors ?? []) as unknown as RiskFactor[],
          anomaly_flag: p.anomaly_flag,
          anomaly_reason: p.anomaly_reason,
          forecast_series: (p.forecast_series ?? []) as unknown as ForecastPoint[],
          model_version: p.model_version,
          last_prediction_timestamp: p.predicted_at,
        });
      }
      return [...latest.values()];
    },
  });

  const alertsQ = useQuery({
    queryKey: ["alerts", uid],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*, animals(name)")
        .neq("status", "resolved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map<AlertRow>((a) => ({
        id: a.id,
        animal_id: a.animal_id,
        animal_name: (a.animals as { name: string } | null)?.name ?? "Animal",
        category: a.risk_category as RiskCategory,
        anomaly: a.anomaly,
        created_at: a.created_at,
        actions: Array.isArray(a.actions) ? (a.actions as string[]) : [],
        status: a.status,
      }));
    },
  });

  const recsQ = useQuery({
    queryKey: ["recommendations", uid],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vet_recommendations")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map<Recommendation>((r) => ({
        id: r.id,
        animal_id: r.animal_id,
        domain: r.domain,
        text: r.text,
        source: r.source,
      }));
    },
  });

  const recordsQ = useQuery({
    queryKey: ["records", uid],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treatment_records")
        .select("*")
        .order("recorded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map<LabRecord>((r) => ({
        id: r.id,
        animal_id: r.animal_id,
        type: (r.record_type === "Treatment" ? "Treatment" : "SCC lab result") as LabRecord["type"],
        value: r.value ?? "",
        date: r.recorded_at.slice(0, 10),
        note: r.note ?? "",
      }));
    },
  });

  // Live updates: refresh alerts and predictions as new rows land.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("mastiguard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => {
        void qc.invalidateQueries({ queryKey: ["alerts", uid] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "predictions" }, () => {
        void qc.invalidateQueries({ queryKey: ["predictions", uid] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, uid, qc]);

  const value: Store = useMemo(
    () => ({
      role,
      signedIn: !!user,
      loading:
        authLoading ||
        (enabled && (animalsQ.isLoading || predictionsQ.isLoading || farmsQ.isLoading)),
      farms: farmsQ.data ?? [],
      animals: animalsQ.data ?? [],
      predictions: predictionsQ.data ?? [],
      alerts: alertsQ.data ?? [],
      recommendations: recsQ.data ?? [],
      records: recordsQ.data ?? [],
      upsertAnimal: async (a) => {
        const row = {
          farm_id: a.farm_id,
          tag: a.tag,
          name: a.name,
          breed: a.breed,
          age: a.age,
          lactation_number: a.lactation_number,
          vaccination_status: a.vaccinated,
          disease_history: a.disease_history,
          collar_device_id: a.collar_device_id || null,
        };
        const { error } = a.id
          ? await supabase.from("animals").update(row).eq("id", a.id)
          : await supabase.from("animals").insert(row);
        if (error) throw error;
        await qc.invalidateQueries({ queryKey: ["animals", uid] });
      },
      addRecords: async (rows) => {
        const { error } = await supabase.from("treatment_records").insert(
          rows.map((r) => ({
            animal_id: r.animal_id,
            record_type: r.type,
            value: r.value,
            note: r.note,
            recorded_at: new Date(r.date).toISOString(),
            created_by: user?.id ?? null,
          })),
        );
        if (error) throw error;
        await qc.invalidateQueries({ queryKey: ["records", uid] });
      },
      updateRecommendation: async (id, text) => {
        const { error } = await supabase.from("vet_recommendations").update({ text }).eq("id", id);
        if (error) throw error;
        if (user) {
          await supabase
            .from("audit_log")
            .insert({ actor_id: user.id, entity: "vet_recommendations", entity_id: id, action: "update" });
        }
        await qc.invalidateQueries({ queryKey: ["recommendations", uid] });
      },
      setAlertStatus: async (id, status) => {
        const patch =
          status === "resolved"
            ? { status, resolved_by: user?.id ?? null, resolved_at: new Date().toISOString() }
            : { status, acknowledged_by: user?.id ?? null, acknowledged_at: new Date().toISOString() };
        const { error } = await supabase.from("alerts").update(patch).eq("id", id);
        if (error) throw error;
        if (user) {
          await supabase
            .from("audit_log")
            .insert({ actor_id: user.id, entity: "alerts", entity_id: id, action: status });
        }
        await qc.invalidateQueries({ queryKey: ["alerts", uid] });
      },
      refresh: () => {
        void qc.invalidateQueries();
      },
    }),
    [
      role,
      user,
      uid,
      qc,
      authLoading,
      enabled,
      farmsQ.data,
      farmsQ.isLoading,
      animalsQ.data,
      animalsQ.isLoading,
      predictionsQ.data,
      predictionsQ.isLoading,
      alertsQ.data,
      recsQ.data,
      recordsQ.data,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside AppStoreProvider");
  return v;
}

/** 30 days of real sensor readings for one animal. */
export function useSensorSeries(animalId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sensors", animalId, user?.id ?? "anon"],
    enabled: !!user && !!animalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sensor_readings")
        .select("*")
        .eq("animal_id", animalId)
        .order("timestamp", { ascending: true })
        .limit(400);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        date: r.timestamp.slice(0, 10),
        temperature: Number(r.body_temperature ?? 0),
        activity: r.activity_level ?? 0,
        rumination: r.rumination_minutes ?? 0,
        milk_yield: Number(r.milk_yield ?? 0),
        scc: r.scc ?? 0,
      }));
    },
  });
}
