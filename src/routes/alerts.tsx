import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, MessageSquare } from "lucide-react";
import { useStore } from "@/lib/app-store";
import { RiskBadge, AnomalyBadge } from "@/components/RiskBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts & Actions — MastiGuard" },
      {
        name: "description",
        content: "Real-time in-app and SMS-style mastitis alerts with recommended actions for each animal.",
      },
      { property: "og:title", content: "Alerts & Actions — MastiGuard" },
      { property: "og:description", content: "Mastitis alerts with recommended actions per animal." },
    ],
  }),
  component: Alerts,
});

function Alerts() {
  const { alerts } = useStore();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <BellRing className="size-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
        <span className="risk-chip bg-secondary text-secondary-foreground">{alerts.length} active</span>
      </div>

      <div className="space-y-3">
        {alerts.map((a) => (
          <Card key={a.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link to="/animals/$id" params={{ id: a.animal_id }} className="font-semibold underline-offset-2 hover:underline">
                  {a.animal_name}
                </Link>
                <RiskBadge category={a.category} />
                {a.anomaly && <AnomalyBadge />}
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString("en-IN")}
                </span>
              </div>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {a.actions.map((act) => (
                  <li key={act}>{act}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="min-h-11"
                  variant="outline"
                  onClick={() => toast.success(`SMS queued to farmer for ${a.animal_name}`)}
                >
                  <MessageSquare className="size-4" /> Send SMS
                </Button>
                <Button className="min-h-11" onClick={() => toast.success(`Vet notified about ${a.animal_name}`)}>
                  Notify vet
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {alerts.length === 0 && <p className="text-sm text-muted-foreground">No active alerts.</p>}
      </div>
    </div>
  );
}
