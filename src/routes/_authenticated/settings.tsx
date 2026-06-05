import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AccessDenied } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_LABEL } from "@/lib/bshces-utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — BSHCES" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { role } = useAuth();
  if (role !== "admin") return <AccessDenied />;

  const checklist = useQuery({
    queryKey: ["settings-checklist"],
    queryFn: async () => (await supabase.from("compliance_checklist").select("*").order("category").order("sort_order")).data ?? [],
  });

  const grouped: Record<string, any[]> = {};
  (checklist.data ?? []).forEach((c: any) => { (grouped[c.category] ??= []).push(c); });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-bold">System Settings</h1>
        <p className="text-sm text-muted-foreground">Compliance checklist and category configuration.</p>
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <Card key={cat}>
          <CardHeader><CardTitle>{CATEGORY_LABEL[cat]}</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="pb-2">#</th><th>Item</th><th>Points</th></tr></thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={it.id} className="border-t border-border">
                    <td className="py-2 text-muted-foreground">{i + 1}</td>
                    <td className="font-medium">{it.item_name}</td>
                    <td><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{it.points} pts</span></td>
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