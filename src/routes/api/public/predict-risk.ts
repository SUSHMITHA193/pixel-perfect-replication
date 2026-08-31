import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { predictForAnimal, persistPrediction } from "@/lib/prediction.server";
import { verifyGatewayKey } from "@/lib/gateway-auth.server";

// Single integration point for the ML pipeline.
// Order of preference: external service at ML_API_URL -> on-board model over
// stored collar readings -> deterministic mock (demo animals with no data).
const SeriesPointSchema = z.object({
  date: z.string(),
  temperature: z.number(),
  activity: z.number(),
  rumination: z.number(),
  milk_yield: z.number(),
  scc: z.number(),
});

const PayloadSchema = z.object({
  animal_id: z.string(),
  time_series_data: z.array(SeriesPointSchema).max(365).optional(),
  static_attributes: z.record(z.string(), z.any()).optional(),
  mode: z.enum(["mock", "live"]).optional(),
  persist: z.boolean().optional(),
});

export const Route = createFileRoute("/api/public/predict-risk")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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

        const { animal_id, time_series_data, static_attributes, mode, persist } = parsed.data;

        const prediction = await predictForAnimal(animal_id, {
          series: time_series_data ?? [],
          statics: static_attributes ?? {},
          forceMock: mode === "mock",
        });

        // Writing results back to the herd requires a gateway API key.
        let stored: { prediction_id: string | null; alert_id: string | null } | undefined;
        if (persist) {
          const gateway = await verifyGatewayKey(request.headers.get("x-api-key"));
          if (!gateway) return Response.json({ error: "Unauthorized: persist requires a gateway API key" }, { status: 401 });
          stored = await persistPrediction(animal_id, prediction);
        }

        return Response.json({ ...prediction, ...(stored ? { stored } : {}) });
      },
    },
  },
});
