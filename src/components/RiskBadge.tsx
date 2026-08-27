import { AlertTriangle } from "lucide-react";
import type { RiskCategory } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const styles: Record<RiskCategory, string> = {
  "No Risk": "bg-risk-none text-risk-none-foreground",
  Low: "bg-risk-low text-risk-low-foreground",
  Moderate: "bg-risk-moderate text-risk-moderate-foreground",
  High: "bg-risk-high text-risk-high-foreground",
};

export function RiskBadge({ category, className }: { category: RiskCategory; className?: string }) {
  return <span className={cn("risk-chip", styles[category], className)}>{category}</span>;
}

export function AnomalyBadge({ className }: { className?: string }) {
  return (
    <span className={cn("risk-chip bg-anomaly text-anomaly-foreground", className)}>
      <AlertTriangle className="size-3.5" />
      Anomaly — Needs Review
    </span>
  );
}

export function RiskMeter({ score, category }: { score: number; category: RiskCategory }) {
  const bar: Record<RiskCategory, string> = {
    "No Risk": "bg-chart-1",
    Low: "bg-chart-1",
    Moderate: "bg-chart-3",
    High: "bg-chart-4",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", bar[category])} style={{ width: `${score}%` }} />
    </div>
  );
}
