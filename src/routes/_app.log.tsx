import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  fetchTrainingLog,
  fetchOperators,
  fetchCompetences,
} from "@/lib/db";
import { subscribe } from "@/lib/mock-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Download, Lock } from "lucide-react";
import { downloadCsv, toCsv } from "@/lib/csv";
import { OperatorDetailsDialog } from "@/components/OperatorDetailsDialog";

export const Route = createFileRoute("/_app/log")({
  head: () => ({ meta: [{ title: "Training Log – KUBAL" }] }),
  component: LogPage,
});

function LogPage() {
  const log = useQuery({ queryKey: ["training_log"], queryFn: fetchTrainingLog });
  const ops = useQuery({ queryKey: ["operators"], queryFn: fetchOperators });
  const comps = useQuery({ queryKey: ["competences"], queryFn: fetchCompetences });
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detailsOpId, setDetailsOpId] = useState<string | null>(null);

  const opMap = useMemo(() => new Map((ops.data ?? []).map((o) => [o.id, o])), [ops.data]);
  const compMap = useMemo(() => new Map((comps.data ?? []).map((c) => [c.id, c])), [comps.data]);

  const rows = (log.data ?? []).filter((r) => {
    if (from && r.created_at < from) return false;
    if (to && r.created_at > to + "T23:59:59") return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const o = opMap.get(r.operator_id);
    const c = compMap.get(r.competence_id);
    return `${o?.first_name} ${o?.last_name} ${o?.employee_id} ${c?.competence_name} ${r.changed_by}`.toLowerCase().includes(q);
  });

  function exportCsv() {
    const csv = toCsv([
      ["Date", "EmployeeID", "Operator", "Competence", "Action", "ChangedBy"],
      ...rows.map((r) => {
        const o = opMap.get(r.operator_id);
        const c = compMap.get(r.competence_id);
        return [
          new Date(r.created_at).toISOString(),
          o?.employee_id ?? "",
          o ? `${o.last_name}, ${o.first_name}` : "",
          c ? `${c.competence_id}. ${c.competence_name}` : "",
          r.action,
          r.changed_by ?? "",
        ];
      }),
    ]);
    downloadCsv(`training_log_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Training Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            History of every competence change · {rows.length} shown
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-card border border-border rounded-lg p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Search</label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Operator, competence, user…" className="w-72" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
        </div>
        {(from || to || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); setSearch(""); }}>
            Clear
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr className="text-left">
              {["Date", "Employee ID", "Operator", "Competence", "Action", "Changed by"].map((h) => (
                <th key={h} className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const o = opMap.get(r.operator_id);
              const c = compMap.get(r.competence_id);
              return (
                <tr key={r.id} className="border-t border-border hover:bg-accent/30">
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{o?.employee_id ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {o ? (
                      <button onClick={() => setDetailsOpId(o.id)} className="hover:underline text-left">
                        {o.last_name}, {o.first_name}
                      </button>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2.5">{c ? `${c.competence_id}. ${c.competence_name}` : "—"}</td>
                  <td className="px-4 py-2.5">
                    {r.action === "added" ? (
                      <span className="inline-flex items-center gap-1.5 text-chart-2 text-xs font-medium"><Plus className="h-3 w-3" /> Added</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-destructive text-xs font-medium"><Minus className="h-3 w-3" /> Removed</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.changed_by}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No log entries match.</td></tr>}
          </tbody>
        </table>
      </div>

      <OperatorDetailsDialog
        operatorId={detailsOpId}
        onOpenChange={(o) => !o && setDetailsOpId(null)}
      />
    </div>
  );
}
