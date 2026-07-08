import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  fetchOperators,
  fetchCompetences,
  fetchOperatorCompetences,
  fetchTrainingLog,
} from "@/lib/db";
import { subscribe } from "@/lib/mock-store";
import { OperatorDetailsDialog } from "@/components/OperatorDetailsDialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Check,
  Download,
  Users,
  Award,
  GraduationCap,
  AlertTriangle,
  TrendingDown,
  Clock,
  Activity,
  ShieldAlert,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Dashboard – KUBAL Kompetensmatris" },
      { name: "description", content: "Operator competence overview for shift leaders." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const operatorsQ = useQuery({ queryKey: ["operators"], queryFn: fetchOperators });
  const competencesQ = useQuery({ queryKey: ["competences"], queryFn: fetchCompetences });
  const ocQ = useQuery({
    queryKey: ["operator_competences"],
    queryFn: fetchOperatorCompetences,
  });
  const logQ = useQuery({ queryKey: ["training_log"], queryFn: fetchTrainingLog });

  useEffect(() => {
    const u = subscribe(() => qc.invalidateQueries());
    return () => {
      u();
    };
  }, [qc]);

  const operators = (operatorsQ.data ?? []).filter((o) => o.active);
  const competences = (competencesQ.data ?? []).filter((c) => c.active);
  const oc = ocQ.data ?? [];
  const log = logQ.data ?? [];

  const [detailsOpId, setDetailsOpId] = useState<string | null>(null);

  const matrix = useMemo(() => {
    const set = new Set<string>();
    oc.forEach((r) => set.add(`${r.operator_id}::${r.competence_id}`));
    return set;
  }, [oc]);

  // ---- KPIs ----
  const totalCells = operators.length * competences.length;
  const filledCells = oc.filter(
    (r) =>
      operators.some((o) => o.id === r.operator_id) &&
      competences.some((c) => c.id === r.competence_id),
  ).length;
  const coverage = totalCells ? Math.round((filledCells / totalCells) * 100) : 0;

  const perOperatorCount = new Map<string, number>();
  operators.forEach((o) => perOperatorCount.set(o.id, 0));
  oc.forEach((r) => {
    if (perOperatorCount.has(r.operator_id))
      perOperatorCount.set(r.operator_id, (perOperatorCount.get(r.operator_id) ?? 0) + 1);
  });

  const perCompCount = new Map<string, number>();
  competences.forEach((c) => perCompCount.set(c.id, 0));
  oc.forEach((r) => {
    if (perCompCount.has(r.competence_id))
      perCompCount.set(r.competence_id, (perCompCount.get(r.competence_id) ?? 0) + 1);
  });

  const LOW_THRESHOLD = Math.max(3, Math.floor(competences.length * 0.35));
  const lowCoverageOps = operators.filter(
    (o) => (perOperatorCount.get(o.id) ?? 0) < LOW_THRESHOLD,
  );

  const mostMissing = [...competences]
    .map((c) => ({
      c,
      have: perCompCount.get(c.id) ?? 0,
      pct: operators.length ? Math.round(((perCompCount.get(c.id) ?? 0) / operators.length) * 100) : 0,
    }))
    .sort((a, b) => a.pct - b.pct);

  const recent = log.slice(0, 6);

  // Coverage by area
  const byArea = useMemo(() => {
    const groups = new Map<string, { ops: number; filled: number; total: number }>();
    operators.forEach((o) => {
      const key = o.area ?? "—";
      const g = groups.get(key) ?? { ops: 0, filled: 0, total: 0 };
      g.ops++;
      g.total += competences.length;
      groups.set(key, g);
    });
    oc.forEach((r) => {
      const op = operators.find((o) => o.id === r.operator_id);
      if (!op) return;
      const key = op.area ?? "—";
      const g = groups.get(key);
      if (g) g.filled++;
    });
    return [...groups.entries()]
      .map(([area, g]) => ({
        area,
        operators: g.ops,
        coverage: g.total ? Math.round((g.filled / g.total) * 100) : 0,
      }))
      .sort((a, b) => a.coverage - b.coverage);
  }, [operators, competences, oc]);

  // Coverage by shift
  const byShift = useMemo(() => {
    const groups = new Map<string, { ops: number; filled: number; total: number }>();
    operators.forEach((o) => {
      const key = o.shift ?? "—";
      const g = groups.get(key) ?? { ops: 0, filled: 0, total: 0 };
      g.ops++;
      g.total += competences.length;
      groups.set(key, g);
    });
    oc.forEach((r) => {
      const op = operators.find((o) => o.id === r.operator_id);
      if (!op) return;
      const key = op.shift ?? "—";
      const g = groups.get(key);
      if (g) g.filled++;
    });
    return [...groups.entries()]
      .map(([shift, g]) => ({
        shift,
        operators: g.ops,
        coverage: g.total ? Math.round((g.filled / g.total) * 100) : 0,
      }))
      .sort((a, b) => a.shift.localeCompare(b.shift));
  }, [operators, competences, oc]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kompetensmatris</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time overview of operator competences across the plant.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard icon={Users} label="Operators" value={operators.length} tone="blue" />
        <StatCard icon={Award} label="Competences" value={competences.length} tone="indigo" />
        <StatCard
          icon={GraduationCap}
          label="Coverage"
          value={`${coverage}%`}
          tone={coverage >= 60 ? "green" : coverage >= 40 ? "amber" : "red"}
        />
        <StatCard
          icon={AlertTriangle}
          label="Low-coverage ops"
          value={lowCoverageOps.length}
          tone={lowCoverageOps.length > 0 ? "red" : "green"}
          subtitle={`< ${LOW_THRESHOLD} competences`}
        />
        <StatCard
          icon={TrendingDown}
          label="Most missing"
          value={mostMissing[0] ? `${mostMissing[0].pct}%` : "—"}
          subtitle={mostMissing[0]?.c.competence_name}
          tone="amber"
        />
        <StatCard
          icon={Clock}
          label="Changes / 7 days"
          value={
            log.filter((r) => Date.now() - new Date(r.created_at).getTime() < 7 * 86400000).length
          }
          tone="slate"
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="matrix">Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title="Coverage by area"
              icon={<Activity className="h-4 w-4" />}
              description="Where the plant is strongest or weakest"
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byArea} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="area"
                      tick={{ fontSize: 12 }}
                      width={90}
                    />
                    <RTooltip
                      cursor={{ fill: "var(--color-accent)" }}
                      formatter={(v: any) => `${v}%`}
                    />
                    <Bar dataKey="coverage" radius={[0, 4, 4, 0]}>
                      {byArea.map((d, i) => (
                        <Cell key={i} fill={coverageColor(d.coverage)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              title="Coverage by shift"
              icon={<Activity className="h-4 w-4" />}
              description="Balance across shift teams"
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byShift} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="shift" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <RTooltip formatter={(v: any) => `${v}%`} />
                    <Bar dataKey="coverage" radius={[4, 4, 0, 0]}>
                      {byShift.map((d, i) => (
                        <Cell key={i} fill={coverageColor(d.coverage)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              title="Top 5 missing competences"
              icon={<ShieldAlert className="h-4 w-4" />}
              description="Rare skills across the workforce"
            >
              <ul className="divide-y divide-border">
                {mostMissing.slice(0, 5).map(({ c, have, pct }) => (
                  <li
                    key={c.id}
                    className="py-2.5 flex items-center gap-3 text-sm first:pt-0 last:pb-0"
                  >
                    <span className="font-mono text-xs text-muted-foreground w-8">
                      {c.competence_id}
                    </span>
                    <span className="flex-1 truncate">{c.competence_name}</span>
                    <span className="text-xs text-muted-foreground w-16 text-right tabular-nums">
                      {have} / {operators.length}
                    </span>
                    <div className="w-24">
                      <Progress value={pct} className="h-2" />
                    </div>
                    <span
                      className="text-xs font-medium w-10 text-right tabular-nums"
                      style={{ color: coverageColor(pct) }}
                    >
                      {pct}%
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card
              title="Operators needing most training"
              icon={<AlertTriangle className="h-4 w-4" />}
              description="Lowest number of assigned competences"
            >
              <ul className="divide-y divide-border">
                {[...operators]
                  .sort(
                    (a, b) =>
                      (perOperatorCount.get(a.id) ?? 0) - (perOperatorCount.get(b.id) ?? 0),
                  )
                  .slice(0, 6)
                  .map((o) => {
                    const n = perOperatorCount.get(o.id) ?? 0;
                    const pct = competences.length
                      ? Math.round((n / competences.length) * 100)
                      : 0;
                    return (
                      <li
                        key={o.id}
                        className="py-2.5 flex items-center gap-3 text-sm first:pt-0 last:pb-0 cursor-pointer hover:bg-accent/30 -mx-2 px-2 rounded"
                        onClick={() => setDetailsOpId(o.id)}
                      >
                        <span className="font-mono text-xs text-muted-foreground w-12">
                          {o.employee_id}
                        </span>
                        <span className="flex-1 truncate">
                          {o.last_name}, {o.first_name}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {o.area}
                        </Badge>
                        <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                          {n}/{competences.length}
                        </span>
                        <div className="w-20">
                          <Progress value={pct} className="h-2" />
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </Card>
          </div>

          <Card
            title="Recently updated"
            icon={<Clock className="h-4 w-4" />}
            description="Latest changes recorded in the training log"
          >
            <ul className="divide-y divide-border">
              {recent.length === 0 && (
                <li className="text-sm text-muted-foreground py-3">No changes yet.</li>
              )}
              {recent.map((r) => {
                const o = operators.find((x) => x.id === r.operator_id);
                const c = competences.find((x) => x.id === r.competence_id);
                return (
                  <li key={r.id} className="py-2.5 flex items-center gap-3 text-sm first:pt-0 last:pb-0">
                    {r.action === "added" ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
                        Added
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Removed</Badge>
                    )}
                    <span className="flex-1 truncate">
                      <span className="font-medium">
                        {o ? `${o.last_name}, ${o.first_name}` : "—"}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        · {c ? `${c.competence_id}. ${c.competence_name}` : "—"}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">{r.changed_by}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="matrix" className="mt-6">
          <MatrixView
            operators={operators}
            competences={competences}
            matrix={matrix}
            onOperatorClick={setDetailsOpId}
          />
        </TabsContent>
      </Tabs>

      <OperatorDetailsDialog
        operatorId={detailsOpId}
        onOpenChange={(o) => !o && setDetailsOpId(null)}
      />
    </div>
  );
}

function coverageColor(pct: number) {
  if (pct >= 70) return "#059669"; // emerald-600
  if (pct >= 45) return "#d97706"; // amber-600
  return "#dc2626"; // red-600
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  tone = "slate",
}: {
  icon: any;
  label: string;
  value: number | string;
  subtitle?: string;
  tone?: "blue" | "indigo" | "green" | "amber" | "red" | "slate";
}) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    indigo: "bg-indigo-50 text-indigo-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-start gap-3">
      <div className={`h-10 w-10 rounded-md flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-semibold tabular-nums leading-tight">{value}</div>
        {subtitle && (
          <div className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</div>
        )}
      </div>
    </div>
  );
}

function Card({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <div>
            <h3 className="font-semibold text-sm">{title}</h3>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function MatrixView({
  operators,
  competences,
  matrix,
  onOperatorClick,
}: {
  operators: any[];
  competences: any[];
  matrix: Set<string>;
  onOperatorClick: (id: string) => void;
}) {
  const [shift, setShift] = useState("all");
  const [area, setArea] = useState("all");
  const [opSearch, setOpSearch] = useState("");
  const [compSearch, setCompSearch] = useState("");

  const shifts = Array.from(new Set(operators.map((o) => o.shift).filter(Boolean))) as string[];
  const areas = Array.from(new Set(operators.map((o) => o.area).filter(Boolean))) as string[];

  const filteredOps = operators.filter((o) => {
    if (shift !== "all" && o.shift !== shift) return false;
    if (area !== "all" && o.area !== area) return false;
    if (opSearch) {
      const q = opSearch.toLowerCase();
      if (!`${o.first_name} ${o.last_name} ${o.employee_id}`.toLowerCase().includes(q))
        return false;
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

  function exportCsv() {
    const header = [
      "EmployeeID",
      "LastName",
      "FirstName",
      "Shift",
      "Area",
      ...filteredComps.map((c) => `${c.competence_id} ${c.competence_name}`),
    ];
    const rows = filteredOps.map((o) => [
      o.employee_id,
      o.last_name,
      o.first_name,
      o.shift ?? "",
      o.area ?? "",
      ...filteredComps.map((c) => (matrix.has(`${o.id}::${c.id}`) ? "1" : "0")),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kompetensmatris_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
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
            <SelectTrigger className="w-36">
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
          <Select value={area} onValueChange={setArea}>
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
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <TooltipProvider delayDuration={100}>
          <div className="overflow-auto max-h-[calc(100vh-360px)]">
            <table className="border-collapse text-sm w-max min-w-full">
              <thead className="sticky top-0 z-20 bg-secondary">
                <tr>
                  <th className="sticky left-0 z-30 bg-secondary text-left font-medium px-3 py-2 border-b border-r border-border min-w-[70px]">
                    ID
                  </th>
                  <th className="sticky left-[70px] z-30 bg-secondary text-left font-medium px-3 py-2 border-b border-r border-border min-w-[180px]">
                    Operator
                  </th>
                  <th className="text-left font-medium px-3 py-2 border-b border-r border-border min-w-[70px]">
                    Shift
                  </th>
                  <th className="text-left font-medium px-3 py-2 border-b border-r border-border min-w-[110px]">
                    Area
                  </th>
                  {filteredComps.map((c) => (
                    <th
                      key={c.id}
                      className="px-2 py-2 border-b border-r border-border text-center align-middle min-w-[52px]"
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="font-mono text-xs font-semibold cursor-help">
                            {c.competence_id}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <div className="text-xs">
                            <div className="font-mono opacity-70">
                              Code {c.competence_id}
                            </div>
                            <div className="font-medium">{c.competence_name}</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOps.length === 0 && (
                  <tr>
                    <td
                      colSpan={4 + filteredComps.length}
                      className="text-center text-muted-foreground py-10"
                    >
                      No operators match these filters.
                    </td>
                  </tr>
                )}
                {filteredOps.map((o, i) => (
                  <tr
                    key={o.id}
                    onClick={() => onOperatorClick(o.id)}
                    className={`${i % 2 ? "bg-muted/30" : ""} cursor-pointer hover:bg-accent/50`}
                  >
                    <td
                      className={`sticky left-0 z-10 ${
                        i % 2 ? "bg-muted/60" : "bg-card"
                      } px-3 py-1.5 border-b border-r border-border font-mono text-xs`}
                    >
                      {o.employee_id}
                    </td>
                    <td
                      className={`sticky left-[70px] z-10 ${
                        i % 2 ? "bg-muted/60" : "bg-card"
                      } px-3 py-1.5 border-b border-r border-border font-medium whitespace-nowrap`}
                    >
                      {o.last_name}, {o.first_name}
                    </td>
                    <td className="px-3 py-1.5 border-b border-r border-border text-muted-foreground">
                      {o.shift}
                    </td>
                    <td className="px-3 py-1.5 border-b border-r border-border text-muted-foreground">
                      {o.area}
                    </td>
                    {filteredComps.map((c) => {
                      const has = matrix.has(`${o.id}::${c.id}`);
                      return (
                        <td
                          key={c.id}
                          className={`px-2 py-1.5 border-b border-r border-border text-center ${
                            has ? "bg-emerald-50/60" : ""
                          }`}
                        >
                          {has ? (
                            <Check
                              className="h-4 w-4 mx-auto text-emerald-600"
                              strokeWidth={3}
                            />
                          ) : (
                            <span className="text-muted-foreground/30">·</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
