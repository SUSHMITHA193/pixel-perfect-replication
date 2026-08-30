import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/app-store";
import type { Animal } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/registry")({
  head: () => ({
    meta: [
      { title: "Animal Registry — MastiGuard" },
      {
        name: "description",
        content: "Register and edit dairy animals: breed, age, lactation, vaccination, history and collar ID.",
      },
      { property: "og:title", content: "Animal Registry — MastiGuard" },
      { property: "og:description", content: "Register and edit dairy animals and their collar devices." },
    ],
  }),
  component: Registry,
});

type Draft = Omit<Animal, "id">;

const empty = (farmId: string): Draft => ({
  tag: "",
  name: "",
  breed: "Gir",
  age: 4,
  lactation_number: 1,
  vaccinated: true,
  disease_history: [],
  collar_device_id: "",
  farm_id: farmId,
});

function Registry() {
  const { animals, upsertAnimal, farms, role } = useStore();
  const canEdit = role !== "Animal Health Authority";
  const [form, setForm] = useState<Draft>(() => empty(""));
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Animal registry</h1>
        {canEdit && (
          <Button className="min-h-11" onClick={() => setOpen((o) => !o)}>
            <Plus className="size-4" /> Add animal
          </Button>
        )}
      </div>

      {open && canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New animal</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="h-11" />
            </div>
            <div>
              <Label>Tag ID</Label>
              <Input value={form.tag} onChange={(e) => set("tag", e.target.value)} className="h-11" />
            </div>
            <div>
              <Label>Breed</Label>
              <Input value={form.breed} onChange={(e) => set("breed", e.target.value)} className="h-11" />
            </div>
            <div>
              <Label>Age (years)</Label>
              <Input
                type="number"
                value={form.age}
                onChange={(e) => set("age", Number(e.target.value))}
                className="h-11"
              />
            </div>
            <div>
              <Label>Lactation number</Label>
              <Input
                type="number"
                value={form.lactation_number}
                onChange={(e) => set("lactation_number", Number(e.target.value))}
                className="h-11"
              />
            </div>
            <div>
              <Label>Collar device ID</Label>
              <Input
                value={form.collar_device_id}
                onChange={(e) => set("collar_device_id", e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <Label>Farm</Label>
              <select
                value={form.farm_id || farms[0]?.id || ""}
                onChange={(e) => set("farm_id", e.target.value)}
                className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Disease history (comma separated)</Label>
              <Input
                value={form.disease_history.join(", ")}
                onChange={(e) =>
                  set(
                    "disease_history",
                    e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  )
                }
                className="h-11"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Switch checked={form.vaccinated} onCheckedChange={(v) => set("vaccinated", v)} />
              <Label>Vaccinated</Label>
            </div>
            <div className="sm:col-span-2">
              <Button
                className="min-h-11 w-full"
                disabled={saving}
                onClick={() => {
                  const farm_id = form.farm_id || farms[0]?.id;
                  if (!form.name || !form.tag) {
                    toast.error("Name and tag are required");
                    return;
                  }
                  if (!farm_id) {
                    toast.error("No farm available for your account");
                    return;
                  }
                  setSaving(true);
                  void upsertAnimal({ ...form, farm_id })
                    .then(() => {
                      toast.success(`${form.name} added to the registry`);
                      setForm(empty(farm_id));
                      setOpen(false);
                    })
                    .catch((e: unknown) =>
                      toast.error(e instanceof Error ? e.message : "Could not save animal"),
                    )
                    .finally(() => setSaving(false));
                }}
              >
                Save animal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="divide-y p-0">
          {animals.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No animals visible for your account yet.</p>
          )}
          {animals.map((a) => (
            <Link
              key={a.id}
              to="/animals/$id"
              params={{ id: a.id }}
              className="flex items-center justify-between gap-3 p-4 hover:bg-muted/60"
            >
              <div>
                <p className="font-semibold">{a.name}</p>
                <p className="text-xs text-muted-foreground">
                  {a.tag} · {a.breed} · {a.age}y · L{a.lactation_number} ·{" "}
                  {a.vaccinated ? "vaccinated" : "not vaccinated"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{a.collar_device_id}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
