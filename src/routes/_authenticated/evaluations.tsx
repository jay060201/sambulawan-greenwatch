import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { COMPLIANCE_LABEL, complianceBadgeClass, exportCSV } from "@/lib/bshces-utils";
import { Download, PlusCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/evaluations")({
  head: () => ({ meta: [{ title: "Evaluations — BSHCES" }] }),
  component: EvaluationsRouteShell,
});

const PAGE = 15;

function EvaluationsRouteShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return pathname === "/evaluations" ? <EvaluationsPage /> : <Outlet />;
}

function EvaluationsPage() {
  const { role } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["evaluations", status, page, search],
    queryFn: async () => {
      let q = supabase
        .from("evaluations")
        .select("id, evaluation_date, total_score, max_score, compliance_status, approved, remarks, households(head_of_family, purok, household_number)", { count: "exact" });
      if (status !== "all") q = q.eq("compliance_status", status as any);
      q = q.order("evaluation_date", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
      const { data, count } = await q;
      let rows = data ?? [];
      if (search) {
        const s = search.toLowerCase();
        rows = rows.filter((r: any) => r.households?.head_of_family?.toLowerCase().includes(s));
      }
      return { rows, total: count ?? 0 };
    },
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Records</p>
          <h1 className="text-2xl font-bold">Evaluations</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportCSV("evaluations.csv", (data?.rows ?? []).map((r: any) => ({
            date: r.evaluation_date,
            head_of_family: r.households?.head_of_family,
            purok: r.households?.purok,
            score: `${r.total_score}/${r.max_score}`,
            status: r.compliance_status,
          })))}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          {(role === "admin" || role === "bhw") && (
            <Button asChild>
              <Link to="/evaluations/new"><PlusCircle className="mr-2 h-4 w-4" /> New Evaluation</Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Input placeholder="Search head of family…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="partially_compliant">Partially Compliant</SelectItem>
                <SelectItem value="non_compliant">Non-Compliant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-3">Date</th><th>Household</th><th>Purok</th><th>Score</th><th>Status</th><th>Approved</th></tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
                ) : data?.rows.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No evaluations found.</td></tr>
                ) : data?.rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">{r.evaluation_date}</td>
                    <td><div className="font-medium">{r.households?.head_of_family}</div><div className="font-mono text-xs text-muted-foreground">{r.households?.household_number}</div></td>
                    <td>{r.households?.purok}</td>
                    <td className="font-semibold">{r.total_score}/{r.max_score}</td>
                    <td><span className={`rounded-full px-2 py-0.5 text-xs ${complianceBadgeClass(r.compliance_status)}`}>{COMPLIANCE_LABEL[r.compliance_status]}</span></td>
                    <td>{r.approved ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Page {page + 1} of {totalPages} · {data?.total ?? 0} evaluations</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}