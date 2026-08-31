// Server-only prediction pipeline.
// Priority: live external ML service (when ML_API_URL is configured) ->
// heuristic model over real stored sensor readings -> deterministic mock.
import {
  MODEL_VERSION,
  categoryFor,
  mockPrediction,
  type ForecastPoint,
  type PredictionResponse,
  type RiskFactor,
  type SensorPoint,
} from "@/lib/mock-data";

export type PredictionSource = "live" | "readings" | "mock";

export type PredictionResult = PredictionResponse & { source: PredictionSource };

const DAY = 86400000;

function isoDay(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Last N days of stored collar readings for an animal, oldest first. */
export async function loadStoredSeries(animalId: string, days = 30): Promise<SensorPoint[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - days * DAY).toISOString();
  const { data, error } = await supabaseAdmin
    .from("sensor_readings")
    .select("timestamp, body_temperature, activity_level, rumination_minutes, milk_yield, scc")
    .eq("animal_id", animalId)
    .gte("timestamp", since)
    .order("timestamp", { ascending: true })
    .limit(2000);

  if (error || !data) return [];

  // Collapse to daily averages so the model sees one point per day.
  const buckets = new Map<string, { n: number; t: number; a: number; r: number; m: number; s: number }>();
  for (const row of data) {
    const key = String(row.timestamp).slice(0, 10);
    const b = buckets.get(key) ?? { n: 0, t: 0, a: 0, r: 0, m: 0, s: 0 };
    b.n += 1;
    b.t += Number(row.body_temperature ?? 38.5);
    b.a += Number(row.activity_level ?? 70);
    b.r += Number(row.rumination_minutes ?? 450);
    b.m += Number(row.milk_yield ?? 14);
    b.s += Number(row.scc ?? 180);
    buckets.set(key, b);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, b]) => ({
      date,
      temperature: +(b.t / b.n).toFixed(2),
      activity: Math.round(b.a / b.n),
      rumination: Math.round(b.r / b.n),
      milk_yield: +(b.m / b.n).toFixed(1),
      scc: Math.round(b.s / b.n),
    }));
}

/** Transparent heuristic model used when no external ML service is wired up. */
export function predictFromSeries(animalId: string, series: SensorPoint[]): PredictionResult {
  const last = series[series.length - 1]!;
  const first = series[0]!;

  const tempDelta = +(last.temperature - 38.5).toFixed(2);
  const rumDrop = first.rumination ? Math.round(((first.rumination - last.rumination) / first.rumination) * 100) : 0;
  const yieldDrop = first.milk_yield ? Math.round(((first.milk_yield - last.milk_yield) / first.milk_yield) * 100) : 0;
  const scc = last.scc;

  const score = Math.max(
    0,
    Math.min(100, Math.round(18 + tempDelta * 22 + rumDrop * 0.9 + yieldDrop * 0.8 + (scc - 180) / 12)),
  );

  const risk_factors: RiskFactor[] = (
    [
      {
        factor: `Body temperature ${tempDelta >= 0 ? "+" : ""}${tempDelta}°C vs baseline`,
        contribution_value: +(tempDelta * 0.21).toFixed(3),
        direction: tempDelta >= 0 ? "increases" : "decreases",
      },
      {
        factor: `Rumination ${rumDrop >= 0 ? "down" : "up"} ${Math.abs(rumDrop)}%`,
        contribution_value: +(rumDrop * 0.008).toFixed(3),
        direction: rumDrop >= 0 ? "increases" : "decreases",
      },
      {
        factor: `SCC at ${scc}k cells/ml`,
        contribution_value: +(((scc - 200) / 1000) * 0.9).toFixed(3),
        direction: scc > 200 ? "increases" : "decreases",
      },
      {
        factor: `Milk yield ${yieldDrop >= 0 ? "down" : "up"} ${Math.abs(yieldDrop)}%`,
        contribution_value: +(yieldDrop * 0.006).toFixed(3),
        direction: yieldDrop >= 0 ? "increases" : "decreases",
      },
    ] as RiskFactor[]
  ).sort((a, b) => Math.abs(b.contribution_value) - Math.abs(a.contribution_value));

  // Simple distribution check standing in for Isolation Forest.
  const temps = series.map((p) => p.temperature);
  const mean = temps.reduce((s, v) => s + v, 0) / temps.length;
  const sd = Math.sqrt(temps.reduce((s, v) => s + (v - mean) ** 2, 0) / temps.length) || 0.01;
  const z = Math.abs(last.temperature - mean) / sd;
  const anomaly_flag = z > 2.5 || scc > 900;

  const now = Date.now();
  const forecast_series: ForecastPoint[] = [];
  const observed = series.slice(-14);
  observed.forEach((p, i) => {
    const dayIdx = i - (observed.length - 1);
    const t = +(p.temperature - 38.5).toFixed(2);
    forecast_series.push({
      day: dayIdx,
      date: p.date,
      risk_score: Math.max(0, Math.min(100, Math.round(18 + t * 22 + (p.scc - 180) / 12))),
      segment: "observed",
    });
  });
  const slope = score > 45 ? 1.5 : 0.4;
  for (let d = 1; d <= 14; d++) {
    forecast_series.push({
      day: d,
      date: isoDay(now + d * DAY),
      risk_score: Math.max(0, Math.min(100, Math.round(score + d * slope))),
      segment: "forecast",
    });
  }

  return {
    animal_id: animalId,
    risk_score: score,
    risk_category: categoryFor(score),
    risk_factors,
    anomaly_flag,
    anomaly_reason: anomaly_flag
      ? `Reading outside the animal's normal distribution (temperature z-score ${z.toFixed(1)}, SCC ${scc}k)`
      : null,
    forecast_series,
    model_version: `${MODEL_VERSION}-onboard`,
    last_prediction_timestamp: new Date().toISOString(),
    source: "readings",
  };
}

