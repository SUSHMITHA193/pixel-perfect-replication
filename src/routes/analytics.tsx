import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";
import { useStore } from "@/lib/app-store";
import { usageTrend } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Herd Analytics — MastiGuard" },
      {
        name: "description",
        content:
          "Herd-level risk trends, antimicrobial usage tracking and a cost-savings estimator for cooperatives.",
      },
      { property: "og:title", content: "Herd Analytics — MastiGuard" },
      { property: "og:description", content: "Risk trends, antimicrobial usage and cost savings." },
    ],
  }),
  component: Analytics,
});

function Analytics() {
  const { predictions } = useStore();
  const [caseCost, setCaseCost] = useState([6500]);
  const prevented = predictions.filter((p) => p.risk_category === "Moderate").length;
  const savings = prevented * caseCost[0];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Admin analytics</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average herd risk trend</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="risk_avg" stroke="var(--chart-1)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Antimicrobial treatments per month</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usageTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="treatments" fill="var(--chart-2)" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost-savings estimator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {prevented} moderate-risk animals caught early this cycle. Adjust the average cost of a clinical
            mastitis case.
          </p>
          <Slider value={caseCost} onValueChange={setCaseCost} min={2000} max={15000} step={500} />
          <p className="text-sm">Cost per case: ₹{caseCost[0].toLocaleString("en-IN")}</p>
          <p className="text-3xl font-bold text-primary">₹{savings.toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted-foreground">Estimated avoided treatment and milk-loss cost.</p>
        </CardContent>
      </Card>
    </div>
  );
}
