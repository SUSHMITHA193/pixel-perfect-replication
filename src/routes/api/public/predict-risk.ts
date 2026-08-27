import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { mockPrediction } from "@/lib/mock-data";

// Single integration point for the external ML pipeline.
// While the real service is not connected, this returns mock responses in
// the exact production schema so the UI needs no changes when wired up.
const PayloadSchema = z.object({
  animal_id: z.string(),
  time_series_data: z.array(z.record(z.string(), z.any())).optional(),
  static_attributes: z.record(z.string(), z.any()).optional(),
  mode: z.enum(["mock", "live"]).optional(),
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
        const prediction = mockPrediction(parsed.data.animal_id, parsed.data.mode === "live");
        return Response.json(prediction);
      },
    },
  },
});
