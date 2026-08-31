import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyGatewayKey } from "@/lib/gateway-auth.server";
import { predictForAnimal, persistPrediction } from "@/lib/prediction.server";

// IoT collar ingestion. Callers authenticate with a gateway API key
// (header: x-api-key) issued to a cooperative from the Settings screen.
const ReadingSchema = z.object({
  animal_id: z.string().uuid().optional(),
  collar_device_id: z.string().min(1).max(64).optional(),
  timestamp: z.string().datetime().optional(),
  body_temperature: z.number().min(30).max(46).optional(),
  activity_level: z.number().int().min(0).max(100).optional(),
  rumination_minutes: z.number().int().min(0).max(1440).optional(),
  milk_yield: z.number().min(0).max(100).optional(),
  scc: z.number().int().min(0).max(20000).optional(),
  battery_level: z.number().int().min(0).max(100).optional(),
  gps_lat: z.number().min(-90).max(90).optional(),
  gps_lng: z.number().min(-180).max(180).optional(),
});

const PayloadSchema = z.object({
  readings: z.array(ReadingSchema).min(1).max(200),
  predict: z.boolean().optional(),
});

export const Route = createFileRoute("/api/public/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const gateway = await verifyGatewayKey(request.headers.get("x-api-key"));
        if (!gateway) return Response.json({ error: "Unauthorized" }, { status: 401 });

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const parsed = PayloadSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Resolve collar device ids to animals.
        const deviceIds = [
          ...new Set(parsed.data.readings.map((r) => r.collar_device_id).filter((v): v is string => !!v)),
        ];
        const deviceMap = new Map<string, string>();
        if (deviceIds.length > 0) {
          const { data } = await supabaseAdmin
            .from("animals")
            .select("id, collar_device_id")
            .in("collar_device_id", deviceIds);
          for (const a of data ?? []) if (a.collar_device_id) deviceMap.set(a.collar_device_id, a.id);
        }

        const rows: Array<Record<string, unknown>> = [];
        const rejected: Array<{ index: number; reason: string }> = [];

        parsed.data.readings.forEach((r, index) => {
          const animalId = r.animal_id ?? (r.collar_device_id ? deviceMap.get(r.collar_device_id) : undefined);
          if (!animalId) {
            rejected.push({ index, reason: "Unknown animal_id / collar_device_id" });
            return;
          }
          rows.push({
            animal_id: animalId,
            timestamp: r.timestamp ?? new Date().toISOString(),
            body_temperature: r.body_temperature ?? null,
            activity_level: r.activity_level ?? null,
            rumination_minutes: r.rumination_minutes ?? null,
            milk_yield: r.milk_yield ?? null,
            scc: r.scc ?? null,
            battery_level: r.battery_level ?? null,
            gps_lat: r.gps_lat ?? null,
            gps_lng: r.gps_lng ?? null,
            source: "collar",
          });
        });

        if (rows.length === 0) {
          return Response.json({ error: "No resolvable readings", rejected }, { status: 422 });
        }

        const { error } = await supabaseAdmin.from("sensor_readings").insert(rows as never);
        if (error) {
          console.error("[ingest] insert failed", error);
          return Response.json({ error: "Failed to store readings" }, { status: 500 });
        }

        const results: Array<{ animal_id: string; risk_score: number; risk_category: string; alert_id: string | null }> =
          [];

        if (parsed.data.predict !== false) {
          const animalIds = [...new Set(rows.map((r) => r.animal_id as string))].slice(0, 25);
          for (const animalId of animalIds) {
            const pred = await predictForAnimal(animalId);
            const { alert_id } = await persistPrediction(animalId, pred);
            results.push({
              animal_id: animalId,
              risk_score: pred.risk_score,
              risk_category: pred.risk_category,
              alert_id,
            });
          }
        }

        return Response.json({
          accepted: rows.length,
          rejected,
          gateway: gateway.name,
          predictions: results,
        });
      },
    },
  },
});
