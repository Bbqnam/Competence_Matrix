import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  fetchOperators,
  fetchCompetences,
  fetchOperatorCompetences,
  fetchRoleRequirements,
  fetchTrainingLog,
} from "@/lib/db";
import { subscribe } from "@/lib/mock-store";
import { complianceForOperator, ocMap, status, cellClass } from "@/lib/analytics";
import { OperatorDetailsDialog } from "@/components/OperatorDetailsDialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Dashboard – KUBAL Kompetensmatris" }] }),
  component: Dashboard,
});
function Dashboard() {
  const qc = useQueryClient();
  const opsQ = useQuery({ queryKey: ["operators"], queryFn: fetchOperators });
  const compsQ = useQuery({ queryKey: ["competences"], queryFn: fetchCompetences });
  const ocQ = useQuery({ queryKey: ["operator_competences"], queryFn: fetchOperatorCompetences });
  const reqQ = useQuery({ queryKey: ["role_requirements"], queryFn: fetchRoleRequirements });
  const logQ = useQuery({ queryKey: ["training_log"], queryFn: fetchTrainingLog });
  useEffect(() => subscribe(() => qc.invalidateQueries()), [qc]);
  const operators = (opsQ.data ?? []).filter((o) => o.active),
    comps = (compsQ.data ?? []).filter((c) => c.active),
    oc = ocQ.data ?? [],
    reqs = reqQ.data ?? [],
    logs = logQ.data ?? [];
  const [details, setDetails] = useState<string | null>(null);
  const compliance = operators.map((o) => ({ o, ...complianceForOperator(o, comps, oc, reqs) }));
  const overall = compliance.length
    ? Math.round(compliance.reduce((s, x) => s + x.pct, 0) / compliance.length)
    : 0;
  const below = compliance.filter((x) => x.pct < 100);
  const byRole = groupCompliance(compliance, (x) => x.o.role ?? "—", reqs);
  const byArea = groupCompliance(compliance, (x) => x.o.area ?? "—", reqs);
  const gapCounts = new Map<string, number>();
  compliance.forEach((x) =>
    x.gaps.forEach((g) =>
      gapCounts.set(g.competence_id, (gapCounts.get(g.competence_id) ?? 0) + 1),
    ),
  );
  const worstComp = [...gapCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const cname = (id?: string) => {
    const c = comps.find((x) => x.id === id);
    return c ? `${c.competence_id}. ${c.competence_name}` : "—";
  };
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Competence Compliance Risk</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Role-based mandatory competence dashboard for shift leaders and factory management.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-blue-900 text-white rounded-xl p-6">
          <div className="text-sm opacity-80">Overall mandatory competence compliance</div>
          <div className="text-6xl font-semibold my-3">{overall}%</div>
          <Progress value={overall} />
          <div className="text-xs opacity-80 mt-3">
            {below.length} operators below role requirement
          </div>
        </div>
        <Kpi label="Operators below role requirement" value={below.length} />
        <Kpi
          label="Most critical missing competence"
          value={worstComp ? cname(worstComp[0]) : "—"}
          sub={worstComp ? `${worstComp[1]} gaps` : undefined}
        />
        <Kpi
          label="Worst role coverage"
          value={byRole[0]?.key ?? "—"}
          sub={byRole[0] ? `${byRole[0].pct}% compliant` : undefined}
        />
        <Kpi
          label="Worst area coverage"
          value={byArea[0]?.key ?? "—"}
          sub={byArea[0] ? `${byArea[0].pct}% compliant` : undefined}
        />
      </div>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roles">Role Compliance</TabsTrigger>
          <TabsTrigger value="matrix">Matrix</TabsTrigger>
          <TabsTrigger value="gaps">Gaps</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <List
            title="Roles with lowest compliance"
            rows={byRole.map((r) => ({ a: r.key, b: `${r.pct}%`, p: r.pct }))}
          />
          <List
            title="Areas with lowest compliance"
            rows={byArea.map((r) => ({ a: r.key, b: `${r.pct}%`, p: r.pct }))}
          />
          <List
            title="Mandatory competences with most gaps"
            rows={[...gapCounts.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([id, n]) => ({ a: cname(id), b: `${n} gaps`, p: 100 - Math.min(100, n * 12) }))}
          />
          <div className="bg-card border rounded-lg p-5">
            <h3 className="font-semibold text-sm mb-3">What changed recently?</h3>
            {logs.slice(0, 6).map((l) => (
              <div key={l.id} className="py-2 border-t first:border-t-0 text-sm flex gap-2">
                <Badge variant="outline">{l.action}</Badge>
                <span className="flex-1 truncate">{cname(l.competence_id ?? undefined)}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(l.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="roles" className="mt-6">
          <RoleTable rows={byRole} />
        </TabsContent>
        <TabsContent value="matrix" className="mt-6">
          <Matrix operators={operators} comps={comps} oc={oc} reqs={reqs} onOp={setDetails} />
        </TabsContent>
        <TabsContent value="gaps" className="mt-6">
          <Gaps compliance={compliance} comps={comps} onOp={setDetails} />
        </TabsContent>
      </Tabs>
      <OperatorDetailsDialog operatorId={details} onOpenChange={(o) => !o && setDetails(null)} />
    </div>
  );
}
function groupCompliance(items: any[], keyFn: (x: any) => string, reqs: any[]) {
  const m = new Map<string, any[]>();
  items.forEach((i) => {
    const k = keyFn(i);
    m.set(k, [...(m.get(k) ?? []), i]);
  });
  return [...m.entries()]
    .map(([key, arr]) => ({
      key,
      operators: arr.length,
      mandatory: reqs.filter((r) => r.role === key).length,
      pct: Math.round(arr.reduce((s, x) => s + x.pct, 0) / arr.length),
      below: arr.filter((x) => x.pct < 100).length,
    }))
    .sort((a, b) => a.pct - b.pct);
}
function Kpi({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-2 leading-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
function List({ title, rows }: { title: string; rows: any[] }) {
  return (
    <div className="bg-card border rounded-lg p-5">
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      {rows.slice(0, 8).map((r, i) => (
        <div key={i} className="py-2 flex items-center gap-3">
          <span className="flex-1 text-sm truncate">{r.a}</span>
          <Progress value={r.p} className="w-28 h-2" />
          <span className="text-sm font-medium w-16 text-right">{r.b}</span>
        </div>
      ))}
    </div>
  );
}
function RoleTable({ rows }: { rows: any[] }) {
  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary">
          <tr>
            <th className="p-3 text-left">Role</th>
            <th>Operators</th>
            <th>Mandatory competences</th>
            <th>Average compliance</th>
            <th>Operators below requirement</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t">
              <td className="p-3 font-medium">{r.key}</td>
              <td className="text-center">{r.operators}</td>
              <td className="text-center">{r.mandatory}</td>
              <td className="p-3">
                <Progress value={r.pct} />
                <span className="text-xs">{r.pct}%</span>
              </td>
              <td className="text-center">{r.below}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Matrix({ operators, comps, oc, reqs, onOp }: any) {
  const [role, setRole] = useState("all"),
    [mandatory, setMandatory] = useState("all"),
    [gaps, setGaps] = useState("all");
  const m = ocMap(oc);
  const roles = [...new Set(operators.map((o: any) => o.role))];
  const ops = operators.filter((o: any) => role === "all" || o.role === role);
  const filteredComps = comps.filter(
    (c: any) =>
      mandatory === "all" ||
      reqs.some(
        (r: any) => r.competence_id === c.id && (!role || role === "all" || r.role === role),
      ),
  );
  return (
    <div className="space-y-3">
      <div className="bg-card border rounded-lg p-4 flex gap-3">
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roles.map((r: any) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mandatory} onValueChange={setMandatory}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All competences</SelectItem>
            <SelectItem value="mandatory">Only mandatory</SelectItem>
          </SelectContent>
        </Select>
        <Select value={gaps} onValueChange={setGaps}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cells</SelectItem>
            <SelectItem value="gaps">Only gap rows</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="bg-card border rounded-lg overflow-auto max-h-[65vh]">
        <TooltipProvider>
          <table className="text-sm w-max min-w-full">
            <thead className="sticky top-0 bg-secondary">
              <tr>
                <th className="p-2 text-left sticky left-0 bg-secondary">Operator</th>
                <th className="p-2">Role</th>
                {filteredComps.map((c: any) => (
                  <th key={c.id} className="p-2">
                    <Tooltip>
                      <TooltipTrigger className="font-mono">{c.competence_id}</TooltipTrigger>
                      <TooltipContent>{c.competence_name}</TooltipContent>
                    </Tooltip>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ops
                .filter(
                  (o: any) =>
                    gaps === "all" ||
                    filteredComps.some((c: any) => {
                      const req = reqs.find(
                        (r: any) => r.role === o.role && r.competence_id === c.id,
                      );
                      const a = m.get(`${o.id}::${c.id}`)?.actual_level ?? 0;
                      return req && a < req.required_level;
                    }),
                )
                .map((o: any) => (
                  <tr key={o.id} className="border-t hover:bg-accent/30">
                    <td
                      onClick={() => onOp(o.id)}
                      className="p-2 sticky left-0 bg-card font-medium cursor-pointer"
                    >
                      {o.last_name}, {o.first_name}
                    </td>
                    <td className="p-2">
                      <Badge variant="outline">{o.role}</Badge>
                    </td>
                    {filteredComps.map((c: any) => {
                      const row = m.get(`${o.id}::${c.id}`);
                      const req = reqs.find(
                        (r: any) => r.role === o.role && r.competence_id === c.id,
                      );
                      const s = status(row?.actual_level, req?.required_level);
                      return (
                        <td key={c.id} className="p-1 text-center">
                          <Tooltip>
                            <TooltipTrigger
                              className={`inline-flex w-8 h-7 items-center justify-center rounded font-semibold ${cellClass(s)}`}
                            >
                              {row?.actual_level ?? 0}
                            </TooltipTrigger>
                            <TooltipContent>
                              {c.competence_name}
                              <br />
                              Actual {row?.actual_level ?? 0} / Required {req?.required_level ?? 0}
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </TooltipProvider>
      </div>
    </div>
  );
}
function Gaps({ compliance, comps, onOp }: any) {
  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary">
          <tr>
            <th className="p-3 text-left">Operator</th>
            <th className="p-3 text-left">Role</th>
            <th className="p-3 text-left">Gap</th>
            <th className="p-3">Required</th>
          </tr>
        </thead>
        <tbody>
          {compliance.flatMap((x: any) =>
            x.gaps.map((g: any) => (
              <tr key={`${x.o.id}-${g.competence_id}`} className="border-t">
                <td className="p-3">
                  <button className="font-medium hover:underline" onClick={() => onOp(x.o.id)}>
                    {x.o.last_name}, {x.o.first_name}
                  </button>
                </td>
                <td>
                  <Badge variant="outline">{x.o.role}</Badge>
                </td>
                <td>{comps.find((c: any) => c.id === g.competence_id)?.competence_name}</td>
                <td className="text-center">{g.required_level}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
