import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, type Role } from "@/lib/app-store";
import { useI18n, type Lang } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Model Source — MastiGuard" },
      {
        name: "description",
        content: "Switch between mock predictions and the live ML model, set language and test the predict API.",
      },
      { property: "og:title", content: "Settings & Model Source — MastiGuard" },
      { property: "og:description", content: "Model data source toggle, language and API test console." },
    ],
  }),
  component: SettingsPage,
});

const ROLES: Role[] = ["Farmer", "Veterinarian", "Cooperative Admin", "Animal Health Authority"];
const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिन्दी" },
  { id: "ta", label: "தமிழ்" },
];

function SettingsPage() {
  const { dataSource, setDataSource, role, setRole, animals } = useStore();
  const { lang, setLang } = useI18n();
  const [apiOut, setApiOut] = useState<string>("");

  const testApi = async () => {
    const a = animals[0];
    const res = await fetch("/api/public/predict-risk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        animal_id: a.id,
        time_series_data: [],
        static_attributes: { breed: a.breed, age: a.age, lactation_number: a.lactation_number },
        mode: dataSource,
      }),
    });
    setApiOut(JSON.stringify(await res.json(), null, 2));
    toast.success("Prediction received");
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prediction data source</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Switch
            checked={dataSource === "live"}
            onCheckedChange={(v) => setDataSource(v ? "live" : "mock")}
          />
          <Label>{dataSource === "live" ? "Live model" : "Mock predictions"}</Label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active role</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <Button
              key={r}
              variant={role === r ? "default" : "outline"}
              className="min-h-11"
              onClick={() => setRole(r)}
            >
              {r}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Language</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {LANGS.map((l) => (
            <Button
              key={l.id}
              variant={lang === l.id ? "default" : "outline"}
              className="min-h-11"
              onClick={() => setLang(l.id)}
            >
              {l.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API integration test — POST /api/public/predict-risk</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="min-h-11" onClick={() => void testApi()}>
            Call prediction endpoint
          </Button>
          {apiOut && (
            <pre className="max-h-80 overflow-auto rounded-xl bg-muted p-3 text-xs">{apiOut}</pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
