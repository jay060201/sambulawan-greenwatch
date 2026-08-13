import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, CheckCircle2, RotateCw } from "lucide-react";
import { COMPLIANCE_LABEL, complianceBadgeClass } from "@/lib/bshces-utils";
import { useAuth } from "@/hooks/useAuth";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/follow-ups")({
  head: () => ({ meta: [{ title: "Follow-ups — BSHCES" }] }),
  component: FollowUpsPage,
});

type Filter = "all" | "non_compliant" | "partially_compliant";

function FollowUpsPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const canEdit = role === "admin" || role === "bhw";
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["follow-ups"],
    queryFn: async () => {
      const { data } = await supabase
        .from("evaluations")
        .select("id, household_id, evaluation_date, compliance_status, total_score, max_score, follow_up_completed, households(head_of_family, purok, household_number)" as any)
        .eq("follow_up_completed" as any, false)
        .neq("compliance_status", "compliant")
        .order("evaluation_date", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const markDone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("evaluations").update({ follow_up_completed: true } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Follow-up marked complete");
      qc.invalidateQueries({ queryKey: ["follow-ups"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((r) => r.households?.head_of_family?.toLowerCase().includes(s));
    }
    if (filter !== "all") {
      rows = rows.filter((r) => r.compliance_status === filter);
    }
    return rows;
  }, [data, filter, search]);

  const counts = useMemo(() => {
    const c = { total: 0, non_compliant: 0, partially_compliant: 0 };
    (data ?? []).forEach((r) => {
      c.total++;
      if (r.compliance_status === "non_compliant") c.non_compliant++;
      else if (r.compliance_status === "partially_compliant") c.partially_compliant++;
    });
    return c;
  }, [data]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Households needing follow-up</p>
        <h1 className="text-2xl font-bold">Follow-ups</h1>
        <p className="text-sm text-muted-foreground">
          Households that have not yet met all requirements. Re-evaluate them on their unmet criteria, or mark done once complied.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatTile label="Needs follow-up" value={counts.total} tint="primary" />
        <StatTile label="Non-compliant" value={counts.non_compliant} tint="destructive" />
        <StatTile label="Partially compliant" value={counts.partially_compliant} tint="warning" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Input placeholder="Search head of family…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
            <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All households</SelectItem>
                <SelectItem value="non_compliant">Non-compliant</SelectItem>
                <SelectItem value="partially_compliant">Partially compliant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Household</th>
                  <th>Purok</th>
                  <th>Last evaluation</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No households need follow-up. 🎉</td></tr>
                ) : filtered.map((r) => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium">{r.households?.head_of_family}</div>
                        <div className="font-mono text-xs text-muted-foreground">{r.households?.household_number}</div>
                      </td>
                      <td>{r.households?.purok}</td>
                      <td>{r.evaluation_date}</td>
                      <td>{r.total_score}/{r.max_score}</td>
                      <td><span className={`rounded-full px-2 py-0.5 text-xs ${complianceBadgeClass(r.compliance_status)}`}>{COMPLIANCE_LABEL[r.compliance_status]}</span></td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <>
                              <Button asChild size="sm" variant="secondary">
                                <Link to="/evaluations/new" search={{ household: r.household_id, followup: "1" } as any}>
                                  <RotateCw className="mr-1 h-3.5 w-3.5" /> Re-evaluate
                                </Link>
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => markDone.mutate(r.id)} disabled={markDone.isPending}>
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Done
                              </Button>
                            </>
                          )}
                        </div>
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

function StatTile({ label, value, tint }: { label: string; value: number; tint: "destructive" | "warning" | "primary" }) {
  const tints: Record<string, string> = {
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-[color:var(--warning)]/10 text-[color:var(--warning)]",
    primary: "bg-primary/10 text-primary",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${tints[tint]}`}>
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
