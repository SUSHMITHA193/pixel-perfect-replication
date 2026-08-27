import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, Pencil } from "lucide-react";
import { useStore } from "@/lib/app-store";
import { getSensorSeries } from "@/lib/mock-data";
import { RiskBadge, AnomalyBadge, RiskMeter } from "@/components/RiskBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/animals/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Animal ${params.id} — MastiGuard` },
      {
        name: "description",
        content:
          "30-day sensor history, 14-day mastitis risk forecast and SHAP factor explanations for this animal.",
      },
      { property: "og:title", content: `Animal ${params.id} — MastiGuard` },
      {
        property: "og:description",
        content: "Sensor history, risk forecast and explainability for this animal.",
      },
    ],
  }),
  component: AnimalProfile,
});

const SERIES = [
  { key: "temperature", label: "Body temperature (°C)", color: "var(--chart-4)" },
  { key: "activity", label: "Activity index", color: "var(--chart-2)" },
  { key: "rumination", label: "Rumination (min/day)", color: "var(--chart-1)" },
  { key: "milk_yield", label: "Milk yield (L/day)", color: "var(--chart-3)" },
  { key: "scc", label: "SCC ('000 cells/ml)", color: "var(--chart-5)" },
] as const;

function AnimalProfile() {
  const { id } = Route.useParams();
  const { animals, predictions, recommendations, setRecommendations, role, records } = useStore();
  const animal = animals.find((a) => a.id === id);
  const pred = predictions.find((p) => p.animal_id === id);
  const series = useMemo(() => getSensorSeries(id), [id]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  if (!animal || !pred) throw notFound();

  const forecast = pred.forecast_series.map((f) => ({
    ...f,
    observed: f.segment === "observed" ? f.risk_score : null,
    predicted: f.segment === "forecast" || f.day === 0 ? f.risk_score : null,
  }));

  const maxAbs = Math.max(...pred.risk_factors.map((f) => Math.abs(f.contribution_value)), 0.01);

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="size-4" /> Back to dashboard
      </Link>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{animal.name}</h1>
            <p className="text-sm text-muted-foreground">
              {animal.tag} · {animal.breed} · {animal.age} yrs · lactation {animal.lactation_number} ·{" "}
              {animal.vaccinated ? "Vaccinated" : "Not vaccinated"} · collar {animal.collar_device_id}
            </p>
            {animal.disease_history.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">History: {animal.disease_history.join(", ")}</p>
            )}
          </div>
          <div className="w-full sm:w-56">
            <div className="mb-2 flex flex-wrap gap-2">
              <RiskBadge category={pred.risk_category} />
              {pred.anomaly_flag && <AnomalyBadge />}
            </div>
            <RiskMeter score={pred.risk_score} category={pred.risk_category} />
            <p className="mt-1 text-xs text-muted-foreground">
              {pred.risk_score}/100 · {pred.model_version}
            </p>
          </div>
        </CardContent>
      </Card>

      {pred.anomaly_flag && (
        <div className="rounded-xl border border-anomaly bg-anomaly/40 p-4 text-sm text-anomaly-foreground">
          {pred.anomaly_reason}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">14-day risk forecast (observed vs forecast)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <ReferenceLine x={0} stroke="var(--muted-foreground)" strokeDasharray="4 4" label="today" />
              <Area
                type="monotone"
                dataKey="observed"
                stroke="var(--chart-2)"
                fill="var(--chart-2)"
                fillOpacity={0.18}
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="var(--chart-4)"
                strokeDasharray="5 4"
                fill="var(--chart-4)"
                fillOpacity={0.12}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top contributing risk factors (SHAP)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pred.risk_factors.map((f) => {
            const pct = (Math.abs(f.contribution_value) / maxAbs) * 100;
            const up = f.direction === "increases";
            return (
              <div key={f.factor}>
                <div className="flex justify-between text-sm">
                  <span>{f.factor}</span>
                  <span className={up ? "text-risk-high-foreground" : "text-risk-none-foreground"}>
                    {f.contribution_value > 0 ? "+" : ""}
                    {f.contribution_value}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${up ? "bg-chart-4" : "bg-chart-1"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {SERIES.map((s) => (
          <Card key={s.key}>
            <CardHeader>
              <CardTitle className="text-sm">{s.label} · last 30 days</CardTitle>
            </CardHeader>
            <CardContent className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" hide />
                  <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                  <Tooltip />
                  <Line type="monotone" dataKey={s.key} stroke={s.color} dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decision support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendations.map((r) => (
            <div key={r.id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="risk-chip bg-secondary text-secondary-foreground">{r.domain}</span>
                <span className="text-xs text-muted-foreground">{r.source}</span>
              </div>
              {editing === r.id ? (
                <div className="mt-2 space-y-2">
                  <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setRecommendations(
                          recommendations.map((x) => (x.id === r.id ? { ...x, text: draft } : x)),
                        );
                        setEditing(null);
                        toast.success("Recommendation updated");
                      }}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex items-start gap-2">
                  <p className="flex-1 text-sm">{r.text}</p>
                  {role === "Veterinarian" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(r.id);
                        setDraft(r.text);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
          {role !== "Veterinarian" && (
            <p className="text-xs text-muted-foreground">
              Sign in as a Veterinarian to edit recommendations.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manual records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {records.filter((r) => r.animal_id === id).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lab or treatment records yet. Add them on the Data page.
            </p>
          ) : (
            records
              .filter((r) => r.animal_id === id)
              .map((r) => (
                <div key={r.id} className="rounded-lg border p-2 text-sm">
                  <span className="font-semibold">{r.type}</span> · {r.value} · {r.date}
                  {r.note && <span className="text-muted-foreground"> — {r.note}</span>}
                </div>
              ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
