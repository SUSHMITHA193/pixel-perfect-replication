// Deterministic mock data + mock ML pipeline outputs for MastiGuard.
// Shapes match the external ML service contract exactly so the real
// POST /api/predict-risk service can drop in without UI changes.

export type RiskCategory = "No Risk" | "Low" | "Moderate" | "High";

export type RiskFactor = {
  factor: string;
  contribution_value: number; // SHAP value, signed
  direction: "increases" | "decreases";
};

export type ForecastPoint = {
  day: number; // 0 = today, positive = forecast horizon
  date: string;
  risk_score: number;
  segment: "observed" | "forecast";
};

export type SensorPoint = {
  date: string;
  temperature: number; // °C
  activity: number; // index 0-100
  rumination: number; // minutes/day
  milk_yield: number; // litres/day
  scc: number; // '000 cells/ml
};

export type PredictionResponse = {
  animal_id: string;
  risk_score: number;
  risk_category: RiskCategory;
  risk_factors: RiskFactor[];
  anomaly_flag: boolean;
  anomaly_reason: string | null;
  forecast_series: ForecastPoint[];
  model_version: string;
  last_prediction_timestamp: string;
};

export type Animal = {
  id: string;
  tag: string;
  name: string;
  breed: string;
  age: number;
  lactation_number: number;
  vaccinated: boolean;
  disease_history: string[];
  collar_device_id: string;
  farm_id: string;
};

export type Farm = {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
};

export const MODEL_VERSION = "tft-xgb-v2.4.1";

/** Small deterministic PRNG so SSR and client render identically. */
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hash(str: string) {
  let h = 7;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 1000003;
  return h;
}

const BASE_DATE = new Date("2026-08-27T00:00:00Z").getTime();
const DAY = 86400000;

function iso(offsetDays: number) {
  return new Date(BASE_DATE + offsetDays * DAY).toISOString().slice(0, 10);
}

export const farms: Farm[] = [
  { id: "F1", name: "Ganga Dairy Co-op", district: "Anand, Gujarat", lat: 22.55, lng: 72.95 },
  { id: "F2", name: "Kaveri Milk Union", district: "Erode, Tamil Nadu", lat: 11.34, lng: 77.72 },
  { id: "F3", name: "Yamuna Farms", district: "Karnal, Haryana", lat: 29.68, lng: 76.99 },
  { id: "F4", name: "Deccan Herd Collective", district: "Pune, Maharashtra", lat: 18.52, lng: 73.85 },
];

const BREEDS = ["Gir", "Sahiwal", "Holstein Friesian Cross", "Jersey Cross", "Red Sindhi", "Tharparkar"];
const NAMES = [
  "Lakshmi", "Ganga", "Nandini", "Kamdhenu", "Sheela", "Radha", "Meera", "Tulsi",
  "Parvati", "Saras", "Chandni", "Bhoomi", "Kaveri", "Amba", "Rukmini", "Savitri",
  "Damini", "Ila", "Padma", "Sundari", "Roopa", "Vasu", "Gauri", "Netra",
];
const HISTORY = ["Subclinical mastitis (2025)", "Clinical mastitis (2024)", "Foot rot", "Milk fever", "Ketosis"];

export const animals: Animal[] = NAMES.map((name, i) => {
  const r = seeded(hash(name) + i);
  const farm = farms[i % farms.length]!;
  return {
    id: `A${String(i + 1).padStart(3, "0")}`,
    tag: `IN-${farm.id}-${1200 + i * 7}`,
    name,
    breed: BREEDS[Math.floor(r() * BREEDS.length)]!,
    age: 3 + Math.floor(r() * 8),
    lactation_number: 1 + Math.floor(r() * 5),
    vaccinated: r() > 0.25,
    disease_history: r() > 0.55 ? [HISTORY[Math.floor(r() * HISTORY.length)]!] : [],
    collar_device_id: `CLR-${8000 + i * 13}`,
    farm_id: farm.id,
  };
});

/** 30 days of simulated IoT sensor history (structured like real collar payloads). */
export function getSensorSeries(animalId: string): SensorPoint[] {
  const r = seeded(hash(animalId) * 3 + 11);
  const stress = r(); // baseline health tendency
  const out: SensorPoint[] = [];
  for (let d = -29; d <= 0; d++) {
    const drift = stress > 0.7 ? ((d + 29) / 29) * stress : 0;
    out.push({
      date: iso(d),
      temperature: +(38.4 + drift * 1.6 + (r() - 0.5) * 0.3).toFixed(2),
      activity: Math.round(72 - drift * 26 + (r() - 0.5) * 8),
      rumination: Math.round(470 - drift * 110 + (r() - 0.5) * 30),
      milk_yield: +(14.5 - drift * 4.2 + (r() - 0.5) * 1.4).toFixed(1),
      scc: Math.round(160 + drift * 620 + r() * 60),
    });
  }
  return out;
}

export function categoryFor(score: number): RiskCategory {
  if (score >= 75) return "High";
  if (score >= 50) return "Moderate";
  if (score >= 25) return "Low";
  return "No Risk";
}

/**
 * Mock stand-in for the external pipeline (TFT forecast -> XGBoost ->
 * SHAP -> Isolation Forest). Returns the exact production response shape.
 */
