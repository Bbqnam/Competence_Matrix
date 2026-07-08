import type { Competence, Level, Operator, OperatorCompetence, RoleRequirement } from "./db";
export function ocMap(oc: OperatorCompetence[]) {
  return new Map(oc.map((r) => [`${r.operator_id}::${r.competence_id}`, r]));
}
export function reqMap(reqs: RoleRequirement[]) {
  return new Map(reqs.filter((r) => r.mandatory).map((r) => [`${r.role}::${r.competence_id}`, r]));
}
export function status(actual: number | undefined, required: number | undefined) {
  if (!actual) return "missing";
  if (required && actual < required) return "below";
  if (required && actual > required) return "above";
  return "meets";
}
export function cellClass(s: string) {
  return s === "missing"
    ? "bg-slate-100 text-slate-400"
    : s === "below"
      ? "bg-red-100 text-red-800"
      : s === "above"
        ? "bg-blue-100 text-blue-800"
        : "bg-emerald-100 text-emerald-800";
}
export function complianceForOperator(
  o: Operator,
  comps: Competence[],
  oc: OperatorCompetence[],
  reqs: RoleRequirement[],
) {
  const m = ocMap(oc);
  const rs = reqs.filter((r) => r.role === o.role && r.mandatory);
  const met = rs.filter(
    (r) => (m.get(`${o.id}::${r.competence_id}`)?.actual_level ?? 0) >= r.required_level,
  ).length;
  return {
    total: rs.length,
    met,
    pct: rs.length ? Math.round((met / rs.length) * 100) : 100,
    gaps: rs.filter(
      (r) => (m.get(`${o.id}::${r.competence_id}`)?.actual_level ?? 0) < r.required_level,
    ),
  };
}
export function compName(comps: Competence[], id: string | null | undefined) {
  const c = comps.find((x) => x.id === id);
  return c ? `${c.competence_id}. ${c.competence_name}` : "—";
}
export const LEVELS: Level[] = [0, 1, 2, 3, 4];
