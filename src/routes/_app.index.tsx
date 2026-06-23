import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  fetchOperators,
  fetchCompetences,
  fetchOperatorCompetences,
  type Operator,
  type Competence,
} from "@/lib/db";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Download, Users, Award, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Dashboard – KUBAL Kompetensmatris" },
      { name: "description", content: "Operator competence matrix overview." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const operatorsQ = useQuery({ queryKey: ["operators"], queryFn: fetchOperators });
  const competencesQ = useQuery({ queryKey: ["competences"], queryFn: fetchCompetences });
  const ocQ = useQuery({ queryKey: ["operator_competences"], queryFn: fetchOperatorCompetences });

  const [shift, setShift] = useState<string>("all");
  const [area, setArea] = useState<string>("all");
  const [opSearch, setOpSearch] = useState("");
  const [compSearch, setCompSearch] = useState("");

  const operators = (operatorsQ.data ?? []).filter((o) => o.active);
  const competences = (competencesQ.data ?? []).filter((c) => c.active);
  const oc = ocQ.data ?? [];

  const shifts = Array.from(new Set(operators.map((o) => o.shift).filter(Boolean))) as string[];
  const areas = Array.from(new Set(operators.map((o) => o.area).filter(Boolean))) as string[];

  const matrix = useMemo(() => {
    const set = new Set<string>();
    oc.forEach((r) => set.add(`${r.operator_id}::${r.competence_id}`));
    return set;
  }, [oc]);

  const filteredOps = operators.filter((o) => {
    if (shift !== "all" && o.shift !== shift) return false;
    if (area !== "all" && o.area !== area) return false;
    if (opSearch) {
      const q = opSearch.toLowerCase();
      const hay = `${o.first_name} ${o.last_name} ${o.employee_id}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const filteredComps = competences.filter((c) => {
    if (!compSearch) return true;
    const q = compSearch.toLowerCase();
    return (
      c.competence_name.toLowerCase().includes(q) ||
      c.competence_id.toLowerCase().includes(q)
    );
  });

  const totalCells = filteredOps.length * filteredComps.length;
  const filledCells = filteredOps.reduce(
    (acc, o) => acc + filteredComps.filter((c) => matrix.has(`${o.id}::${c.id}`)).length,
    0,
  );
  const coverage = totalCells ? Math.round((filledCells / totalCells) * 100) : 0;

  function exportCsv() {
    const header = ["EmployeeID", "LastName", "FirstName", "Shift", "Area", ...filteredComps.map((c) => c.competence_id + " " + c.competence_name)];
    const rows = filteredOps.map((o) => [
      o.employee_id,
      o.last_name,
      o.first_name,
      o.shift ?? "",
      o.area ?? "",
      ...filteredComps.map((c) => (matrix.has(`${o.id}::${c.id}`) ? "1" : "0")),
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kompetensmatris_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kompetensmatris</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of all operator competences. Updates automatically as changes are made.
          </p>
        </div>
        <Button onClick={exportCsv} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Users} label="Operators" value={filteredOps.length} accent="text-chart-3" />
        <StatCard icon={Award} label="Competences" value={filteredComps.length} accent="text-chart-2" />
        <StatCard icon={GraduationCap} label="Assignments" value={filledCells} accent="text-chart-1" />
        <StatCard icon={Check} label="Coverage" value={`${coverage}%`} accent="text-chart-4" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end bg-card border border-border rounded-lg p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Search operator</label>
          <Input
            value={opSearch}
            onChange={(e) => setOpSearch(e.target.value)}
            placeholder="Name or ID"
            className="w-56"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Search competence</label>
          <Input
            value={compSearch}
            onChange={(e) => setCompSearch(e.target.value)}
            placeholder="Code or name"
            className="w-56"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Shift</label>
          <Select value={shift} onValueChange={setShift}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All shifts</SelectItem>
              {shifts.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Area</label>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All areas</SelectItem>
              {areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Matrix */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-340px)]">
          <table className="border-collapse text-sm w-max min-w-full">
            <thead className="sticky top-0 z-20 bg-secondary">
              <tr>
                <th className="sticky left-0 z-30 bg-secondary text-left font-medium px-3 py-2 border-b border-r border-border min-w-[80px]">Anst.Nr</th>
                <th className="sticky left-[80px] z-30 bg-secondary text-left font-medium px-3 py-2 border-b border-r border-border min-w-[140px]">Efternamn</th>
                <th className="sticky left-[220px] z-30 bg-secondary text-left font-medium px-3 py-2 border-b border-r border-border min-w-[120px]">Förnamn</th>
                <th className="text-left font-medium px-3 py-2 border-b border-r border-border min-w-[70px]">Skift</th>
                <th className="text-left font-medium px-3 py-2 border-b border-r border-border min-w-[110px]">Område</th>
                {filteredComps.map((c) => (
                  <th key={c.id} className="px-2 py-2 border-b border-r border-border align-bottom h-32 min-w-[44px]">
                    <div className="origin-bottom-left translate-y-2 whitespace-nowrap text-xs font-medium" style={{ transform: "rotate(-55deg) translateY(0.5rem)" }}>
                      <span className="text-muted-foreground mr-1">{c.competence_id}.</span>
                      {c.competence_name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOps.length === 0 && (
                <tr><td colSpan={5 + filteredComps.length} className="text-center text-muted-foreground py-10">No operators match these filters.</td></tr>
              )}
              {filteredOps.map((o, i) => (
                <tr key={o.id} className={i % 2 ? "bg-muted/30" : ""}>
                  <td className={`sticky left-0 z-10 ${i % 2 ? "bg-muted/60" : "bg-card"} px-3 py-1.5 border-b border-r border-border font-mono text-xs`}>{o.employee_id}</td>
                  <td className={`sticky left-[80px] z-10 ${i % 2 ? "bg-muted/60" : "bg-card"} px-3 py-1.5 border-b border-r border-border`}>{o.last_name}</td>
                  <td className={`sticky left-[220px] z-10 ${i % 2 ? "bg-muted/60" : "bg-card"} px-3 py-1.5 border-b border-r border-border`}>{o.first_name}</td>
                  <td className="px-3 py-1.5 border-b border-r border-border text-muted-foreground">{o.shift}</td>
                  <td className="px-3 py-1.5 border-b border-r border-border text-muted-foreground">{o.area}</td>
                  {filteredComps.map((c) => {
                    const has = matrix.has(`${o.id}::${c.id}`);
                    return (
                      <td key={c.id} className="px-2 py-1.5 border-b border-r border-border text-center">
                        {has ? (
                          <div className="mx-auto h-5 w-5 rounded-sm bg-chart-2/20 text-chart-2 flex items-center justify-center">
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="mx-auto h-5 w-5 rounded-sm border border-dashed border-border" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number | string; accent: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
      <div className={`h-11 w-11 rounded-md bg-secondary flex items-center justify-center ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
