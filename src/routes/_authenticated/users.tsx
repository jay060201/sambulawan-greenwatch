import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { deleteUserAsAdmin } from "@/lib/api/users.functions";
import { AccessDenied } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, X, Trash2, Lock, Clock, UserCog, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "User Management — BSHCES" }] }),
  component: UsersPage,
});

type UserRow = {
  id: string;
  full_name: string;
  username: string;
  status: string;
  created_at: string;
  role: AppRole | null;
};

function StatusPill({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center rounded-full bg-[color:var(--success)]/15 px-2.5 py-1 text-xs font-semibold text-[color:var(--success)]">
        Active
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-semibold text-destructive">
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--warning)]/15 px-2.5 py-1 text-xs font-semibold text-[color:var(--warning)]">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

function RoleBadge({ role }: { role: AppRole | null }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold">
        <Lock className="h-3 w-3" /> Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
      {role ?? "Unassigned"}
    </span>
  );
}


function UsersPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  if (role !== "admin") return <AccessDenied />;

  const { data, isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("*");
      const roleMap: Record<string, AppRole> = {};
      (roles ?? []).forEach((r: any) => {
        roleMap[r.user_id] = r.role;
      });
      return (profiles ?? []).map((p: any) => ({ ...p, role: roleMap[p.id] ?? null })) as UserRow[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["all-users"] });


  const updateStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: "active" | "rejected" }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.status === "active" ? "Access approved" : "Registration rejected");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const res = await deleteUserAsAdmin({ data: { userId } });
      return res;
    },
    onSuccess: () => {
      toast.success("User account deleted");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const users = data ?? [];
  const pendingUsers = users.filter((u) => u.role !== "admin" && u.status !== "active");

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage user roles and system access permissions for BSHCES.
        </p>
      </div>

      {/* Pending approvals */}
      <div className="rounded-xl border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/5 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-[color:var(--warning)]" />
            <h2 className="text-lg font-semibold">Pending Approvals</h2>
          </div>
          {pendingUsers.length > 0 && (
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold">
              {pendingUsers.length} Pending
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and approve registration requests for BHW and Viewer accounts.
        </p>

        {pendingUsers.length > 0 ? (
          <div className="mt-4 space-y-3">
            {pendingUsers.map((u) => (
              <div
                key={u.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{u.full_name}</span>
                    {u.role && (
                      <span className="rounded border border-[color:var(--success)]/40 bg-[color:var(--success)]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--success)]">
                        {u.role === "viewer" ? "Viewer" : u.role === "bhw" ? "BHW" : u.role}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Username: {u.username} &bull; Registered: {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ userId: u.id, status: "active" })}
                  >
                    <Check className="mr-1 h-4 w-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ userId: u.id, status: "rejected" })}
                  >
                    <X className="mr-1 h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No registration requests waiting for review.</p>
        )}
      </div>

      {/* All users */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage user roles and system access permissions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Full Name</th>
                  <th>Username</th>
                  <th>Status</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No users registered yet.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isPending = u.status === "pending";
                    const isRejected = u.status === "rejected";
                    return (
                      <tr key={u.id} className="border-t border-border">
                        <td className="p-3 font-medium">{u.full_name}</td>
                        <td className="text-muted-foreground">{u.username}</td>
                        <td>
                          <StatusPill status={u.status} />
                        </td>
                        <td>
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            {u.role !== "admin" && (isPending || isRejected) && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={updateStatus.isPending}
                                onClick={() => updateStatus.mutate({ userId: u.id, status: "active" })}
                              >
                                Approve
                              </Button>
                            )}
                            {u.role !== "admin" && isPending && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/40"
                                disabled={updateStatus.isPending}
                                onClick={() => updateStatus.mutate({ userId: u.id, status: "rejected" })}
                              >
                                Reject
                              </Button>
                            )}
                            {u.role !== "admin" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                aria-label={`Delete ${u.full_name}`}
                                onClick={() => setDeleteTarget(u)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleteTarget?.full_name}&rsquo;s account, including their role and access.
              Evaluations they conducted are kept, but will no longer show them as the evaluator. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUser.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteUser.mutate(deleteTarget.id);
              }}
            >
              {deleteUser.isPending ? "Deleting…" : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
