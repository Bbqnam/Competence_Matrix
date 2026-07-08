import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchOperators, type Operator, ROLES } from "@/lib/db";
import {
  m_upsertOperator,
  m_setOperatorActive,
  m_importOperators,
  subscribe,
} from "@/lib/mock-store";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Power, Download, Upload, Eye } from "lucide-react";
import { toast } from "sonner";
import { csvToObjects, downloadCsv, toCsv } from "@/lib/csv";
import { OperatorDetailsDialog } from "@/components/OperatorDetailsDialog";

export const Route = createFileRoute("/_app/operators")({
  head: () => ({ meta: [{ title: "Operators – KUBAL" }] }),
  component: OperatorsPage,
});

const AREAS = ["Electrolysis", "Casthouse", "Maintenance", "Laboratory", "Logistics"];
const SHIFTS = ["164", "165", "261", "262", "Day"];

const blank = {
  employee_id: "",
  last_name: "",
  first_name: "",
  shift: "",
  area: "",
  role: "Charger",
  active: true,
};

function OperatorsPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["operators"], queryFn: fetchOperators });
  const [editing, setEditing] = useState<Operator | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...blank });
  const [search, setSearch] = useState("");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [detailsOpId, setDetailsOpId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = subscribe(() => qc.invalidateQueries());
    return () => {
      u();
    };
  }, [qc]);

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
      role: o.role ?? "Charger",
      active: o.active,
    });
    setOpen(true);
  }
  async function save() {
    if (!form.employee_id || !form.first_name || !form.last_name) {
      toast.error("Employee ID, first and last name are required");
      return;
    }
    await m_upsertOperator(
      {
        employee_id: form.employee_id,
        last_name: form.last_name,
        first_name: form.first_name,
        shift: form.shift || null,
        area: form.area || null,
        role: form.role,
        active: form.active,
      },
      editing?.id,
    );
    toast.success(editing ? "Operator updated" : "Operator added");
    setOpen(false);
    qc.invalidateQueries();
  }
  async function toggleActive(o: Operator) {
    await m_setOperatorActive(o.id, !o.active);
    qc.invalidateQueries();
  }

  function exportCsv() {
    const csv = toCsv([
      ["EmployeeID", "LastName", "FirstName", "Shift", "Area", "Role", "Status"],
      ...data.map((o) => [
        o.employee_id,
        o.last_name,
        o.first_name,
        o.shift ?? "",
        o.area ?? "",
        o.role ?? "",
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
      await m_importOperators(payload);
      toast.success(`Imported ${payload.length} operator${payload.length === 1 ? "" : "s"}`);
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    }
  }

  const shifts = useMemo(
    () => Array.from(new Set(data.map((o) => o.shift).filter(Boolean))) as string[],
    [data],
  );
  const areas = useMemo(
    () => Array.from(new Set(data.map((o) => o.area).filter(Boolean))) as string[],
    [data],
  );

  const filtered = data.filter((o) => {
    if (shiftFilter !== "all" && o.shift !== shiftFilter) return false;
    if (areaFilter !== "all" && o.area !== areaFilter) return false;
    if (roleFilter !== "all" && o.role !== roleFilter) return false;
    if (!search) return true;
    return `${o.first_name} ${o.last_name} ${o.employee_id}`
      .toLowerCase()
      .includes(search.toLowerCase());
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
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> New operator
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-card border border-border rounded-lg p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Search</label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or ID"
            className="w-64"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Shift</label>
          <Select value={shiftFilter} onValueChange={setShiftFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All shifts</SelectItem>
              {shifts.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Area</label>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All areas</SelectItem>
              {areas.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Role</label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr className="text-left">
              <Th>Employee ID</Th>
              <Th>Last name</Th>
              <Th>First name</Th>
              <Th>Shift</Th>
              <Th>Area</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t border-border hover:bg-accent/20">
                <Td className="font-mono text-xs">{o.employee_id}</Td>
                <Td className="font-medium">{o.last_name}</Td>
                <Td>{o.first_name}</Td>
                <Td className="text-muted-foreground">{o.shift}</Td>
                <Td className="text-muted-foreground">{o.area}</Td>
                <Td>
                  <Badge variant="outline">{o.role}</Badge>
                </Td>
                <Td>
                  {o.active ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Inactive
                    </Badge>
                  )}
                </Td>
                <Td className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setDetailsOpId(o.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(o)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(o)}>
                    <Power className="h-4 w-4" />
                  </Button>
                </Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-muted-foreground">
                  No operators match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit operator" : "New operator"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Employee ID">
              <Input
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              />
            </Field>
            <Field label="Shift">
              <Select value={form.shift} onValueChange={(v) => setForm({ ...form, shift: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {SHIFTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Last name">
              <Input
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </Field>
            <Field label="First name">
              <Input
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </Field>
            <Field label="Role">
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Area">
              <Select value={form.area} onValueChange={(v) => setForm({ ...form, area: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OperatorDetailsDialog
        operatorId={detailsOpId}
        onOpenChange={(o) => !o && setDetailsOpId(null)}
      />
    </div>
  );
}

function Th({ children, className = "" }: any) {
  return (
    <th
      className={`px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}
function Td({ children, className = "" }: any) {
  return <td className={`px-4 py-2.5 ${className}`}>{children}</td>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
