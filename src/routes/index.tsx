import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, Activity, Bell, Droplets } from "lucide-react";
import { useStore } from "@/lib/app-store";
import { useI18n } from "@/lib/i18n";
import { RiskBadge, AnomalyBadge, RiskMeter } from "@/components/RiskBadge";
import type { RiskCategory } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Herd Dashboard — MastiGuard" },
      {
        name: "description",
        content:
          "Live herd-level and per-animal mastitis risk scores, anomaly flags and alerts across your dairy herd.",
      },
      { property: "og:title", content: "Herd Dashboard — MastiGuard" },
      {
        property: "og:description",
        content: "Live herd-level and per-animal mastitis risk scores and alerts.",
      },
    ],
  }),
  component: Dashboard,
});

const ORDER: RiskCategory[] = ["High", "Moderate", "Low", "No Risk"];

function Dashboard() {
  const { animals, predictions, alerts, farms, loading } = useStore();
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<RiskCategory | "All">("All");
  const [sort, setSort] = useState<"risk" | "name">("risk");

  const rows = useMemo(() => {
    const byId = new Map(predictions.map((p) => [p.animal_id, p]));
    return animals
      .map((a) => ({ animal: a, pred: byId.get(a.id) }))
      .filter((r) => r.pred)
      .filter((r) =>
        q ? `${r.animal.name} ${r.animal.tag} ${r.animal.breed}`.toLowerCase().includes(q.toLowerCase()) : true,
      )
      .filter((r) => (filter === "All" ? true : r.pred!.risk_category === filter))
      .sort((a, b) =>
        sort === "name"
          ? a.animal.name.localeCompare(b.animal.name)
          : b.pred!.risk_score - a.pred!.risk_score,
      );
  }, [animals, predictions, q, filter, sort]);

  const counts = ORDER.map((c) => ({
    category: c,
    n: predictions.filter((p) => p.risk_category === c).length,
  }));
  const avg = Math.round(predictions.reduce((s, p) => s + p.risk_score, 0) / (predictions.length || 1));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("herd_risk")}</h1>
          <p className="text-sm text-muted-foreground">
            {animals.length} animals · {farms.length} farms ·{" "}
            <span className="font-semibold text-foreground">live herd data</span>
          </p>
        </div>
        <Link
          to="/alerts"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Bell className="size-4" /> {alerts.length} {t("alerts")}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {counts.map((c) => (
          <Card key={c.category}>
            <CardContent className="p-4">
              <RiskBadge category={c.category} />
              <p className="mt-2 text-3xl font-bold">{c.n}</p>
              <p className="text-xs text-muted-foreground">animals</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Activity className="size-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Average herd risk</p>
              <p className="text-xl font-bold">{avg}/100</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Droplets className="size-8 text-info" />
            <div>
              <p className="text-xs text-muted-foreground">Anomaly flags</p>
              <p className="text-xl font-bold">{predictions.filter((p) => p.anomaly_flag).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ArrowUpRight className="size-8 text-chart-3" />
            <div>
              <p className="text-xs text-muted-foreground">Model version</p>
              <p className="truncate text-sm font-semibold">{predictions[0]?.model_version}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-base">Animals</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search")}
              className="h-11 max-w-xs"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as RiskCategory | "All")}
              className="h-11 rounded-md border bg-background px-3 text-sm"
            >
              {["All", ...ORDER].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "risk" | "name")}
              className="h-11 rounded-md border bg-background px-3 text-sm"
            >
              <option value="risk">Sort: risk</option>
              <option value="name">Sort: name</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map(({ animal, pred }) => (
            <Link
              key={animal.id}
              to="/animals/$id"
              params={{ id: animal.id }}
              className="flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/60"
            >
              <div className="min-w-40 flex-1">
                <p className="font-semibold">
                  {animal.name} <span className="text-xs text-muted-foreground">{animal.tag}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {animal.breed} · lactation {animal.lactation_number}
                </p>
              </div>
              <div className="w-full sm:w-40">
                <RiskMeter score={pred!.risk_score} category={pred!.risk_category} />
                <p className="mt-1 text-xs text-muted-foreground">{pred!.risk_score}/100</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <RiskBadge category={pred!.risk_category} />
                {pred!.anomaly_flag && <AnomalyBadge />}
              </div>
            </Link>
          ))}
          {loading && <p className="py-6 text-center text-sm text-muted-foreground">Loading herd data…</p>}
          {!loading && rows.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No animals match.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
