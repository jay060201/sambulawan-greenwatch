import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Printer, Eye } from "lucide-react";
import { exportCSV, COMPLIANCE_LABEL, complianceBadgeClass } from "@/lib/bshces-utils";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — BSHCES" }] }),
  component: ReportsPage,
});

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function ReportsPage() {
  const now = new Date();
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth());
  const [preview, setPreview] = useState<{ title: string; rows: any[] } | null>(null);

  const allEvals = useQuery({
    queryKey: ["all-evals-report"],
    queryFn: async () => {
      const { data } = await supabase
        .from("evaluations")
        .select("evaluation_date, total_score, max_score, compliance_status, households(head_of_family, purok, household_number)")
        .order("evaluation_date", { ascending: false });
      return data ?? [];
    },
  });

  const years = useMemo(() => {
    const ys = new Set<number>([now.getFullYear()]);
    (allEvals.data ?? []).forEach((r: any) => ys.add(new Date(r.evaluation_date).getFullYear()));
    return Array.from(ys).sort((a, b) => b - a);
  }, [allEvals.data]);

  const periodFilter = (rows: any[]) =>
    rows.filter((r) => {
      const d = new Date(r.evaluation_date);
      if (d.getFullYear() !== year) return false;
      if (period === "monthly" && d.getMonth() !== month) return false;
      return true;
    });

  const periodLabel = period === "monthly" ? `${MONTHS[month]} ${year}` : `Year ${year}`;

  const reports = [
    { title: "Household Compliance Report", desc: "All evaluations with scores and statuses.", filter: (r: any[]) => r },
    { title: "Non-Compliant Households", desc: "Evaluations flagged as non-compliant.", filter: (r: any[]) => r.filter((x) => x.compliance_status === "non_compliant") },
    { title: "Top Compliant Households", desc: "Recent compliant evaluations.", filter: (r: any[]) => r.filter((x) => x.compliance_status === "compliant") },
    { title: "Partially Compliant Households", desc: "Households that need follow-up.", filter: (r: any[]) => r.filter((x) => x.compliance_status === "partially_compliant") },
  ];

  const buildRows = (filter: (r: any[]) => any[]) =>
    filter(periodFilter(allEvals.data ?? [])).map((r) => ({
      date: r.evaluation_date,
      household_number: r.households?.household_number,
      head_of_family: r.households?.head_of_family,
      purok: r.households?.purok,
      score: `${r.total_score}/${r.max_score}`,
      status: COMPLIANCE_LABEL[r.compliance_status],
      _raw: r,
    }));

  const download = (filter: (r: any[]) => any[], name: string) => {
    const rows = buildRows(filter).map(({ _raw, ...rest }) => rest);
    exportCSV(`${name}_${periodLabel.replace(/\s+/g, "_")}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Documents</p>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Generate separate monthly or yearly reports with print preview.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Reporting Period</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-[10rem]">
            <p className="text-xs text-muted-foreground mb-1">Period type</p>
            <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly Report</SelectItem>
                <SelectItem value="yearly">Yearly Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[8rem]">
            <p className="text-xs text-muted-foreground mb-1">Year</p>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {period === "monthly" && (
            <div className="min-w-[10rem]">
              <p className="text-xs text-muted-foreground mb-1">Month</p>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <p className="ml-auto text-sm text-muted-foreground">Showing: <span className="font-medium text-foreground">{periodLabel}</span></p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> {r.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{r.desc}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {buildRows(r.filter).length} record(s) in {periodLabel}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreview({ title: r.title, rows: buildRows(r.filter) })}>
                  <Eye className="mr-2 h-4 w-4" /> Preview
                </Button>
                <Button size="sm" onClick={() => download(r.filter, r.title.toLowerCase().replace(/\s+/g, "_"))}>
                  <Download className="mr-2 h-4 w-4" /> CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto print:!max-w-none print:!max-h-none print:overflow-visible print:!shadow-none print:!border-0">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span>Print Preview — {preview?.title}</span>
              <Button size="sm" onClick={() => window.print()} className="no-print">
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div id="report-print-area" className="space-y-3">
            <div className="border-b border-border pb-3 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Barangay Sambulawan</p>
              <h2 className="text-lg font-bold">Household Compliance Evaluation System</h2>
              <p className="text-sm">{preview?.title} — {periodLabel}</p>
              <p className="text-xs text-muted-foreground">Generated: {new Date().toLocaleString()}</p>
            </div>
            {preview && preview.rows.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No records for {periodLabel}.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2">Date</th><th>HH #</th><th>Head of Family</th><th>Purok</th><th>Score</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview?.rows.map((r, i) => (
                    <tr key={i} className="border-b border-border/60">
                      <td className="p-2">{r.date}</td>
                      <td className="font-mono text-xs">{r.household_number}</td>
                      <td className="font-medium">{r.head_of_family}</td>
                      <td>{r.purok}</td>
                      <td>{r.score}</td>
                      <td><span className={`rounded-full px-2 py-0.5 text-xs ${complianceBadgeClass(r._raw.compliance_status)}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}