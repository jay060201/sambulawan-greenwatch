import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { exportCSV } from "@/lib/bshces-utils";
import { PUROKS } from "@/lib/bshces-utils";
import { Download, PlusCircle, Trash2, ClipboardCheck, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/households")({
  head: () => ({ meta: [{ title: "Households — BSHCES" }] }),
  component: HouseholdsPage,
});

const PAGE = 10;

function HouseholdsPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [purok, setPurok] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["households", search, purok, page],
    queryFn: async () => {
      let q = supabase.from("households").select("*", { count: "exact" }).eq("archived", false);
      if (purok !== "all") q = q.eq("purok", purok);
      if (search) {
        const s = search.trim().replace(/[,()]/g, " ");
        q = q.or(
          `head_of_family.ilike.%${s}%,household_number.ilike.%${s}%,address.ilike.%${s}%,purok.ilike.%${s}%`
        );
      }
      q = q.order("head_of_family", { ascending: true }).range(page * PAGE, page * PAGE + PAGE - 1);
      const { data, count } = await q;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  const addMut = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("households").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Household added");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["households"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("households").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["households"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const editMut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("households").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Household updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["households"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canWrite = role === "admin" || role === "bhw";
  const canDelete = role === "admin";
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Records</p>
          <h1 className="text-2xl font-bold">Households</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportCSV("households.csv", data?.rows ?? [])}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          {canWrite && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Household
                </Button>
              </DialogTrigger>
              <HouseholdForm onSubmit={(v) => addMut.mutate(v)} />
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search name, HH #, purok, address…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="max-w-sm"
            />
            <Select value={purok} onValueChange={(v) => { setPurok(v); setPage(0); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter purok" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Puroks</SelectItem>
                {PUROKS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">HH #</th>
                  <th>Head of Family</th>
                  <th>Purok</th>
                  <th>Address</th>
                  <th>Members</th>
                  <th>Contact</th>
                  {canWrite && <th></th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
                ) : data?.rows.length === 0 ? (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No households found.</td></tr>
                ) : (
                  data?.rows.map((h: any) => (
                    <tr key={h.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{h.household_number}</td>
                      <td className="font-medium">{h.head_of_family}</td>
                      <td>{h.purok}</td>
                      <td className="text-muted-foreground">{h.address}</td>
                      <td>{h.total_members}</td>
                      <td className="text-muted-foreground">{h.contact_number}</td>
                      {canWrite && (
                        <td>
                          <div className="flex items-center gap-1">
                            <Button asChild variant="outline" size="sm">
                              <Link to="/evaluations/new" search={{ household: h.id } as any}>
                                <ClipboardCheck className="mr-1 h-3.5 w-3.5" /> Evaluate
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setEditing(h)} title="Edit household">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {canDelete && (
                              <Button variant="ghost" size="icon" onClick={() => delMut.mutate(h.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page + 1} of {totalPages} · {data?.total ?? 0} households
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <HouseholdForm
            initial={editing}
            title="Edit Household"
            onSubmit={(v) => editMut.mutate({ id: editing.id, patch: v })}
          />
        )}
      </Dialog>
    </div>
  );
}

function HouseholdForm({ onSubmit, initial, title = "Add Household" }: { onSubmit: (v: any) => void; initial?: any; title?: string }) {
  const [form, setForm] = useState({
    household_number: initial?.household_number ?? "",
    head_of_family: initial?.head_of_family ?? "",
    purok: initial?.purok ?? "Aquino",
    address: initial?.address ?? "",
    contact_number: initial?.contact_number ?? "",
    total_members: initial?.total_members ?? 1,
  });
  const phoneDigits = form.contact_number.replace(/\D/g, "");
  const phoneInvalid = form.contact_number.length > 0 && phoneDigits.length !== 11;
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3">
        <div><Label>Household Number</Label><Input value={form.household_number} onChange={(e) => setForm({ ...form, household_number: e.target.value })} /></div>
        <div><Label>Head of Family</Label><Input value={form.head_of_family} onChange={(e) => setForm({ ...form, head_of_family: e.target.value })} /></div>
        <div><Label>Purok</Label>
          <Select value={form.purok} onValueChange={(v) => setForm({ ...form, purok: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PUROKS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div>
          <Label>Contact Number</Label>
          <Input
            inputMode="numeric"
            maxLength={11}
            value={form.contact_number}
            onChange={(e) => setForm({ ...form, contact_number: e.target.value.replace(/\D/g, "").slice(0, 11) })}
            className={phoneInvalid ? "border-destructive focus-visible:ring-destructive" : ""}
            placeholder="09xxxxxxxxx"
          />
          {phoneInvalid && (
            <p className="mt-1 text-xs text-destructive">
              Contact number must be exactly 11 digits (currently {phoneDigits.length}).
            </p>
          )}
        </div>
        <div><Label>Total Members</Label><Input type="number" min={1} value={form.total_members} onChange={(e) => setForm({ ...form, total_members: Number(e.target.value) })} /></div>
      </div>
      <DialogFooter>
        <Button
          disabled={phoneInvalid || !form.household_number || !form.head_of_family || !form.address}
          onClick={() => onSubmit(form)}
        >
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}