import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Printer } from "lucide-react";
import { exportCSV, COMPLIANCE_LABEL } from "@/lib/bshces-utils";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — BSHCES" }] }),
  component: ReportsPage,
});

function ReportsPage() {
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

  const reports = [
    { title: "Household Compliance Report", desc: "All evaluations with scores and statuses.", filter: (r: any[]) => r },
    { title: "Non-Compliant Households", desc: "Evaluations flagged as non-compliant.", filter: (r: any[]) => r.filter((x) => x.compliance_status === "non_compliant") },
    { title: "Top Compliant Households", desc: "Most recent compliant evaluations.", filter: (r: any[]) => r.filter((x) => x.compliance_status === "compliant").slice(0, 50) },
    { title: "Monthly Evaluation Report", desc: "Evaluations grouped by date.", filter: (r: any[]) => r },
  ];

  const download = (filter: (r: any[]) => any[], name: string) => {
    const rows = filter(allEvals.data ?? []).map((r) => ({
      date: r.evaluation_date,
      household_number: r.households?.household_number,
      head_of_family: r.households?.head_of_family,
      purok: r.households?.purok,
      score: `${r.total_score}/${r.max_score}`,
      status: COMPLIANCE_LABEL[r.compliance_status],
    }));
    exportCSV(`${name}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Documents</p>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Export and print barangay compliance reports.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> {r.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{r.desc}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>
                <Button size="sm" onClick={() => download(r.filter, r.title.toLowerCase().replace(/\s+/g, "_"))}><Download className="mr-2 h-4 w-4" />Download CSV</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}