async function callLiveModel(
  animalId: string,
  series: SensorPoint[],
  statics: Record<string, unknown>,
): Promise<PredictionResult | null> {
  const url = process.env["ML_API_URL"];
  if (!url) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const key = process.env["ML_API_KEY"];
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(key ? { authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({
        animal_id: animalId,
        time_series_data: series,
        static_attributes: statics,
      }),
    });
    if (!res.ok) {
      console.error(`[ml] live model responded ${res.status}`);
      return null;
    }
    const json = (await res.json()) as Partial<PredictionResponse>;
    if (typeof json.risk_score !== "number") {
      console.error("[ml] live model returned an unexpected payload shape");
      return null;
    }
    return {
      animal_id: animalId,
      risk_score: Math.max(0, Math.min(100, Math.round(json.risk_score))),
      risk_category: json.risk_category ?? categoryFor(json.risk_score),
      risk_factors: json.risk_factors ?? [],
      anomaly_flag: Boolean(json.anomaly_flag),
      anomaly_reason: json.anomaly_reason ?? null,
      forecast_series: json.forecast_series ?? [],
      model_version: json.model_version ?? MODEL_VERSION,
      last_prediction_timestamp: json.last_prediction_timestamp ?? new Date().toISOString(),
      source: "live",
    };
  } catch (e) {
    console.error("[ml] live model call failed", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function predictForAnimal(
  animalId: string,
  opts: { series?: SensorPoint[]; statics?: Record<string, unknown>; forceMock?: boolean } = {},
): Promise<PredictionResult> {
  if (opts.forceMock) return { ...mockPrediction(animalId), source: "mock" };

  let series = opts.series ?? [];
  if (series.length === 0) {
    try {
      series = await loadStoredSeries(animalId);
    } catch {
      series = [];
    }
  }

  const live = await callLiveModel(animalId, series, opts.statics ?? {});
  if (live) return live;

  if (series.length >= 3) return predictFromSeries(animalId, series);

  return { ...mockPrediction(animalId), source: "mock" };
}

const ACTIONS: Record<string, string[]> = {
  High: ["Isolate animal from milking line", "Notify veterinarian today", "Collect milk sample for CMT/SCC"],
  Moderate: ["Check milking hygiene & teat dipping", "Re-test SCC in 48 hours", "Monitor temperature twice daily"],
};

/** Stores a prediction and opens an alert when the risk warrants one. */
export async function persistPrediction(animalId: string, pred: PredictionResult) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: inserted, error } = await supabaseAdmin
    .from("predictions")
    .insert({
      animal_id: animalId,
      risk_score: pred.risk_score,
      risk_category: pred.risk_category,
      risk_factors: pred.risk_factors,
      anomaly_flag: pred.anomaly_flag,
      anomaly_reason: pred.anomaly_reason,
      forecast_series: pred.forecast_series,
      model_version: pred.model_version,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("[ml] failed to persist prediction", error);
    return { prediction_id: null as string | null, alert_id: null as string | null };
  }

  const needsAlert = pred.risk_category === "High" || pred.risk_category === "Moderate" || pred.anomaly_flag;
  if (!needsAlert) return { prediction_id: inserted.id, alert_id: null as string | null };

  const { data: openAlert } = await supabaseAdmin
    .from("alerts")
    .select("id")
    .eq("animal_id", animalId)
    .eq("status", "open")
    .maybeSingle();

  if (openAlert) return { prediction_id: inserted.id, alert_id: openAlert.id };

  const { data: alert } = await supabaseAdmin
    .from("alerts")
    .insert({
      animal_id: animalId,
      prediction_id: inserted.id,
      risk_category: pred.risk_category,
      anomaly: pred.anomaly_flag,
      actions: ACTIONS[pred.risk_category] ?? ["Continue routine monitoring"],
    })
    .select("id")
    .single();

  return { prediction_id: inserted.id, alert_id: alert?.id ?? null };
}
