import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock, CheckCircle2, RotateCw } from "lucide-react";
import { COMPLIANCE_LABEL, complianceBadgeClass } from "@/lib/bshces-utils";
import { useAuth } from "@/hooks/useAuth";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/follow-ups")({
  head: () => ({ meta: [{ title: "Follow-ups — BSHCES" }] }),
  component: FollowUpsPage,
});

type Filter = "all" | "overdue" | "due_soon" | "upcoming";

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
        .select("id, household_id, evaluation_date, compliance_status, total_score, max_score, follow_up_date, follow_up_completed, households(head_of_family, purok, household_number)" as any)
        .eq("follow_up_completed" as any, false)
        .not("follow_up_date" as any, "is", null)
        .order("follow_up_date" as any, { ascending: true });
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

  const reschedule = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string }) => {
      const { error } = await supabase.from("evaluations").update({ follow_up_date: date } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Follow-up rescheduled");
      qc.invalidateQueries({ queryKey: ["follow-ups"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((r) => r.households?.head_of_family?.toLowerCase().includes(s));
    }
    if (filter !== "all") {
      rows = rows.filter((r) => {
        const d = new Date(r.follow_up_date); d.setHours(0, 0, 0, 0);
        const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
        if (filter === "overdue") return diff < 0;
        if (filter === "due_soon") return diff >= 0 && diff <= 7;
        if (filter === "upcoming") return diff > 7;
        return true;
      });
    }
    return rows;
  }, [data, filter, search]);

  const counts = useMemo(() => {
    const c = { overdue: 0, due_soon: 0, upcoming: 0 };
    (data ?? []).forEach((r) => {
      const d = new Date(r.follow_up_date); d.setHours(0, 0, 0, 0);
      const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
      if (diff < 0) c.overdue++;
      else if (diff <= 7) c.due_soon++;
      else c.upcoming++;
    });
    return c;
  }, [data]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Auto-suggested return visits</p>
        <h1 className="text-2xl font-bold">Follow-up Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Non-compliant households are scheduled 14 days out; partially compliant households 30 days out. Adjust or mark done as needed.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatTile label="Overdue" value={counts.overdue} tint="destructive" />
        <StatTile label="Due within 7 days" value={counts.due_soon} tint="warning" />
        <StatTile label="Upcoming" value={counts.upcoming} tint="primary" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Input placeholder="Search head of family…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
            <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All follow-ups</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="due_soon">Due within 7 days</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
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
                  <th>Status</th>
                  <th>Follow-up date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No follow-ups scheduled.</td></tr>
                ) : filtered.map((r) => {
                  const d = new Date(r.follow_up_date); d.setHours(0, 0, 0, 0);
                  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
                  const overdue = diff < 0;
                  const dueSoon = !overdue && diff <= 7;
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium">{r.households?.head_of_family}</div>
                        <div className="font-mono text-xs text-muted-foreground">{r.households?.household_number}</div>
                      </td>
                      <td>{r.households?.purok}</td>
                      <td>{r.evaluation_date}</td>
                      <td><span className={`rounded-full px-2 py-0.5 text-xs ${complianceBadgeClass(r.compliance_status)}`}>{COMPLIANCE_LABEL[r.compliance_status]}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            defaultValue={r.follow_up_date}
                            disabled={!canEdit}
                            onBlur={(e) => { if (e.target.value && e.target.value !== r.follow_up_date) reschedule.mutate({ id: r.id, date: e.target.value }); }}
                            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                          />
                          {overdue && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">Overdue {Math.abs(diff)}d</span>}
                          {dueSoon && <span className="rounded-full bg-[color:var(--warning)]/15 px-2 py-0.5 text-[10px] font-medium text-[color:var(--warning)]">Due in {diff}d</span>}
                        </div>
                      </td>
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
                  );
                })}
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
          <CalendarClock className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
