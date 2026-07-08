import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  fetchOperators,
  fetchCompetences,
  fetchOperatorCompetences,
  fetchRoleRequirements,
} from "@/lib/db";
import { complianceForOperator, ocMap } from "@/lib/analytics";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User } from "lucide-react";
export function OperatorDetailsDialog({
  operatorId,
  onOpenChange,
}: {
  operatorId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const ops = useQuery({ queryKey: ["operators"], queryFn: fetchOperators });
  const comps = useQuery({ queryKey: ["competences"], queryFn: fetchCompetences });
  const oc = useQuery({ queryKey: ["operator_competences"], queryFn: fetchOperatorCompetences });
  const reqs = useQuery({ queryKey: ["role_requirements"], queryFn: fetchRoleRequirements });
  const operator = ops.data?.find((o) => o.id === operatorId) ?? null;
  const allComps = comps.data ?? [],
    allOc = oc.data ?? [],
    allReqs = reqs.data ?? [];
  const m = ocMap(allOc);
  const compliance = operator
    ? complianceForOperator(operator, allComps, allOc, allReqs)
    : { total: 0, met: 0, pct: 0, gaps: [] };
  const assigned = operator ? allOc.filter((r) => r.operator_id === operator.id) : [];
  const mandatory = operator ? allReqs.filter((r) => r.role === operator.role && r.mandatory) : [];
  const met = mandatory.filter(
    (r) => (m.get(`${operator!.id}::${r.competence_id}`)?.actual_level ?? 0) >= r.required_level,
  );
  const below = mandatory.filter((r) => {
    const a = m.get(`${operator!.id}::${r.competence_id}`)?.actual_level ?? 0;
    return a > 0 && a < r.required_level;
  });
  const missing = mandatory.filter(
    (r) => (m.get(`${operator!.id}::${r.competence_id}`)?.actual_level ?? 0) === 0,
  );
  const extra = assigned.filter((a) => !mandatory.some((r) => r.competence_id === a.competence_id));
  const cname = (id: string) => {
    const c = allComps.find((x) => x.id === id);
    return c ? `${c.competence_id}. ${c.competence_name}` : "—";
  };
  return (
    <Dialog open={!!operatorId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Operator detail
          </DialogTitle>
        </DialogHeader>
        {operator ? (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <Info label="Employee ID" value={operator.employee_id} mono />
              <Info label="Name" value={`${operator.first_name} ${operator.last_name}`} />
              <Info label="Role" value={operator.role ?? "—"} />
              <Info label="Shift" value={operator.shift ?? "—"} />
              <Info label="Area" value={operator.area ?? "—"} />
              <Info label="Total competences" value={String(assigned.length)} />
            </div>
            <div className="bg-secondary/60 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <b>Role compliance</b>
                <span>
                  {compliance.pct}% · {compliance.met}/{compliance.total} mandatory met
                </span>
              </div>
              <Progress value={compliance.pct} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Section
                title="Mandatory met"
                rows={met.map((r) => ({
                  text: cname(r.competence_id),
                  badge: `Required ${r.required_level}`,
                }))}
              />
              <Section
                title="Mandatory missing"
                rows={missing.map((r) => ({
                  text: cname(r.competence_id),
                  badge: `Required ${r.required_level}`,
                }))}
              />
              <Section
                title="Below required level"
                rows={below.map((r) => ({
                  text: cname(r.competence_id),
                  badge: `Actual ${m.get(`${operator.id}::${r.competence_id}`)?.actual_level} / Req ${r.required_level}`,
                }))}
              />
              <Section
                title="Extra competences"
                rows={extra.map((r) => ({
                  text: cname(r.competence_id),
                  badge: `Level ${r.actual_level}`,
                }))}
              />
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Operator not found.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-sm" : "text-sm"}>{value}</div>
    </div>
  );
}
function Section({ title, rows }: { title: string; rows: { text: string; badge: string }[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="border rounded-md divide-y max-h-44 overflow-auto">
        {rows.length ? (
          rows.map((r, i) => (
            <div key={i} className="p-2 text-sm flex gap-2">
              <span className="flex-1">{r.text}</span>
              <Badge variant="outline">{r.badge}</Badge>
            </div>
          ))
        ) : (
          <div className="p-3 text-sm text-muted-foreground">None</div>
        )}
      </div>
    </div>
  );
}
