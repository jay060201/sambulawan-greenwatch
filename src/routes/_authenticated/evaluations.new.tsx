import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AccessDenied } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_LABEL } from "@/lib/bshces-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/evaluations/new")({
  head: () => ({ meta: [{ title: "New Evaluation — BSHCES" }] }),
  component: NewEvaluationPage,
});

type Status = "compliant" | "partially_compliant" | "non_compliant";

function NewEvaluationPage() {
  const { role, user } = useAuth();
  const navigate = useNavigate();

  if (role !== "admin" && role !== "bhw") return <AccessDenied />;

  const [householdId, setHouseholdId] = useState<string>("");
  const [remarks, setRemarks] = useState("");
  const [answers, setAnswers] = useState<Record<string, Status>>({});

  const households = useQuery({
    queryKey: ["all-households"],
    queryFn: async () => (await supabase.from("households").select("id, head_of_family, household_number").eq("archived", false).order("household_number")).data ?? [],
  });

  const checklist = useQuery({
    queryKey: ["checklist"],
    queryFn: async () => (await supabase.from("compliance_checklist").select("*").order("category").order("sort_order")).data ?? [],
  });

  const grouped = useMemo(() => {
    const m: Record<string, any[]> = {};
    (checklist.data ?? []).forEach((c: any) => { (m[c.category] ??= []).push(c); });
    return m;
  }, [checklist.data]);

  const totals = useMemo(() => {
    let total = 0, max = 0;
    (checklist.data ?? []).forEach((c: any) => {
      max += c.points;
      const a = answers[c.id];
      if (a === "compliant") total += c.points;
      else if (a === "partially_compliant") total += Math.floor(c.points / 2);
    });
    return { total, max };
  }, [answers, checklist.data]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!householdId) throw new Error("Choose a household");
      if (!user) throw new Error("Not signed in");
      const ratio = totals.max ? totals.total / totals.max : 0;
      const status: Status = ratio >= 0.85 ? "compliant" : ratio >= 0.5 ? "partially_compliant" : "non_compliant";

      const { data: ev, error: e1 } = await supabase
        .from("evaluations")
        .insert({
          household_id: householdId,
          evaluator_id: user.id,
          total_score: totals.total,
          max_score: totals.max,
          compliance_status: status,
          remarks,
        })
        .select()
        .single();
      if (e1) throw e1;

      const rows = (checklist.data ?? []).map((c: any) => {
        const a: Status = answers[c.id] ?? "non_compliant";
        const score = a === "compliant" ? c.points : a === "partially_compliant" ? Math.floor(c.points / 2) : 0;
        return { evaluation_id: ev.id, checklist_id: c.id, status: a, score };
      });
      const { error: e2 } = await supabase.from("evaluation_results").insert(rows);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Evaluation submitted");
      navigate({ to: "/evaluations" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">BHW Module</p>
        <h1 className="text-2xl font-bold">New Household Evaluation</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Household</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Select Household</Label>
            <Select value={householdId} onValueChange={setHouseholdId}>
              <SelectTrigger><SelectValue placeholder="Pick household…" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {households.data?.map((h: any) => (
                  <SelectItem key={h.id} value={h.id}>{h.household_number} — {h.head_of_family}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground">Live Score</p>
            <p className="text-3xl font-bold">{totals.total}<span className="text-base font-normal text-muted-foreground">/{totals.max}</span></p>
          </div>
        </CardContent>
      </Card>

      {Object.entries(grouped).map(([cat, items]) => (
        <Card key={cat}>
          <CardHeader><CardTitle>{CATEGORY_LABEL[cat]}</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-1 items-center gap-3 py-3 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-medium">{item.item_name}</p>
                  <p className="text-xs text-muted-foreground">{item.points} points</p>
                </div>
                <div className="flex gap-2">
                  {(["compliant","partially_compliant","non_compliant"] as Status[]).map((s) => (
                    <Button
                      key={s}
                      type="button"
                      size="sm"
                      variant={answers[item.id] === s ? "default" : "outline"}
                      onClick={() => setAnswers({ ...answers, [item.id]: s })}
                    >
                      {s === "compliant" ? "C" : s === "partially_compliant" ? "P" : "N"}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader><CardTitle>Remarks</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional notes from the evaluator…" />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate({ to: "/evaluations" })}>Cancel</Button>
        <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
          {submit.isPending ? "Submitting…" : "Submit Evaluation"}
        </Button>
      </div>
    </div>
  );
}