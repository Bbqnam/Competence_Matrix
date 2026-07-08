import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  fetchCompetences,
  fetchOperators,
  fetchOperatorCompetences,
  fetchRoleRequirements,
  type Competence,
} from "@/lib/db";
import {
  m_upsertCompetence,
  m_setCompetenceActive,
  m_importCompetences,
  subscribe,
} from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/_app/competences")({
  head: () => ({ meta: [{ title: "Competences – KUBAL" }] }),
  component: CompetencesPage,
});

const blank = { competence_id: "", competence_name: "", active: true };

function CompetencesPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["competences"], queryFn: fetchCompetences });
  const ops = useQuery({ queryKey: ["operators"], queryFn: fetchOperators });
  const oc = useQuery({ queryKey: ["operator_competences"], queryFn: fetchOperatorCompetences });
  const reqs = useQuery({ queryKey: ["role_requirements"], queryFn: fetchRoleRequirements });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Competence | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [search, setSearch] = useState("");
  const [details, setDetails] = useState<Competence | null>(null);
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
  function openEdit(c: Competence) {
    setEditing(c);
    setForm({
      competence_id: c.competence_id,
      competence_name: c.competence_name,
      active: c.active,
    });
    setOpen(true);
  }
  async function save() {
    if (!form.competence_id || !form.competence_name) {
      toast.error("Competence code and name are required");
      return;
    }
    await m_upsertCompetence(form, editing?.id);
    toast.success(editing ? "Competence updated" : "Competence added");
    setOpen(false);
    qc.invalidateQueries();
  }
  async function toggleActive(c: Competence) {
    await m_setCompetenceActive(c.id, !c.active);
    qc.invalidateQueries();
  }

  function exportCsv() {
    const csv = toCsv([
      ["CompetenceCode", "CompetenceName", "Status"],
      ...data.map((c) => [c.competence_id, c.competence_name, c.active ? "Active" : "Inactive"]),
    ]);
    downloadCsv(`competences_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  async function importCsv(file: File) {
    try {
      const text = await file.text();
      const rows = csvToObjects(text);
      const payload = rows
        .filter((r) => r.CompetenceCode && r.CompetenceName)
        .map((r) => ({
          competence_id: r.CompetenceCode,
          competence_name: r.CompetenceName,
          active: (r.Status || "Active").toLowerCase() !== "inactive",
        }));
      if (payload.length === 0) return toast.error("No valid rows found");
      await m_importCompetences(payload);
      toast.success(`Imported ${payload.length} competence${payload.length === 1 ? "" : "s"}`);
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    }
  }

  const filtered = data.filter(
    (c) =>
      !search ||
      `${c.competence_id} ${c.competence_name}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Competences</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data.length} total · {data.filter((c) => c.active).length} active
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
            <Plus className="h-4 w-4" /> New competence
          </Button>
        </div>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search code or name…"
        className="max-w-sm"
      />

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                Code
              </th>
              <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-xs uppercase tracking-wide text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-accent/20">
                <td className="px-4 py-2.5 font-mono text-xs">{c.competence_id}</td>
                <td className="px-4 py-2.5 font-medium">{c.competence_name}</td>
                <td className="px-4 py-2.5">
                  {c.active ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Inactive
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setDetails(c)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(c)}>
                    <Power className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-10 text-muted-foreground">
                  No competences match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit competence" : "New competence"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Code</Label>
              <Input
                value={form.competence_id}
                onChange={(e) => setForm({ ...form, competence_id: e.target.value })}
                placeholder="e.g. 19"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={form.competence_name}
                onChange={(e) => setForm({ ...form, competence_name: e.target.value })}
                placeholder="e.g. Covering / Täckning"
              />
            </div>
            <div className="flex items-center gap-3">
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
      <Dialog open={!!details} onOpenChange={(o) => !o && setDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Competence detail</DialogTitle>
          </DialogHeader>
          {details && (
            <CompetenceDetail
              c={details}
              operators={ops.data ?? []}
              oc={oc.data ?? []}
              reqs={reqs.data ?? []}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompetenceDetail({ c, operators, oc, reqs }: any) {
  const active = operators.filter((o: any) => o.active);
  const assigned = oc.filter((r: any) => r.competence_id === c.id);
  const haveIds = new Set(assigned.map((r: any) => r.operator_id));
  const mandatoryRoles = [
    ...new Set(
      reqs.filter((r: any) => r.competence_id === c.id && r.mandatory).map((r: any) => r.role),
    ),
  ];
  const pct = active.length
    ? Math.round(
        (assigned.filter((r: any) => active.some((o: any) => o.id === r.operator_id)).length /
          active.length) *
          100,
      )
    : 0;
  const group = (key: string) =>
    [...new Set(active.map((o: any) => o[key] ?? "—"))]
      .map((g: any) => {
        const ops = active.filter((o: any) => (o[key] ?? "—") === g);
        const n = ops.filter((o: any) => haveIds.has(o.id)).length;
        return `${g}: ${ops.length ? Math.round((n / ops.length) * 100) : 0}%`;
      })
      .join(" · ");
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <b>Code</b>
          <br />
          <span className="font-mono">{c.competence_id}</span>
        </div>
        <div>
          <b>Name</b>
          <br />
          {c.competence_name}
        </div>
        <div>
          <b>Operators with competence</b>
          <br />
          {assigned.length}
        </div>
        <div>
          <b>Overall coverage</b>
          <br />
          {pct}%
        </div>
        <div className="col-span-2">
          <b>Mandatory for roles</b>
          <br />
          {mandatoryRoles.join(", ") || "None"}
        </div>
        <div className="col-span-2">
          <b>Coverage by area</b>
          <br />
          {group("area")}
        </div>
        <div className="col-span-2">
          <b>Coverage by shift</b>
          <br />
          {group("shift")}
        </div>
      </div>
      <div>
        <b>Operators missing this competence</b>
        <div className="border rounded mt-2 max-h-40 overflow-auto divide-y">
          {active
            .filter((o: any) => !haveIds.has(o.id))
            .map((o: any) => (
              <div key={o.id} className="p-2">
                {o.last_name}, {o.first_name} · {o.role}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
