import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  fetchTrainingLog,
  fetchOperators,
  fetchCompetences,
} from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Plus, Minus } from "lucide-react";

export const Route = createFileRoute("/_app/log")({
  head: () => ({ meta: [{ title: "Training Log – KUBAL" }] }),
  component: LogPage,
});

function LogPage() {
  const log = useQuery({ queryKey: ["training_log"], queryFn: fetchTrainingLog });
  const ops = useQuery({ queryKey: ["operators"], queryFn: fetchOperators });
  const comps = useQuery({ queryKey: ["competences"], queryFn: fetchCompetences });
  const [search, setSearch] = useState("");

  const opMap = useMemo(() => new Map((ops.data ?? []).map((o) => [o.id, o])), [ops.data]);
  const compMap = useMemo(() => new Map((comps.data ?? []).map((c) => [c.id, c])), [comps.data]);

  const rows = (log.data ?? []).filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const o = opMap.get(r.operator_id);
    const c = compMap.get(r.competence_id);
    return `${o?.first_name} ${o?.last_name} ${o?.employee_id} ${c?.competence_name} ${r.changed_by}`.toLowerCase().includes(q);
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Training Log</h1>
        <p className="text-sm text-muted-foreground mt-1">History of every competence change.</p>
      </div>
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by operator, competence, or user…" className="max-w-md" />

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
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{o?.employee_id ?? "—"}</td>
                  <td className="px-4 py-2.5">{o ? `${o.last_name}, ${o.first_name}` : "—"}</td>
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
            {rows.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No log entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
