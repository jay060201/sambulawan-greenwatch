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
import { Camera, Loader2, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/evaluations/new")({
  head: () => ({ meta: [{ title: "New Evaluation — BSHCES" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    household: (s.household as string) ?? "",
    followup: s.followup === "1" || s.followup === true ? "1" : "",
  }),
  component: NewEvaluationPage,
});

type Status = "compliant" | "partially_compliant" | "non_compliant";

function NewEvaluationPage() {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const { household: presetHousehold, followup } = Route.useSearch();
  const isFollowUp = followup === "1" && !!presetHousehold;

  if (role !== "admin" && role !== "bhw") return <AccessDenied />;

  const [householdId, setHouseholdId] = useState<string>(presetHousehold || "");
  const [remarks, setRemarks] = useState("");
  const [answers, setAnswers] = useState<Record<string, Status>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  async function handlePhoto(itemId: string, file: File) {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setUploading((u) => ({ ...u, [itemId]: true }));
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}-${itemId}.${ext}`;
      const { error } = await supabase.storage.from("evaluation-evidence").upload(path, file, { upsert: true });
      if (error) throw error;
      setPhotos((p) => ({ ...p, [itemId]: path }));
      toast.success("Photo attached");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading((u) => ({ ...u, [itemId]: false }));
    }
  }

  async function removePhoto(itemId: string) {
    const path = photos[itemId];
    if (!path) return;
    await supabase.storage.from("evaluation-evidence").remove([path]);
    setPhotos((p) => { const n = { ...p }; delete n[itemId]; return n; });
  }

  const households = useQuery({
    queryKey: ["all-households"],
    queryFn: async () => (await supabase.from("households").select("id, head_of_family, household_number").eq("archived", false).order("household_number")).data ?? [],
  });

  const checklist = useQuery({
    queryKey: ["checklist", isFollowUp ? presetHousehold : "all"],
    queryFn: async () => {
      const { data: all } = await supabase
        .from("compliance_checklist")
        .select("*")
        .order("category")
        .order("sort_order");
      const items = all ?? [];
      if (!isFollowUp) return items;
      // Fetch most recent evaluation for household and keep only non-compliant items
      const { data: lastEv } = await supabase
        .from("evaluations")
        .select("id")
        .eq("household_id", presetHousehold)
        .order("evaluation_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!lastEv) return items;
      const { data: results } = await supabase
        .from("evaluation_results")
        .select("checklist_id, status")
        .eq("evaluation_id", lastEv.id);
      const pending = new Set((results ?? []).filter((r: any) => r.status !== "compliant").map((r: any) => r.checklist_id));
      return items.filter((c: any) => pending.has(c.id));
    },
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
        return { evaluation_id: ev.id, checklist_id: c.id, status: a, score, photo_url: photos[c.id] ?? null };
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
        <h1 className="text-2xl font-bold">{isFollowUp ? "Follow-up Evaluation" : "New Household Evaluation"}</h1>
        {isFollowUp && (
          <p className="mt-1 text-sm text-muted-foreground">
            Showing only the requirements this household has not yet complied with. Update the items they have now met.
          </p>
        )}
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
              <div key={item.id} className="grid grid-cols-1 items-start gap-3 py-3 md:grid-cols-[1fr_auto_auto]">
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
                <div className="flex items-center gap-2">
                  {photos[item.id] ? (
                    <div className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs">
                      <Camera className="h-3 w-3 text-primary" />
                      <span className="text-muted-foreground">Attached</span>
                      <button type="button" onClick={() => removePhoto(item.id)} className="ml-1 text-muted-foreground hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
                      {uploading[item.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                      <span>Evidence</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(item.id, f); e.target.value = ""; }}
                      />
                    </label>
                  )}
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