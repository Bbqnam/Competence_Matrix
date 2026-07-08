// Local mock competence-matrix store. Persists in localStorage so the demo
// survives reloads without a backend. Used by src/lib/db.ts as the sole
// data source in this demo build.

import type { Operator, Competence, OperatorCompetence, TrainingLogRow } from "./db";

const STORAGE_KEY = "kubal_mock_store_v2";
const AREAS = ["Electrolysis", "Casthouse", "Maintenance", "Laboratory", "Logistics"] as const;
const SHIFTS = ["164", "165", "261", "262", "Day"] as const;

type Store = {
  operators: Operator[];
  competences: Competence[];
  operator_competences: OperatorCompetence[];
  training_log: TrainingLogRow[];
};

const listeners = new Set<() => void>();
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  listeners.forEach((l) => l());
}

function uid() {
  return (globalThis.crypto?.randomUUID?.() ??
    "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36));
}

function seed(): Store {
  const firstNames = [
    "Nam", "Erik", "Anna", "Johan", "Maria", "Karl", "Elin", "Lars", "Sara", "Anders",
    "Emma", "Peter", "Linda", "Mikael", "Sofia", "Andreas", "Helena", "Oskar", "Camilla",
    "Fredrik", "Marta", "Gustav", "Ida", "Henrik", "Jenny", "Björn", "Lisa", "Tobias",
    "Malin", "Viktor",
  ];
  const lastNames = [
    "Nguyen", "Andersson", "Johansson", "Karlsson", "Nilsson", "Eriksson", "Larsson",
    "Olsson", "Persson", "Svensson", "Gustafsson", "Pettersson", "Jonsson", "Jansson",
    "Hansson", "Bengtsson", "Lindberg", "Lindström", "Berg", "Sandberg", "Lundgren",
    "Åberg", "Sjöberg", "Holm", "Ek", "Fredriksson", "Wallin", "Forsberg", "Berglund",
    "Norén",
  ];

  const operators: Operator[] = firstNames.map((fn, i) => ({
    id: uid(),
    employee_id: String(4001 + i),
    first_name: fn,
    last_name: lastNames[i % lastNames.length],
    shift: SHIFTS[i % SHIFTS.length],
    area: AREAS[i % AREAS.length],
    active: i !== 27, // one inactive for realism
    created_at: new Date(Date.now() - (30 - i) * 86400000 * 20).toISOString(),
  }));

  const competenceDefs: [string, string, (typeof AREAS)[number]][] = [
    ["01", "IDUS", "Electrolysis"],
    ["02", "Flexite", "Electrolysis"],
    ["03", "Covering / Täckning", "Electrolysis"],
    ["04", "Travers / Overhead Crane", "Electrolysis"],
    ["05", "Anode Change", "Electrolysis"],
    ["06", "Metal Tapping", "Electrolysis"],
    ["07", "Casting Line A", "Casthouse"],
    ["08", "Casting Line B", "Casthouse"],
    ["09", "Furnace Operation", "Casthouse"],
    ["10", "Truck / Forklift", "Logistics"],
    ["11", "Warehouse System", "Logistics"],
    ["12", "Loading & Dispatch", "Logistics"],
    ["13", "Preventive Maintenance", "Maintenance"],
    ["14", "Electrical Safety (ESA)", "Maintenance"],
    ["15", "Hydraulics", "Maintenance"],
    ["16", "Sample Preparation", "Laboratory"],
    ["17", "Spectrometer XRF", "Laboratory"],
    ["18", "Quality Reporting", "Laboratory"],
  ];

  const competences: Competence[] = competenceDefs.map(([code, name]) => ({
    id: uid(),
    competence_id: code,
    competence_name: name,
    active: true,
    created_at: new Date().toISOString(),
  }));

  // Assignments: operators are more likely to have competences of their own area,
  // giving realistic per-area coverage variance.
  const operator_competences: OperatorCompetence[] = [];
  const training_log: TrainingLogRow[] = [];
  const changedBy = "Nam Nguyen";

  operators.forEach((op) => {
    competenceDefs.forEach(([, , compArea], idx) => {
      const comp = competences[idx];
      const sameArea = compArea === op.area;
      // Truck (10) and Travers (04) intentionally lower coverage to surface risks.
      const isLowCoverage = comp.competence_id === "10" || comp.competence_id === "04";
      const base = sameArea ? 0.75 : 0.18;
      const p = isLowCoverage ? base * 0.55 : base;
      if (op.active && Math.random() < p) {
        const createdAt = new Date(
          Date.now() - Math.floor(Math.random() * 180) * 86400000,
        ).toISOString();
        operator_competences.push({
          id: uid(),
          operator_id: op.id,
          competence_id: comp.id,
          created_at: createdAt,
          created_by: changedBy,
        });
        training_log.push({
          id: uid(),
          operator_id: op.id,
          competence_id: comp.id,
          action: "added",
          changed_by: changedBy,
          created_at: createdAt,
        });
      }
    });
  });

  // A few "removed" entries so audit trail shows both actions.
  for (let i = 0; i < 8; i++) {
    const entry = operator_competences[Math.floor(Math.random() * operator_competences.length)];
    if (!entry) break;
    training_log.push({
      id: uid(),
      operator_id: entry.operator_id,
      competence_id: entry.competence_id,
      action: "removed",
      changed_by: changedBy,
      created_at: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
    });
  }

  training_log.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return { operators, competences, operator_competences, training_log };
}

function load(): Store {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const s = seed();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
  return s;
}

let store: Store = load();

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
  notify();
}