export function mockPrediction(animalId: string, live = false): PredictionResponse {
  const series = getSensorSeries(animalId);
  const r = seeded(hash(animalId) * 7 + (live ? 3 : 1));
  const last = series[series.length - 1]!;
  const first = series[0]!;

  const tempDelta = +(last.temperature - 38.5).toFixed(2);
  const rumDrop = Math.round(((first.rumination - last.rumination) / first.rumination) * 100);
  const yieldDrop = Math.round(((first.milk_yield - last.milk_yield) / first.milk_yield) * 100);
  const sccLevel = last.scc;

  let score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        18 + tempDelta * 22 + rumDrop * 0.9 + yieldDrop * 0.8 + (sccLevel - 180) / 12 + (r() - 0.5) * 8,
      ),
    ),
  );
  if (live) score = Math.max(0, Math.min(100, score + Math.round((r() - 0.5) * 10)));

  const factors: RiskFactor[] = ([
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
      factor: `SCC at ${sccLevel}k cells/ml`,
      contribution_value: +(((sccLevel - 200) / 1000) * 0.9).toFixed(3),
      direction: sccLevel > 200 ? "increases" : "decreases",
    },
    {
      factor: `Milk yield ${yieldDrop >= 0 ? "down" : "up"} ${Math.abs(yieldDrop)}%`,
      contribution_value: +(yieldDrop * 0.006).toFixed(3),
      direction: yieldDrop >= 0 ? "increases" : "decreases",
    },
    {
      factor: "Lactation number & parity",
      contribution_value: +((r() - 0.4) * 0.12).toFixed(3),
      direction: r() > 0.45 ? "increases" : "decreases",
    },
  ] as RiskFactor[]).sort((a, b) => Math.abs(b.contribution_value) - Math.abs(a.contribution_value));

  const anomaly_flag = r() > 0.86;

  const forecast_series: ForecastPoint[] = [];
  for (let d = -13; d <= 0; d++) {
    const s: SensorPoint = series[series.length + d - 1] ?? last;
    forecast_series.push({
      day: d,
      date: s.date,
      risk_score: Math.max(
        0,
        Math.min(100, Math.round(score - (Math.abs(d) * score) / 34 + (r() - 0.5) * 5)),
      ),
      segment: "observed",
    });
  }
  for (let d = 1; d <= 14; d++) {
    forecast_series.push({
      day: d,
      date: iso(d),
      risk_score: Math.max(0, Math.min(100, Math.round(score + d * (score > 45 ? 1.5 : 0.4) + (r() - 0.5) * 6))),
      segment: "forecast",
    });
  }

  return {
    animal_id: animalId,
    risk_score: score,
    risk_category: categoryFor(score),
    risk_factors: factors,
    anomaly_flag,
    anomaly_reason: anomaly_flag
      ? "Isolation Forest: irregular activity/rumination pattern not seen in training distribution"
      : null,
    forecast_series,
    model_version: live ? MODEL_VERSION : `${MODEL_VERSION}-mock`,
    last_prediction_timestamp: new Date(BASE_DATE + 9 * 3600000).toISOString(),
  };
}

export function allPredictions(live = false) {
  return animals.map((a) => mockPrediction(a.id, live));
}

export type Alert = {
  id: string;
  animal_id: string;
  animal_name: string;
  category: RiskCategory;
  anomaly: boolean;
  created_at: string;
  actions: string[];
};

const ACTIONS: Record<string, string[]> = {
  High: ["Isolate animal from milking line", "Notify veterinarian today", "Collect milk sample for CMT/SCC"],
  Moderate: ["Check milking hygiene & teat dipping", "Re-test SCC in 48 hours", "Monitor temperature twice daily"],
};

export function buildAlerts(preds: PredictionResponse[]): Alert[] {
  return preds
    .filter((p) => p.risk_category === "High" || p.risk_category === "Moderate" || p.anomaly_flag)
    .map((p, i) => {
      const animal = animals.find((a) => a.id === p.animal_id)!;
      return {
        id: `AL-${p.animal_id}`,
        animal_id: p.animal_id,
        animal_name: animal.name,
        category: p.risk_category,
        anomaly: p.anomaly_flag,
        created_at: new Date(BASE_DATE + (9 - i * 0.7) * 3600000).toISOString(),
        actions: p.anomaly_flag
          ? ["Manual vet review — atypical sensor pattern", ...(ACTIONS[p.risk_category] ?? [])]
          : (ACTIONS[p.risk_category] ?? ["Continue routine monitoring"]),
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export type Recommendation = {
  id: string;
  domain: "Milking hygiene" | "Nutrition" | "Housing" | "Biosecurity";
  text: string;
  source: "Rule-based" | "AI";
};

export const defaultRecommendations: Recommendation[] = [
  { id: "R1", domain: "Milking hygiene", text: "Pre- and post-dip every teat with 0.5% iodine; use a single-use cloth per animal.", source: "Rule-based" },
  { id: "R2", domain: "Milking hygiene", text: "Milk high-risk animals last and disinfect the cluster between animals.", source: "AI" },
  { id: "R3", domain: "Nutrition", text: "Supplement selenium + vitamin E during peak lactation to support udder immunity.", source: "AI" },
  { id: "R4", domain: "Housing", text: "Keep bedding dry; replace wet bedding twice daily during monsoon.", source: "Rule-based" },
  { id: "R5", domain: "Biosecurity", text: "Quarantine newly purchased animals for 14 days with SCC screening before herd entry.", source: "Rule-based" },
];

export type UsageRow = { month: string; treatments: number; risk_avg: number; savings: number };

export const usageTrend: UsageRow[] = [
  { month: "Mar", treatments: 24, risk_avg: 46, savings: 18000 },
  { month: "Apr", treatments: 21, risk_avg: 44, savings: 22500 },
  { month: "May", treatments: 17, risk_avg: 41, savings: 31000 },
  { month: "Jun", treatments: 14, risk_avg: 38, savings: 38500 },
  { month: "Jul", treatments: 11, risk_avg: 35, savings: 46000 },
  { month: "Aug", treatments: 9, risk_avg: 33, savings: 52000 },
];
