import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { fetchCompetences, type Competence } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Pencil, Plus, Power, Download, Upload } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Competence | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function openNew() { setEditing(null); setForm({ ...blank }); setOpen(true); }
  function openEdit(c: Competence) {
    setEditing(c);
    setForm({ competence_id: c.competence_id, competence_name: c.competence_name, active: c.active });
    setOpen(true);
  }
  async function save() {
    if (!form.competence_id || !form.competence_name) {
      toast.error("Competence ID and name are required"); return;
    }
    const res = editing
      ? await supabase.from("competences").update(form).eq("id", editing.id)
      : await supabase.from("competences").insert(form);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Competence updated" : "Competence added");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["competences"] });
  }
  async function toggleActive(c: Competence) {
    const { error } = await supabase.from("competences").update({ active: !c.active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["competences"] });
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
      const { error } = await supabase
        .from("competences")
        .upsert(payload, { onConflict: "competence_id" });
      if (error) return toast.error(error.message);
      toast.success(`Imported ${payload.length} competence${payload.length === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["competences"] });
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    }
  }

  const filtered = data.filter((c) => !search || `${c.competence_id} ${c.competence_name}`.toLowerCase().includes(search.toLowerCase()));

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
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> New competence</Button>
        </div>
      </div>

      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="max-w-sm" />

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">Code</th>
              <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">Name</th>
              <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-right font-medium text-xs uppercase tracking-wide text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-2.5 font-mono text-xs">{c.competence_id}</td>
                <td className="px-4 py-2.5">{c.competence_name}</td>
                <td className="px-4 py-2.5">{c.active ? <span className="text-chart-2 text-xs font-medium">Active</span> : <span className="text-muted-foreground text-xs">Inactive</span>}</td>
                <td className="px-4 py-2.5 text-right">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(c)}><Power className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-muted-foreground">No competences yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit competence" : "New competence"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Code</Label><Input value={form.competence_id} onChange={(e) => setForm({ ...form, competence_id: e.target.value })} placeholder="e.g. 19" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input value={form.competence_name} onChange={(e) => setForm({ ...form, competence_name: e.target.value })} placeholder="e.g. Täckning/Covering (Verk 2)" /></div>
            <div className="flex items-center gap-3"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label>Active</Label></div>
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
