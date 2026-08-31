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
    if (!a) {
      toast.error("No animals available to test with");
      return;
    }
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

      {dbRole === "coop_admin" && <GatewayKeysCard />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">IoT collar ingestion — POST /api/public/ingest</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Collar gateways authenticate with the header <code className="font-mono">x-api-key</code> and post batches of
            readings. Each batch is scored by the model and opens alerts automatically.
          </p>
          <pre className="overflow-auto rounded-xl bg-muted p-3 text-xs">{`curl -X POST ${origin}/api/public/ingest \\
  -H "content-type: application/json" \\
  -H "x-api-key: <gateway key>" \\
  -d '{"readings":[{"collar_device_id":"CLR-8000","body_temperature":39.2,
        "activity_level":54,"rumination_minutes":390,"milk_yield":11.4,"scc":420,
        "battery_level":88}]}'`}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

function GatewayKeysCard() {
  const list = useServerFn(listGatewayKeys);
  const create = useServerFn(createGatewayKey);
  const revoke = useServerFn(revokeGatewayKey);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);

  const keys = useQuery({ queryKey: ["gateway-keys"], queryFn: () => list({ data: undefined as never }) });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">IoT gateway API keys</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input
            className="h-11 max-w-xs"
            placeholder="Gateway name (e.g. Anand shed 1)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            className="min-h-11"
            disabled={name.trim().length < 2}
            onClick={() => {
              void create({ data: { name: name.trim() } })
                .then((r) => {
                  setFresh(r.key);
                  setName("");
                  void qc.invalidateQueries({ queryKey: ["gateway-keys"] });
                  toast.success("Key created — copy it now, it is shown once");
                })
                .catch((e: Error) => toast.error(e.message));
            }}
          >
            Create key
          </Button>
        </div>

        {fresh && (
          <pre className="overflow-auto rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs">{fresh}</pre>
        )}

        <ul className="divide-y rounded-xl border">
          {(keys.data ?? []).map((k) => (
            <li key={k.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span>
                {k.name}{" "}
                <span className="text-muted-foreground">{k.active ? "· active" : "· revoked"}</span>
              </span>
              {k.active && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void revoke({ data: { id: k.id } }).then(() => {
                      void qc.invalidateQueries({ queryKey: ["gateway-keys"] });
                      toast.success("Key revoked");
                    });
                  }}
                >
                  Revoke
                </Button>
              )}
            </li>
          ))}
          {(keys.data ?? []).length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">No gateway keys issued yet.</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

  );
}
