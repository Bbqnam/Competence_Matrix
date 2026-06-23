import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { fetchOperators, type Operator } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Pencil, Plus, Power, Download, Upload, Eye } from "lucide-react";
import { toast } from "sonner";
import { csvToObjects, downloadCsv, toCsv } from "@/lib/csv";
import { OperatorDetailsDialog } from "@/components/OperatorDetailsDialog";

export const Route = createFileRoute("/_app/operators")({
  head: () => ({ meta: [{ title: "Operators – KUBAL" }] }),
  component: OperatorsPage,
});

const blank = {
  employee_id: "",
  last_name: "",
  first_name: "",
  shift: "",
  area: "",
  active: true,
};

function OperatorsPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["operators"], queryFn: fetchOperators });
  const [editing, setEditing] = useState<Operator | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...blank });
  const [search, setSearch] = useState("");
  const [detailsOpId, setDetailsOpId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function openNew() {
    setEditing(null);
    setForm({ ...blank });
    setOpen(true);
  }
  function openEdit(o: Operator) {
    setEditing(o);
    setForm({
      employee_id: o.employee_id,
      last_name: o.last_name,
      first_name: o.first_name,
      shift: o.shift ?? "",
      area: o.area ?? "",
      active: o.active,
    });
    setOpen(true);
  }
  async function save() {
    if (!form.employee_id || !form.first_name || !form.last_name) {
      toast.error("Employee ID, first and last name are required");
      return;
    }
    const payload = {
      employee_id: form.employee_id,
      last_name: form.last_name,
      first_name: form.first_name,
      shift: form.shift || null,
      area: form.area || null,
      active: form.active,
    };
    const res = editing
      ? await supabase.from("operators").update(payload).eq("id", editing.id)
      : await supabase.from("operators").insert(payload);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(editing ? "Operator updated" : "Operator added");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["operators"] });
  }
  async function toggleActive(o: Operator) {
    const { error } = await supabase.from("operators").update({ active: !o.active }).eq("id", o.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["operators"] });
  }

  function exportCsv() {
    const csv = toCsv([
      ["EmployeeID", "LastName", "FirstName", "Shift", "Area", "Status"],
      ...data.map((o) => [
        o.employee_id,
        o.last_name,
        o.first_name,
        o.shift ?? "",
        o.area ?? "",
        o.active ? "Active" : "Inactive",
      ]),
    ]);
    downloadCsv(`operators_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  async function importCsv(file: File) {
    try {
      const text = await file.text();
      const rows = csvToObjects(text);
      if (rows.length === 0) return toast.error("CSV is empty");
      const payload = rows
        .filter((r) => r.EmployeeID && r.LastName && r.FirstName)
        .map((r) => ({
          employee_id: r.EmployeeID,
          last_name: r.LastName,
          first_name: r.FirstName,
          shift: r.Shift || null,
          area: r.Area || null,
          active: (r.Status || "Active").toLowerCase() !== "inactive",
        }));
      if (payload.length === 0) return toast.error("No valid rows found");
      const { error } = await supabase
        .from("operators")
        .upsert(payload, { onConflict: "employee_id" });
      if (error) return toast.error(error.message);
      toast.success(`Imported ${payload.length} operator${payload.length === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["operators"] });
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    }
  }

  const filtered = data.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${o.first_name} ${o.last_name} ${o.employee_id} ${o.shift} ${o.area}`.toLowerCase().includes(q);
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Operators</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data.length} total · {data.filter((o) => o.active).length} active
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importCsv(f);
              e.target.value = "";
            }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> New operator</Button>
        </div>
      </div>

      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="max-w-sm" />

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr className="text-left">
              <Th>Employee ID</Th><Th>Last name</Th><Th>First name</Th><Th>Shift</Th><Th>Area</Th><Th>Status</Th><Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <Td className="font-mono text-xs">{o.employee_id}</Td>
                <Td>{o.last_name}</Td>
                <Td>{o.first_name}</Td>
                <Td>{o.shift}</Td>
                <Td>{o.area}</Td>
                <Td>{o.active ? <span className="text-chart-2 text-xs font-medium">Active</span> : <span className="text-muted-foreground text-xs">Inactive</span>}</Td>
                <Td className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setDetailsOpId(o.id)}><Eye className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(o)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(o)}><Power className="h-4 w-4" /></Button>
                </Td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No operators yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit operator" : "New operator"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Employee ID"><Input value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} /></Field>
            <Field label="Shift"><Input value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} placeholder="e.g. 164" /></Field>
            <Field label="Last name"><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
            <Field label="First name"><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
            <Field label="Area"><Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. Electrolysis" /></Field>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Th({ children, className = "" }: any) { return <th className={`px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground ${className}`}>{children}</th>; }
function Td({ children, className = "" }: any) { return <td className={`px-4 py-2.5 ${className}`}>{children}</td>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
