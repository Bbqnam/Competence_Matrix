import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  fetchOperators,
  fetchCompetences,
  fetchOperatorCompetences,
  getChangedBy,
} from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Minus } from "lucide-react";
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

export const Route = createFileRoute("/_app/manage")({
  head: () => ({ meta: [{ title: "Manage Competences – KUBAL" }] }),
  component: ManagePage,
});

function ManagePage() {
  const qc = useQueryClient();
  const operatorsQ = useQuery({ queryKey: ["operators"], queryFn: fetchOperators });
  const competencesQ = useQuery({ queryKey: ["competences"], queryFn: fetchCompetences });
  const ocQ = useQuery({ queryKey: ["operator_competences"], queryFn: fetchOperatorCompetences });

  const operators = (operatorsQ.data ?? []).filter((o) => o.active);
  const competences = (competencesQ.data ?? []).filter((c) => c.active);
  const oc = ocQ.data ?? [];

  const [selectedOps, setSelectedOps] = useState<Set<string>>(new Set());
  const [selectedComps, setSelectedComps] = useState<Set<string>>(new Set());
  const [opSearch, setOpSearch] = useState("");
  const [compSearch, setCompSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"added" | "removed" | null>(null);

  const matrix = useMemo(() => {
    const s = new Set<string>();
    oc.forEach((r) => s.add(`${r.operator_id}::${r.competence_id}`));
    return s;
  }, [oc]);

  const filteredOps = operators.filter((o) => !opSearch || `${o.first_name} ${o.last_name} ${o.employee_id}`.toLowerCase().includes(opSearch.toLowerCase()));
  const filteredComps = competences.filter((c) => !compSearch || `${c.competence_id} ${c.competence_name}`.toLowerCase().includes(compSearch.toLowerCase()));

  const { pendingAdd, pendingRemove } = useMemo(() => {
    let add = 0, rem = 0;
    selectedOps.forEach((o) =>
      selectedComps.forEach((c) => {
        if (matrix.has(`${o}::${c}`)) rem++;
        else add++;
      }),
    );
    return { pendingAdd: add, pendingRemove: rem };
  }, [selectedOps, selectedComps, matrix]);

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    const n = new Set(set);
    n.has(id) ? n.delete(id) : n.add(id);
    setter(n);
  }
  function selectAll(items: { id: string }[], setter: (s: Set<string>) => void) {
    setter(new Set(items.map((i) => i.id)));
  }

  async function applyChange(action: "added" | "removed") {
    if (selectedOps.size === 0 || selectedComps.size === 0) {
      toast.error("Select at least one operator and one competence");
      return;
    }
    setBusy(true);
    const changedBy = getChangedBy();
    const opIds = [...selectedOps];
    const compIds = [...selectedComps];

    const logRows: any[] = [];
    if (action === "added") {
      const toInsert: any[] = [];
      for (const o of opIds) for (const c of compIds) {
        if (!matrix.has(`${o}::${c}`)) {
          toInsert.push({ operator_id: o, competence_id: c, created_by: changedBy });
          logRows.push({ operator_id: o, competence_id: c, action: "added", changed_by: changedBy });
        }
      }
      if (toInsert.length === 0) {
        toast.info("All selected competences are already assigned");
        setBusy(false); return;
      }
      const { error } = await supabase.from("operator_competences").insert(toInsert);
      if (error) { toast.error(error.message); setBusy(false); return; }
    } else {
      const pairsToRemove: { o: string; c: string }[] = [];
      for (const o of opIds) for (const c of compIds) {
        if (matrix.has(`${o}::${c}`)) {
          pairsToRemove.push({ o, c });
          logRows.push({ operator_id: o, competence_id: c, action: "removed", changed_by: changedBy });
        }
      }
      if (pairsToRemove.length === 0) {
        toast.info("None of the selected competences were assigned");
        setBusy(false); return;
      }
      for (const p of pairsToRemove) {
        await supabase.from("operator_competences").delete().match({ operator_id: p.o, competence_id: p.c });
      }
    }
    if (logRows.length) await supabase.from("training_log").insert(logRows);

    toast.success(`${logRows.length} change${logRows.length === 1 ? "" : "s"} ${action}`);
    qc.invalidateQueries({ queryKey: ["operator_competences"] });
    qc.invalidateQueries({ queryKey: ["training_log"] });
    setBusy(false);
  }

  return (
    <div className="p-8 space-y-6 h-screen flex flex-col">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manage Competences</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select operators and competences, then add or remove in bulk.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        <Panel
          title="Operators"
          count={`${selectedOps.size} / ${filteredOps.length} selected`}
          search={opSearch}
          onSearch={setOpSearch}
          onSelectAll={() => selectAll(filteredOps, setSelectedOps)}
          onClear={() => setSelectedOps(new Set())}
        >
          {filteredOps.map((o) => (
            <Row key={o.id} checked={selectedOps.has(o.id)} onToggle={() => toggle(selectedOps, setSelectedOps, o.id)}>
              <span className="font-mono text-xs text-muted-foreground w-12 shrink-0">{o.employee_id}</span>
              <span className="flex-1">{o.last_name}, {o.first_name}</span>
              <span className="text-xs text-muted-foreground">{o.shift} · {o.area}</span>
            </Row>
          ))}
        </Panel>

        <Panel
          title="Competences"
          count={`${selectedComps.size} / ${filteredComps.length} selected`}
          search={compSearch}
          onSearch={setCompSearch}
          onSelectAll={() => selectAll(filteredComps, setSelectedComps)}
          onClear={() => setSelectedComps(new Set())}
        >
          {filteredComps.map((c) => (
            <Row key={c.id} checked={selectedComps.has(c.id)} onToggle={() => toggle(selectedComps, setSelectedComps, c.id)}>
              <span className="font-mono text-xs text-muted-foreground w-10 shrink-0">{c.competence_id}</span>
              <span className="flex-1">{c.competence_name}</span>
            </Row>
          ))}
        </Panel>
      </div>

      <div className="flex items-center justify-end gap-3 bg-card border border-border rounded-lg p-4">
        <div className="flex-1 text-sm">
          <span className="text-foreground font-medium">
            {selectedOps.size} operator{selectedOps.size === 1 ? "" : "s"} × {selectedComps.size} competence{selectedComps.size === 1 ? "" : "s"}
          </span>
          <span className="text-muted-foreground"> = {selectedOps.size * selectedComps.size} assignment{selectedOps.size * selectedComps.size === 1 ? "" : "s"}</span>
          {(pendingAdd > 0 || pendingRemove > 0) && (
            <span className="ml-3 text-xs text-muted-foreground">
              ({pendingAdd} new to add · {pendingRemove} existing to remove)
            </span>
          )}
        </div>
        <Button
          variant="outline"
          disabled={busy || selectedOps.size === 0 || selectedComps.size === 0}
          onClick={() => setConfirm("removed")}
          className="gap-2"
        >
          <Minus className="h-4 w-4" /> Remove
        </Button>
        <Button
          disabled={busy || selectedOps.size === 0 || selectedComps.size === 0}
          onClick={() => setConfirm("added")}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "added" ? "Add competence assignments?" : "Remove competence assignments?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "added"
                ? `${pendingAdd} competence assignment${pendingAdd === 1 ? " will be" : "s will be"} created. ${selectedOps.size * selectedComps.size - pendingAdd} already exist and will be skipped.`
                : `${pendingRemove} competence assignment${pendingRemove === 1 ? " will be" : "s will be"} removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const a = confirm!;
                setConfirm(null);
                applyChange(a);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Panel({
  title, count, search, onSearch, onSelectAll, onClear, children,
}: any) {
  return (
    <div className="bg-card border border-border rounded-lg flex flex-col min-h-0">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <span className="text-xs text-muted-foreground">{count}</span>
        </div>
        <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search…" className="h-8 text-sm" />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onSelectAll} className="h-7 text-xs">Select all visible</Button>
          <Button size="sm" variant="ghost" onClick={onClear} className="h-7 text-xs">Clear</Button>
        </div>
      </div>
      <div className="overflow-auto flex-1">{children}</div>
    </div>
  );
}

function Row({ checked, onToggle, children }: any) {
  return (
    <label className="flex items-center gap-3 px-4 py-2 border-b border-border/60 hover:bg-secondary/60 cursor-pointer text-sm">
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      {children}
    </label>
  );
}
