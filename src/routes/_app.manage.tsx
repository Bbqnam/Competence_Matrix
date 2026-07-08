import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  fetchOperators,
  fetchCompetences,
  fetchOperatorCompetences,
  fetchRoleRequirements,
  getChangedBy,
  ROLES,
  type Level,
} from "@/lib/db";
import { m_bulkSetLevel, m_bulkUnassign, subscribe } from "@/lib/mock-store";
import { LEVELS } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Minus, Save } from "lucide-react";
export const Route = createFileRoute("/_app/manage")({
  head: () => ({ meta: [{ title: "Manage Competences – KUBAL" }] }),
  component: ManagePage,
});
function ManagePage() {
  const qc = useQueryClient();
  const opsQ = useQuery({ queryKey: ["operators"], queryFn: fetchOperators });
  const compsQ = useQuery({ queryKey: ["competences"], queryFn: fetchCompetences });
  const ocQ = useQuery({ queryKey: ["operator_competences"], queryFn: fetchOperatorCompetences });
  const reqQ = useQuery({ queryKey: ["role_requirements"], queryFn: fetchRoleRequirements });
  useEffect(() => subscribe(() => qc.invalidateQueries()), [qc]);
  const operators = (opsQ.data ?? []).filter((o) => o.active),
    comps = (compsQ.data ?? []).filter((c) => c.active),
    oc = ocQ.data ?? [],
    reqs = reqQ.data ?? [];
  const [selectedOps, setSelectedOps] = useState<Set<string>>(new Set()),
    [selectedComps, setSelectedComps] = useState<Set<string>>(new Set()),
    [level, setLevel] = useState<Level>(3),
    [opSearch, setOpSearch] = useState(""),
    [compSearch, setCompSearch] = useState(""),
    [shift, setShift] = useState("all"),
    [area, setArea] = useState("all"),
    [role, setRole] = useState("all"),
    [mandatory, setMandatory] = useState(false),
    [busy, setBusy] = useState(false);
  const shifts = [...new Set(operators.map((o) => o.shift).filter(Boolean))] as string[];
  const areas = [...new Set(operators.map((o) => o.area).filter(Boolean))] as string[];
  const selectedRoles = [
    ...new Set(
      operators
        .filter((o) => selectedOps.has(o.id))
        .map((o) => o.role)
        .filter(Boolean),
    ),
  ] as string[];
  const matrix = new Map(oc.map((r) => [`${r.operator_id}::${r.competence_id}`, r]));
  const filteredOps = operators.filter(
    (o) =>
      (shift === "all" || o.shift === shift) &&
      (area === "all" || o.area === area) &&
      (role === "all" || o.role === role) &&
      (!opSearch ||
        `${o.first_name} ${o.last_name} ${o.employee_id}`
          .toLowerCase()
          .includes(opSearch.toLowerCase())),
  );
  const mandatoryIds = new Set(
    reqs.filter((r) => selectedRoles.includes(r.role) && r.mandatory).map((r) => r.competence_id),
  );
  const filteredComps = comps.filter(
    (c) =>
      (!mandatory || mandatoryIds.has(c.id)) &&
      (!compSearch ||
        `${c.competence_id} ${c.competence_name}`.toLowerCase().includes(compSearch.toLowerCase())),
  );
  function toggle(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    const n = new Set(set);
    n.has(id) ? n.delete(id) : n.add(id);
    setter(n);
  }
  const statuses = useMemo(
    () =>
      filteredComps.map((c) => {
        const rows = [...selectedOps].map((o) => matrix.get(`${o}::${c.id}`));
        const assigned = rows.filter(Boolean).length;
        const exact = rows.filter((r) => r?.actual_level === level).length;
        const levels = [...new Set(rows.filter(Boolean).map((r) => r!.actual_level))];
        return [c.id, { assigned, exact, levels }] as const;
      }),
    [filteredComps, selectedOps, matrix, level],
  );
  const statusMap = new Map(statuses);
  const noChanges =
    [...selectedOps].length > 0 &&
    [...selectedComps].length > 0 &&
    [...selectedOps].every((o) =>
      [...selectedComps].every((c) => matrix.get(`${o}::${c}`)?.actual_level === level),
    );
  async function setLevels() {
    if (!selectedOps.size || !selectedComps.size)
      return toast.error("Select operators and competences");
    setBusy(true);
    try {
      const r = await m_bulkSetLevel([...selectedOps], [...selectedComps], level, getChangedBy());
      toast.success(`Created ${r.added}, updated ${r.updated}, no change ${r.skipped}`);
      qc.invalidateQueries();
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!selectedOps.size || !selectedComps.size)
      return toast.error("Select operators and competences");
    setBusy(true);
    try {
      const r = await m_bulkUnassign([...selectedOps], [...selectedComps], getChangedBy());
      toast.success(`Removed ${r.removed}, skipped ${r.skipped}`);
      qc.invalidateQueries();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="p-8 space-y-6 h-screen flex flex-col">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manage Competences</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bulk set competence levels 0–4. Existing assignments update; missing assignments are
          created and logged.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        <Panel
          title="Operators"
          count={`${selectedOps.size} / ${filteredOps.length} selected`}
          search={opSearch}
          onSearch={setOpSearch}
          onSelectAll={() => setSelectedOps(new Set(filteredOps.map((o) => o.id)))}
          onClear={() => setSelectedOps(new Set())}
          filters={
            <>
              <Select value={shift} onValueChange={setShift}>
                <SelectTrigger className="h-8 w-28">
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
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger className="h-8 w-36">
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
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-8 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          }
        >
          {filteredOps.map((o) => (
            <Row
              key={o.id}
              checked={selectedOps.has(o.id)}
              onToggle={() => toggle(selectedOps, setSelectedOps, o.id)}
            >
              <span className="font-mono text-xs w-12">{o.employee_id}</span>
              <span className="flex-1">
                {o.last_name}, {o.first_name}
              </span>
              <Badge variant="outline">{o.role}</Badge>
              <span className="text-xs text-muted-foreground">
                {o.shift} · {o.area}
              </span>
            </Row>
          ))}
        </Panel>
        <Panel
          title="Competences"
          count={`${selectedComps.size} / ${filteredComps.length} selected`}
          search={compSearch}
          onSearch={setCompSearch}
          onSelectAll={() => setSelectedComps(new Set(filteredComps.map((c) => c.id)))}
          onClear={() => setSelectedComps(new Set())}
          filters={
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={mandatory} onCheckedChange={(v) => setMandatory(!!v)} /> Mandatory
              for selected roles
            </label>
          }
        >
          {filteredComps.map((c) => {
            const st = statusMap.get(c.id);
            return (
              <Row
                key={c.id}
                checked={selectedComps.has(c.id)}
                onToggle={() => toggle(selectedComps, setSelectedComps, c.id)}
              >
                <span className="font-mono text-xs w-10">{c.competence_id}</span>
                <span className="flex-1">{c.competence_name}</span>
                {selectedOps.size > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {st?.assigned ?? 0} of {selectedOps.size} assigned
                    {(st?.levels.length ?? 0) > 1 ? " · Mixed levels" : ""}
                    {st?.exact === selectedOps.size ? " · no change" : ""}
                  </span>
                )}
              </Row>
            );
          })}
        </Panel>
      </div>
      <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
        <div className="flex-1 text-sm">
          <b>{selectedOps.size}</b> operators × <b>{selectedComps.size}</b> competences
        </div>
        <Select value={String(level)} onValueChange={(v) => setLevel(Number(v) as Level)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEVELS.map((l) => (
              <SelectItem key={l} value={String(l)}>
                Set level {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          disabled={busy || !selectedOps.size || !selectedComps.size}
          onClick={remove}
          className="gap-2"
        >
          <Minus className="h-4 w-4" />
          Remove competence
        </Button>
        <Button
          disabled={busy || !selectedOps.size || !selectedComps.size || noChanges}
          onClick={setLevels}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Set level
        </Button>
        {noChanges && <span className="text-xs text-muted-foreground">No changes needed</span>}
      </div>
    </div>
  );
}
function Panel({ title, count, search, onSearch, onSelectAll, onClear, filters, children }: any) {
  return (
    <div className="bg-card border border-border rounded-lg flex flex-col min-h-0">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex justify-between">
          <h2 className="font-semibold">{title}</h2>
          <span className="text-xs text-muted-foreground">{count}</span>
        </div>
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search…"
          className="h-8"
        />
        <div className="flex flex-wrap gap-2">{filters}</div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onSelectAll}>
            Select all visible
          </Button>
          <Button size="sm" variant="ghost" onClick={onClear}>
            Clear
          </Button>
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
