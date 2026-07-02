import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { AccessDenied } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "User Management — BSHCES" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { role } = useAuth();
  const qc = useQueryClient();

  if (role !== "admin") return <AccessDenied />;

  const { data, isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("*");
      const roleMap: Record<string, AppRole> = {};
      (roles ?? []).forEach((r: any) => { roleMap[r.user_id] = r.role; });
      return (profiles ?? []).map((p: any) => ({ ...p, role: roleMap[p.id] ?? null }));
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ userId, newStatus }: { userId: string; newStatus: string }) => {
      const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.newStatus === "approved" ? "Access approved" : "Access revoked");
      qc.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusBadge = (s: string) =>
    s === "approved"
      ? "bg-emerald-500/15 text-emerald-600"
      : s === "pending"
      ? "bg-amber-500/15 text-amber-600"
      : "bg-destructive/15 text-destructive";

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>All Users</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-3">Full Name</th><th>Username</th><th>Status</th><th>Role</th><th>Joined</th><th className="p-3 text-right">Access</th></tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
                ) : data?.map((u: any) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="p-3 font-medium">{u.full_name}</td>
                    <td className="text-muted-foreground">{u.username}</td>
                    <td><span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusBadge(u.status)}`}>{u.status}</span></td>
                    <td>
                      <Select value={u.role ?? "viewer"} onValueChange={(v) => updateRole.mutate({ userId: u.id, newRole: v as AppRole })}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="bhw">BHW</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      {u.status === "approved" ? (
                        <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ userId: u.id, newStatus: "revoked" })}>
                          <X className="mr-1 h-3.5 w-3.5" /> Revoke
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => updateStatus.mutate({ userId: u.id, newStatus: "approved" })}>
                          <Check className="mr-1 h-3.5 w-3.5" /> Approve
                        </Button>
                      )}
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