export function resetDemo() {
  store = seed();
  persist();
}

// ---------- Read API ----------
export async function m_fetchOperators(): Promise<Operator[]> {
  return [...store.operators].sort((a, b) => a.last_name.localeCompare(b.last_name));
}
export async function m_fetchCompetences(): Promise<Competence[]> {
  return [...store.competences].sort((a, b) =>
    a.competence_id.localeCompare(b.competence_id, undefined, { numeric: true }),
  );
}
export async function m_fetchOperatorCompetences(): Promise<OperatorCompetence[]> {
  return [...store.operator_competences];
}
export async function m_fetchTrainingLog(): Promise<TrainingLogRow[]> {
  return [...store.training_log].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

// ---------- Write API ----------
export async function m_upsertOperator(
  input: Partial<Operator> & Pick<Operator, "employee_id" | "first_name" | "last_name">,
  id?: string,
): Promise<Operator> {
  if (id) {
    const existing = store.operators.find((o) => o.id === id);
    if (!existing) throw new Error("Operator not found");
    Object.assign(existing, input);
    persist();
    return existing;
  }
  const created: Operator = {
    id: uid(),
    employee_id: input.employee_id,
    first_name: input.first_name,
    last_name: input.last_name,
    shift: input.shift ?? null,
    area: input.area ?? null,
    active: input.active ?? true,
    created_at: new Date().toISOString(),
  };
  store.operators.push(created);
  persist();
  return created;
}

export async function m_setOperatorActive(id: string, active: boolean) {
  const op = store.operators.find((o) => o.id === id);
  if (op) {
    op.active = active;
    persist();
  }
}

export async function m_upsertCompetence(
  input: Partial<Competence> & Pick<Competence, "competence_id" | "competence_name">,
  id?: string,
): Promise<Competence> {
  if (id) {
    const existing = store.competences.find((c) => c.id === id);
    if (!existing) throw new Error("Competence not found");
    Object.assign(existing, input);
    persist();
    return existing;
  }
  const created: Competence = {
    id: uid(),
    competence_id: input.competence_id,
    competence_name: input.competence_name,
    active: input.active ?? true,
    created_at: new Date().toISOString(),
  };
  store.competences.push(created);
  persist();
  return created;
}

export async function m_setCompetenceActive(id: string, active: boolean) {
  const c = store.competences.find((x) => x.id === id);
  if (c) {
    c.active = active;
    persist();
  }
}

export type BulkResult = { added: number; removed: number; skipped: number };

export async function m_bulkAssign(
  operatorIds: string[],
  competenceIds: string[],
  changedBy: string,
): Promise<BulkResult> {
  let added = 0;
  let skipped = 0;
  const existing = new Set(
    store.operator_competences.map((r) => `${r.operator_id}::${r.competence_id}`),
  );
  const now = new Date().toISOString();
  for (const op of operatorIds) {
    for (const c of competenceIds) {
      const key = `${op}::${c}`;
      if (existing.has(key)) {
        skipped++;
        continue;
      }
      existing.add(key);
      store.operator_competences.push({
        id: uid(),
        operator_id: op,
        competence_id: c,
        created_at: now,
        created_by: changedBy,
      });
      store.training_log.unshift({
        id: uid(),
        operator_id: op,
        competence_id: c,
        action: "added",
        changed_by: changedBy,
        created_at: now,
      });
      added++;
    }
  }
  persist();
  return { added, removed: 0, skipped };
}

export async function m_bulkUnassign(
  operatorIds: string[],
  competenceIds: string[],
  changedBy: string,
): Promise<BulkResult> {
  let removed = 0;
  let skipped = 0;
  const now = new Date().toISOString();
  const opSet = new Set(operatorIds);
  const compSet = new Set(competenceIds);
  const keep: OperatorCompetence[] = [];
  for (const r of store.operator_competences) {
    if (opSet.has(r.operator_id) && compSet.has(r.competence_id)) {
      removed++;
      store.training_log.unshift({
        id: uid(),
        operator_id: r.operator_id,
        competence_id: r.competence_id,
        action: "removed",
        changed_by: changedBy,
        created_at: now,
      });
    } else {
      keep.push(r);
    }
  }
  // Selected pairs that had no existing assignment count as skipped.
  skipped = operatorIds.length * competenceIds.length - removed;
  store.operator_competences = keep;
  persist();
  return { added: 0, removed, skipped };
}

export async function m_importOperators(rows: Omit<Operator, "id" | "created_at">[]) {
  const byEmp = new Map(store.operators.map((o) => [o.employee_id, o]));
  for (const r of rows) {
    const existing = byEmp.get(r.employee_id);
    if (existing) Object.assign(existing, r);
    else
      store.operators.push({
        ...r,
        id: uid(),
        created_at: new Date().toISOString(),
      });
  }
  persist();
}

export async function m_importCompetences(rows: Omit<Competence, "id" | "created_at">[]) {
  const byCode = new Map(store.competences.map((c) => [c.competence_id, c]));
  for (const r of rows) {
    const existing = byCode.get(r.competence_id);
    if (existing) Object.assign(existing, r);
    else
      store.competences.push({
        ...r,
        id: uid(),
        created_at: new Date().toISOString(),
      });
  }
  persist();
}
