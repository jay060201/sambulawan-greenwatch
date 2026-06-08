import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { COMPLIANCE_LABEL, complianceBadgeClass, exportCSV } from "@/lib/bshces-utils";
import { Download, PlusCircle, Eye, RotateCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORY_LABEL } from "@/lib/bshces-utils";

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
  const [viewId, setViewId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["evaluations", status, page, search],
    queryFn: async () => {
      let q = supabase
        .from("evaluations")
        .select("id, household_id, evaluation_date, total_score, max_score, compliance_status, approved, remarks, households(head_of_family, purok, household_number)", { count: "exact" });
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
                <tr><th className="p-3">Date</th><th>Household</th><th>Purok</th><th>Score</th><th>Status</th><th>Approved</th><th></th></tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
                ) : data?.rows.length === 0 ? (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No evaluations found.</td></tr>
                ) : data?.rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">{r.evaluation_date}</td>
                    <td><div className="font-medium">{r.households?.head_of_family}</div><div className="font-mono text-xs text-muted-foreground">{r.households?.household_number}</div></td>
                    <td>{r.households?.purok}</td>
                    <td className="font-semibold">{r.total_score}/{r.max_score}</td>
                    <td><span className={`rounded-full px-2 py-0.5 text-xs ${complianceBadgeClass(r.compliance_status)}`}>{COMPLIANCE_LABEL[r.compliance_status]}</span></td>
                    <td>{r.approved ? "✓" : "—"}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => setViewId(r.id)}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> View
                        </Button>
                        {(role === "admin" || role === "bhw") && r.compliance_status !== "compliant" && (
                          <Button asChild variant="secondary" size="sm">
                            <Link to="/evaluations/new" search={{ household: (r as any).household_id ?? "" } as any}>
                              <RotateCw className="mr-1 h-3.5 w-3.5" /> Follow-up
                            </Link>
                          </Button>
                        )}
                      </div>
                    </td>
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

      <EvaluationDetailDialog evaluationId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}

function EvaluationDetailDialog({ evaluationId, onClose }: { evaluationId: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["evaluation-detail", evaluationId],
    enabled: !!evaluationId,
    queryFn: async () => {
      const { data: ev } = await supabase
        .from("evaluations")
        .select("id, evaluation_date, total_score, max_score, compliance_status, remarks, households(head_of_family, household_number, purok)")
        .eq("id", evaluationId!)
        .maybeSingle();
      const { data: results } = await supabase
        .from("evaluation_results")
        .select("id, status, score, photo_url, compliance_checklist(item_name, category, points)")
        .eq("evaluation_id", evaluationId!);
      const withUrls = await Promise.all(
        (results ?? []).map(async (r: any) => {
          if (!r.photo_url) return { ...r, signedUrl: null };
          const { data: signed } = await supabase.storage
            .from("evaluation-evidence")
            .createSignedUrl(r.photo_url, 3600);
          return { ...r, signedUrl: signed?.signedUrl ?? null };
        }),
      );
      return { ev, results: withUrls };
    },
  });

  return (
    <Dialog open={!!evaluationId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evaluation Details</DialogTitle>
        </DialogHeader>
        {isLoading || !data?.ev ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div><p className="text-xs text-muted-foreground">Household</p><p className="font-medium">{(data.ev as any).households?.head_of_family}</p></div>
              <div><p className="text-xs text-muted-foreground">Purok</p><p className="font-medium">{(data.ev as any).households?.purok}</p></div>
              <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{data.ev.evaluation_date}</p></div>
              <div><p className="text-xs text-muted-foreground">Score</p><p className="font-medium">{data.ev.total_score}/{data.ev.max_score}</p></div>
            </div>
            {data.ev.remarks && (
              <div className="rounded-md bg-muted/50 p-3 text-sm"><span className="text-xs uppercase text-muted-foreground">Remarks: </span>{data.ev.remarks}</div>
            )}
            <div className="space-y-2">
              {data.results.map((r: any) => (
                <div key={r.id} className="flex items-start gap-3 rounded-md border border-border p-3">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{CATEGORY_LABEL[r.compliance_checklist?.category] ?? r.compliance_checklist?.category}</p>
                    <p className="font-medium">{r.compliance_checklist?.item_name}</p>
                    <p className="text-xs"><span className={`rounded-full px-2 py-0.5 ${complianceBadgeClass(r.status)}`}>{COMPLIANCE_LABEL[r.status]}</span> · {r.score} pts</p>
                  </div>
                  {r.signedUrl ? (
                    <a href={r.signedUrl} target="_blank" rel="noreferrer" className="shrink-0">
                      <img src={r.signedUrl} alt="evidence" className="h-20 w-20 rounded-md border border-border object-cover" />
                    </a>
                  ) : (
                    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground">No photo</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}