import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/app-store";
import { farms, type Animal } from "@/lib/mock-data";
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

const empty = (n: number): Animal => ({
  id: `A${String(n).padStart(3, "0")}`,
  tag: "",
  name: "",
  breed: "Gir",
  age: 4,
  lactation_number: 1,
  vaccinated: true,
  disease_history: [],
  collar_device_id: "",
  farm_id: farms[0]!.id,
});

function Registry() {
  const { animals, upsertAnimal } = useStore();
  const [form, setForm] = useState<Animal>(() => empty(animals.length + 1));
  const [open, setOpen] = useState(false);

  const set = <K extends keyof Animal>(k: K, v: Animal[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Animal registry</h1>
        <Button className="min-h-11" onClick={() => setOpen((o) => !o)}>
          <Plus className="size-4" /> Add animal
        </Button>
      </div>

      {open && (
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
                value={form.farm_id}
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
                onClick={() => {
                  if (!form.name || !form.tag) {
                    toast.error("Name and tag are required");
                    return;
                  }
                  upsertAnimal(form);
                  toast.success(`${form.name} added to the registry`);
                  setForm(empty(animals.length + 2));
                  setOpen(false);
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
