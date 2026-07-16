import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ClipboardCheck, ShieldCheck, AlertTriangle, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { COMPLIANCE_LABEL, complianceBadgeClass } from "@/lib/bshces-utils";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — BSHCES" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { role } = useAuth();

  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [{ count: hh }, { count: ev }, evals, recent] = await Promise.all([
        supabase.from("households").select("*", { count: "exact", head: true }),
        supabase.from("evaluations").select("*", { count: "exact", head: true }),
        supabase.from("evaluations").select("compliance_status"),
        supabase
          .from("evaluations")
          .select("id, evaluation_date, compliance_status, total_score, max_score, households(head_of_family, purok)")
          .order("evaluation_date", { ascending: false })
          .limit(8),
      ]);

      const counts = { compliant: 0, partially_compliant: 0, non_compliant: 0 };
      (evals.data ?? []).forEach((e: any) => {
        counts[e.compliance_status as keyof typeof counts]++;
      });
      const total = (evals.data ?? []).length || 1;
      const rate = Math.round((counts.compliant / total) * 100);

      return {
        households: hh ?? 0,
        evaluations: ev ?? 0,
        complianceRate: rate,
        nonCompliant: counts.non_compliant,
        breakdown: counts,
        recent: recent.data ?? [],
      };
    },
  });

  const cat = useQuery({
    queryKey: ["dashboard-category"],
    queryFn: async () => {
      const { data } = await supabase
        .from("evaluation_results")
        .select("status, compliance_checklist(category)");
      const agg: Record<string, { c: number; p: number; n: number }> = {
        waste_segregation: { c: 0, p: 0, n: 0 },
        sanitation: { c: 0, p: 0, n: 0 },
        gardening: { c: 0, p: 0, n: 0 },
        ordinance: { c: 0, p: 0, n: 0 },
      };
      (data ?? []).forEach((r: any) => {
        const cat = r.compliance_checklist?.category;
        if (!cat || !agg[cat]) return;
        if (r.status === "compliant") agg[cat].c++;
        else if (r.status === "partially_compliant") agg[cat].p++;
        else agg[cat].n++;
      });
      return Object.entries(agg).map(([k, v]) => ({
        category: k.replace("_", " "),
        Compliant: v.c,
        Partial: v.p,
        "Non-Compliant": v.n,
      }));
    },
  });

  const followUps = useQuery({
    queryKey: ["dashboard-follow-ups"],
    queryFn: async () => {
      const { data } = await supabase
        .from("evaluations")
        .select("id, household_id, follow_up_date, compliance_status, households(head_of_family, purok)" as any)
        .eq("follow_up_completed" as any, false)
        .not("follow_up_date" as any, "is", null)
        .order("follow_up_date" as any, { ascending: true })
        .limit(6);
      return (data ?? []) as any[];
    },
  });

  const pieData = stats.data
    ? [
        { name: "Compliant", value: stats.data.breakdown.compliant, color: "var(--chart-1)" },
        { name: "Partial", value: stats.data.breakdown.partially_compliant, color: "var(--chart-3)" },
        { name: "Non-Compliant", value: stats.data.breakdown.non_compliant, color: "var(--chart-4)" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground capitalize">{role} dashboard</p>
        <h1 className="text-3xl font-bold">Welcome to BSHCES</h1>
        <p className="text-sm text-muted-foreground">
          Barangay Sambulawan household compliance overview.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Home} label="Total Households" value={stats.data?.households ?? "—"} tint="primary" />
        <StatCard icon={ClipboardCheck} label="Total Evaluations" value={stats.data?.evaluations ?? "—"} tint="accent" />
        <StatCard icon={ShieldCheck} label="Compliance Rate" value={stats.data ? `${stats.data.complianceRate}%` : "—"} tint="success" />
        <StatCard icon={AlertTriangle} label="Non-Compliant" value={stats.data?.nonCompliant ?? "—"} tint="destructive" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Compliance Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cat.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Compliant" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Partial" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Non-Compliant" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Evaluations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2">Date</th>
                  <th>Head of Family</th>
                  <th>Purok</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(stats.data?.recent ?? []).map((r: any) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2">{r.evaluation_date}</td>
                    <td>{r.households?.head_of_family}</td>
                    <td>{r.households?.purok}</td>
                    <td>
                      {r.total_score}/{r.max_score}
                    </td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${complianceBadgeClass(r.compliance_status)}`}>
                        {COMPLIANCE_LABEL[r.compliance_status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tint }: { icon: any; label: string; value: any; tint: string }) {
  const tintMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/20 text-accent-foreground",
    success: "bg-[color:var(--success)]/15 text-[color:var(--success)]",
    destructive: "bg-destructive/15 text-destructive",
  };
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid h-12 w-12 place-items-center rounded-xl ${tintMap[tint]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}