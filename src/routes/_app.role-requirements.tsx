import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchCompetences, fetchRoleRequirements, getChangedBy, ROLES, type Level } from "@/lib/db";
import { m_setRoleRequirement, subscribe } from "@/lib/mock-store";
import { LEVELS } from "@/lib/analytics";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
export const Route = createFileRoute("/_app/role-requirements")({
  head: () => ({ meta: [{ title: "Role Requirements – KUBAL" }] }),
  component: RoleRequirementsPage,
});
function RoleRequirementsPage() {
  const qc = useQueryClient();
  const comps = useQuery({ queryKey: ["competences"], queryFn: fetchCompetences });
  const reqs = useQuery({ queryKey: ["role_requirements"], queryFn: fetchRoleRequirements });
  const [role, setRole] = useState<string>(ROLES[0]);
  useEffect(() => subscribe(() => qc.invalidateQueries()), [qc]);
  const rows = (comps.data ?? []).filter((c) => c.active);
  const map = new Map(
    (reqs.data ?? []).filter((r) => r.role === role).map((r) => [r.competence_id, r]),
  );
  async function change(compId: string, mandatory: boolean, level: Level) {
    await m_setRoleRequirement(role, compId, mandatory, level, getChangedBy());
    toast.success("Role requirement updated");
    qc.invalidateQueries();
  }
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Role Requirements</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define mandatory competences and required KUBAL level 0–4 for each operator role.
        </p>
      </div>
      <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
        <span className="text-sm font-medium">Role</span>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline">
          {[...map.values()].filter((r) => r.mandatory).length} mandatory
        </Badge>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr className="text-left">
              <th className="px-4 py-2.5">Mandatory</th>
              <th className="px-4 py-2.5">Code</th>
              <th className="px-4 py-2.5">Competence</th>
              <th className="px-4 py-2.5">Required level</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const r = map.get(c.id);
              return (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-2.5">
                    <Checkbox
                      checked={!!r?.mandatory}
                      onCheckedChange={(v) => change(c.id, !!v, (r?.required_level ?? 3) as Level)}
                    />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{c.competence_id}</td>
                  <td className="px-4 py-2.5 font-medium">{c.competence_name}</td>
                  <td className="px-4 py-2.5">
                    <Select
                      value={String(r?.required_level ?? 3)}
                      onValueChange={(v) => change(c.id, true, Number(v) as Level)}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => (
                          <SelectItem key={l} value={String(l)}>
                            Level {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
