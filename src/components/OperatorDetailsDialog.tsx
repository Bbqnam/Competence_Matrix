import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  fetchOperators,
  fetchCompetences,
  fetchOperatorCompetences,
} from "@/lib/db";
import { Check, User } from "lucide-react";

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

  const operator = ops.data?.find((o) => o.id === operatorId) ?? null;
  const assigned = (oc.data ?? []).filter((r) => r.operator_id === operatorId);
  const compMap = new Map((comps.data ?? []).map((c) => [c.id, c]));
  const assignedComps = assigned
    .map((a) => compMap.get(a.competence_id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .sort((a, b) => a.competence_id.localeCompare(b.competence_id, undefined, { numeric: true }));

  return (
    <Dialog open={!!operatorId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Operator details
          </DialogTitle>
        </DialogHeader>
        {operator ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Employee ID" value={operator.employee_id} mono />
              <Info label="Status" value={operator.active ? "Active" : "Inactive"} />
              <Info label="Name" value={`${operator.first_name} ${operator.last_name}`} />
              <Info label="Shift" value={operator.shift ?? "—"} />
              <Info label="Area" value={operator.area ?? "—"} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Assigned competences</h3>
                <span className="text-xs text-muted-foreground">
                  {assignedComps.length} total
                </span>
              </div>
              <div className="border border-border rounded-md divide-y divide-border max-h-72 overflow-auto">
                {assignedComps.length === 0 && (
                  <div className="text-sm text-muted-foreground p-4 text-center">
                    No competences assigned.
                  </div>
                )}
                {assignedComps.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <Check className="h-4 w-4 text-chart-2" strokeWidth={3} />
                    <span className="font-mono text-xs text-muted-foreground w-10">
                      {c.competence_id}
                    </span>
                    <span>{c.competence_name}</span>
                  </div>
                ))}
              </div>
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
