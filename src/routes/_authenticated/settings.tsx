import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AccessDenied } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABEL } from "@/lib/bshces-utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — BSHCES" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { role } = useAuth();
  if (role !== "admin") return <AccessDenied />;
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, number>>({});

  const checklist = useQuery({
    queryKey: ["settings-checklist"],
    queryFn: async () => (await supabase.from("compliance_checklist").select("*").order("category").order("sort_order")).data ?? [],
  });

  useEffect(() => {
    if (checklist.data) {
      const d: Record<string, number> = {};
      checklist.data.forEach((c: any) => { d[c.id] = c.points; });
      setDrafts(d);
    }
  }, [checklist.data]);

  const savePoints = useMutation({
    mutationFn: async () => {
      const items = checklist.data ?? [];
      for (const it of items) {
        const next = drafts[it.id];
        if (next !== undefined && next !== it.points) {
          const { error } = await supabase.from("compliance_checklist").update({ points: next }).eq("id", it.id);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => { toast.success("Point values updated"); qc.invalidateQueries({ queryKey: ["settings-checklist"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const grouped: Record<string, any[]> = {};
  (checklist.data ?? []).forEach((c: any) => { (grouped[c.category] ??= []).push(c); });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Admin</p>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure compliance checklist and adjust point values.</p>
        </div>
        <Button onClick={() => savePoints.mutate()} disabled={savePoints.isPending}>
          <Save className="mr-2 h-4 w-4" /> {savePoints.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <Card key={cat}>
          <CardHeader><CardTitle>{CATEGORY_LABEL[cat]}</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="pb-2">#</th><th>Item</th><th className="w-32">Points</th></tr></thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={it.id} className="border-t border-border">
                    <td className="py-2 text-muted-foreground">{i + 1}</td>
                    <td className="font-medium">{it.item_name}</td>
                    <td>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        className="w-24"
                        value={drafts[it.id] ?? it.points}
                        onChange={(e) => setDrafts((d) => ({ ...d, [it.id]: Math.max(0, Number(e.target.value) || 0) }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}