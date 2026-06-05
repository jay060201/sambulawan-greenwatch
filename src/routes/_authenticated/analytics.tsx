import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { CATEGORY_LABEL } from "@/lib/bshces-utils";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — BSHCES" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const monthly = useQuery({
    queryKey: ["analytics-monthly"],
    queryFn: async () => {
      const { data } = await supabase.from("evaluations").select("evaluation_date, compliance_status");
      const m: Record<string, { Compliant: number; Partial: number; "Non-Compliant": number }> = {};
      (data ?? []).forEach((e: any) => {
        const key = e.evaluation_date.slice(0, 7);
        m[key] ??= { Compliant: 0, Partial: 0, "Non-Compliant": 0 };
        if (e.compliance_status === "compliant") m[key].Compliant++;
        else if (e.compliance_status === "partially_compliant") m[key].Partial++;
        else m[key]["Non-Compliant"]++;
      });
      return Object.entries(m).sort(([a],[b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v }));
    },
  });

  const purok = useQuery({
    queryKey: ["analytics-purok"],
    queryFn: async () => {
      const { data } = await supabase.from("evaluations").select("compliance_status, households(purok)");
      const m: Record<string, { total: number; compliant: number }> = {};
      (data ?? []).forEach((e: any) => {
        const p = e.households?.purok ?? "Unknown";
        m[p] ??= { total: 0, compliant: 0 };
        m[p].total++;
        if (e.compliance_status === "compliant") m[p].compliant++;
      });
      return Object.entries(m).sort(([a],[b]) => a.localeCompare(b)).map(([purok, v]) => ({
        purok, rate: Math.round((v.compliant / v.total) * 100), evaluations: v.total,
      }));
    },
  });

  const category = useQuery({
    queryKey: ["analytics-category-radar"],
    queryFn: async () => {
      const { data } = await supabase.from("evaluation_results").select("score, status, compliance_checklist(category, points)");
      const m: Record<string, { score: number; max: number }> = {};
      (data ?? []).forEach((r: any) => {
        const c = r.compliance_checklist?.category;
        if (!c) return;
        m[c] ??= { score: 0, max: 0 };
        m[c].score += r.score;
        m[c].max += r.compliance_checklist.points;
      });
      return Object.entries(m).map(([k, v]) => ({
        category: CATEGORY_LABEL[k], score: Math.round((v.score / v.max) * 100),
      }));
    },
  });

  const top = useQuery({
    queryKey: ["analytics-top-households"],
    queryFn: async () => {
      const { data } = await supabase
        .from("evaluations")
        .select("total_score, max_score, households(head_of_family, purok)")
        .order("evaluation_date", { ascending: false });
      const m: Record<string, { name: string; purok: string; sum: number; max: number; n: number }> = {};
      (data ?? []).forEach((e: any) => {
        const k = e.households?.head_of_family ?? "—";
        m[k] ??= { name: k, purok: e.households?.purok ?? "—", sum: 0, max: 0, n: 0 };
        m[k].sum += e.total_score; m[k].max += e.max_score; m[k].n++;
      });
      return Object.values(m).map((v) => ({ ...v, rate: Math.round((v.sum / v.max) * 100) }))
        .sort((a, b) => b.rate - a.rate).slice(0, 10);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Insights</p>
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Monthly Evaluation Trends</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Compliant" stroke="var(--chart-1)" strokeWidth={2} />
                <Line type="monotone" dataKey="Partial" stroke="var(--chart-3)" strokeWidth={2} />
                <Line type="monotone" dataKey="Non-Compliant" stroke="var(--chart-4)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Purok Performance (% Compliant)</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={purok.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="purok" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="rate" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Category Score Distribution</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={category.data ?? []}>
                <PolarGrid />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar dataKey="score" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.5} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top 10 Compliant Households</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="pb-2">#</th><th>Head of Family</th><th>Purok</th><th>Rate</th></tr>
              </thead>
              <tbody>
                {(top.data ?? []).map((r, i) => (
                  <tr key={r.name} className="border-t border-border">
                    <td className="py-2 text-muted-foreground">{i + 1}</td>
                    <td className="font-medium">{r.name}</td>
                    <td>{r.purok}</td>
                    <td><span className="font-semibold text-[color:var(--success)]">{r.rate}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}