import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload, FilePlus2 } from "lucide-react";
import { useStore, type LabRecord } from "@/lib/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "Data Upload — MastiGuard" },
      {
        name: "description",
        content: "Enter lab SCC results and treatment records manually, or bulk import them from a CSV file.",
      },
      { property: "og:title", content: "Data Upload — MastiGuard" },
      { property: "og:description", content: "Manual entry and CSV import for SCC and treatment records." },
    ],
  }),
  component: DataPage,
});

function DataPage() {
  const { animals, records, addRecords } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    animal_id: animals[0]?.id ?? "",
    type: "SCC lab result" as LabRecord["type"],
    value: "",
    date: "2026-08-27",
    note: "",
  });

  const handleCsv = async (file: File) => {
    const text = await file.text();
    const [header, ...lines] = text.trim().split(/\r?\n/);
    const cols = (header ?? "").split(",").map((c) => c.trim().toLowerCase());
    const parsed: LabRecord[] = lines
      .filter(Boolean)
      .map((line, i) => {
        const cells = line.split(",").map((c) => c.trim());
        const get = (name: string) => cells[cols.indexOf(name)] ?? "";
        return {
          id: `CSV-${Date.now()}-${i}`,
          animal_id: get("animal_id") || animals[0]?.id || "",
          type: (get("type") === "Treatment" ? "Treatment" : "SCC lab result") as LabRecord["type"],
          value: get("value"),
          date: get("date") || "2026-08-27",
          note: get("note"),
        };
      });
    addRecords(parsed);
    toast.success(`Imported ${parsed.length} records`);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Data upload</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FilePlus2 className="size-4" /> Manual entry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Animal</Label>
              <select
                value={form.animal_id}
                onChange={(e) => setForm({ ...form, animal_id: e.target.value })}
                className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              >
                {animals.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.tag})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Record type</Label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as LabRecord["type"] })}
                className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option>SCC lab result</option>
                <option>Treatment</option>
              </select>
            </div>
            <div>
              <Label>Value</Label>
              <Input
                className="h-11"
                placeholder="e.g. 420k cells/ml or Cephalexin 500mg"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                className="h-11"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Note</Label>
              <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <Button
              className="min-h-11 w-full"
              onClick={() => {
                if (!form.value) {
                  toast.error("Value is required");
                  return;
                }
                addRecords([{ id: `M-${Date.now()}`, ...form }]);
                toast.success("Record saved");
                setForm({ ...form, value: "", note: "" });
              }}
            >
              Save record
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="size-4" /> CSV import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Expected header: <code>animal_id,type,value,date,note</code>
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleCsv(f);
              }}
            />
            <Button variant="outline" className="min-h-11 w-full" onClick={() => fileRef.current?.click()}>
              Choose CSV file
            </Button>
            <div className="max-h-80 space-y-2 overflow-auto">
              {records.map((r) => (
                <div key={r.id} className="rounded-lg border p-2 text-sm">
                  <span className="font-semibold">{r.animal_id}</span> · {r.type} · {r.value} · {r.date}
                </div>
              ))}
              {records.length === 0 && <p className="text-sm text-muted-foreground">No records yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
