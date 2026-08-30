import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { MapPin } from "lucide-react";
import { useStore } from "@/lib/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge } from "@/components/RiskBadge";
import { categoryFor } from "@/lib/mock-data";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Risk Hotspot Map — MastiGuard" },
      {
        name: "description",
        content: "Farm locations and mastitis risk clusters across dairy districts, plotted on a hotspot map.",
      },
      { property: "og:title", content: "Risk Hotspot Map — MastiGuard" },
      { property: "og:description", content: "Farm locations and mastitis risk clusters by district." },
    ],
  }),
  component: MapView,
});

// Placeholder map: mock geo-coordinates projected onto a simple India-bounds grid.
const BOUNDS = { minLat: 8, maxLat: 32, minLng: 68, maxLng: 90 };

function MapView() {
  const { animals, predictions, farms } = useStore();

  const clusters = useMemo(
    () =>
      farms.map((f) => {
        const ids = animals.filter((a) => a.farm_id === f.id).map((a) => a.id);
        const preds = predictions.filter((p) => ids.includes(p.animal_id));
        const avg = Math.round(preds.reduce((s, p) => s + p.risk_score, 0) / (preds.length || 1));
        return {
          ...f,
          avg,
          count: preds.length,
          high: preds.filter((p) => p.risk_category === "High").length,
          x: ((f.lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100,
          y: (1 - (f.lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100,
        };
      }),
    [animals, predictions, farms],
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Risk hotspot map</h1>

      <Card>
        <CardContent className="p-4">
          <div className="relative h-80 w-full overflow-hidden rounded-xl border bg-accent/40">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:40px_40px] opacity-60" />
            {clusters.map((c) => (
              <div
                key={c.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
              >
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30"
                  style={{
                    width: 30 + c.avg,
                    height: 30 + c.avg,
                    background: c.avg >= 50 ? "var(--chart-4)" : "var(--chart-1)",
                  }}
                />
                <div className="relative flex flex-col items-center">
                  <MapPin className="size-6 text-primary" />
                  <span className="whitespace-nowrap rounded-md bg-card px-2 py-0.5 text-[11px] font-semibold shadow">
                    {c.name} · {c.avg}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Farm GPS coordinates from your cooperative — bubble size and colour reflect average herd risk.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cluster summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {clusters.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
              <div className="flex-1">
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.district} · {c.count} animals · {c.high} high risk
                </p>
              </div>
              <RiskBadge category={categoryFor(c.avg)} />
              <span className="text-sm font-semibold">{c.avg}/100</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
