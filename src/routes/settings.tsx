import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/app-store";
import { useAuth } from "@/lib/auth";
import { useI18n, type Lang } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Model Source — MastiGuard" },
      {
        name: "description",
        content: "Manage your account, language preference and test the mastitis prediction API endpoint.",
      },
      { property: "og:title", content: "Settings & Model Source — MastiGuard" },
      { property: "og:description", content: "Account, language and prediction API test console." },
    ],
  }),
  component: SettingsPage,
});

const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिन्दी" },
  { id: "ta", label: "தமிழ்" },
];

function SettingsPage() {
  const { animals, farms } = useStore();
  const { role, user, profile, signOut } = useAuth();
  const { lang, setLang } = useI18n();
  const [apiOut, setApiOut] = useState<string>("");

  const testApi = async () => {
    const a = animals[0];
    if (!a) return toast.error("No animals available to test with");
    const res = await fetch("/api/public/predict-risk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        animal_id: a.id,
        time_series_data: [],
        static_attributes: { breed: a.breed, age: a.age, lactation_number: a.lactation_number },
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
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span> {profile?.full_name ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Contact:</span> {user?.email ?? user?.phone ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Role:</span>{" "}
            <span className="font-semibold">{role}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Farm:</span>{" "}
            {farms.find((f) => f.id === profile?.farm_id)?.name ?? "All assigned farms"}
          </p>
          <Button
            variant="outline"
            className="mt-2 min-h-11"
            onClick={() => {
              void signOut();
              toast.success("Signed out");
            }}
          >
            Sign out
          </Button>
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
