import type {
  Operator,
  Competence,
  OperatorCompetence,
  TrainingLogRow,
  RoleRequirement,
  Level,
} from "./db";

const MOCK_ROLES = [
  "Charger",
  "Shift Leader",
  "Ugnsman",
  "Hertwich Operator",
  "Casting Operator",
  "Laboratory Technician",
  "Maintenance Technician",
  "Logistics Operator",
] as const;

const STORAGE_KEY = "kubal_mock_store_v4_levels_roles";
const AREAS = ["Electrolysis", "Casthouse", "Maintenance", "Laboratory", "Logistics"] as const;
const SHIFTS = ["164", "165", "261", "262", "Day"] as const;
type Store = {
  operators: Operator[];
  competences: Competence[];
  operator_competences: OperatorCompetence[];
  role_requirements: RoleRequirement[];
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
  return globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}`;
}
const nowIso = () => new Date().toISOString();

function seed(): Store {
  const first = [
    "Nam",
    "Erik",
    "Anna",
    "Johan",
    "Maria",
    "Karl",
    "Elin",
    "Lars",
    "Sara",
    "Anders",
    "Emma",
    "Peter",
    "Linda",
    "Mikael",
    "Sofia",
    "Andreas",
    "Helena",
    "Oskar",
    "Camilla",
    "Fredrik",
    "Marta",
    "Gustav",
    "Ida",
    "Henrik",
    "Jenny",
    "Björn",
    "Lisa",
    "Tobias",
    "Malin",
    "Viktor",
  ];
  const last = [
    "Nguyen",
    "Andersson",
    "Johansson",
    "Karlsson",
    "Nilsson",
    "Eriksson",
    "Larsson",
    "Olsson",
    "Persson",
    "Svensson",
    "Gustafsson",
    "Pettersson",
    "Jonsson",
    "Jansson",
    "Hansson",
    "Bengtsson",
    "Lindberg",
    "Lindström",
    "Berg",
    "Sandberg",
    "Lundgren",
    "Åberg",
    "Sjöberg",
    "Holm",
    "Ek",
    "Fredriksson",
    "Wallin",
    "Forsberg",
    "Berglund",
    "Norén",
  ];
  const roleArea: Record<string, string> = {
    Charger: "Electrolysis",
    "Shift Leader": "Electrolysis",
    Ugnsman: "Electrolysis",
    "Hertwich Operator": "Casthouse",
    "Casting Operator": "Casthouse",
    "Laboratory Technician": "Laboratory",
    "Maintenance Technician": "Maintenance",
    "Logistics Operator": "Logistics",
  };
  const roleCycle = [
    ...MOCK_ROLES,
    ...MOCK_ROLES,
    ...MOCK_ROLES,
    "Charger",
    "Shift Leader",
    "Casting Operator",
    "Maintenance Technician",
    "Logistics Operator",
    "Hertwich Operator",
  ];
  const operators: Operator[] = first.map((fn, i) => {
    const role = roleCycle[i % roleCycle.length];
    return {
      id: uid(),
      employee_id: String(4001 + i),
      first_name: fn,
      last_name: last[i],
      shift: SHIFTS[i % SHIFTS.length],
      area: roleArea[role] ?? AREAS[i % AREAS.length],
      role,
      active: i !== 27,
      created_at: new Date(Date.now() - (30 - i) * 1728000000).toISOString(),
    };
  });
  const defs: [string, string, string][] = [
    ["01", "IDUS", "Electrolysis"],
    ["02", "Flexite", "Electrolysis"],
    ["03", "5S", "Electrolysis"],
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
  const competences: Competence[] = defs.map(([code, name, area]) => ({
    id: uid(),
    competence_id: code,
    competence_name: name,
    area,
    active: true,
    created_at: nowIso(),
  }));
  const cByName = new Map(competences.map((c) => [c.competence_name, c]));
  const reqDefs: Record<string, [string, Level][]> = {
    Charger: [
      ["IDUS", 3],
      ["Flexite", 3],
      ["Anode Change", 2],
      ["Metal Tapping", 3],
    ],
    "Shift Leader": [
      ["IDUS", 4],
      ["Flexite", 4],
      ["5S", 3],
      ["Quality Reporting", 3],
    ],
    Ugnsman: [
      ["IDUS", 3],
      ["Furnace Operation", 2],
      ["Metal Tapping", 3],
      ["Travers / Overhead Crane", 2],
    ],
    "Hertwich Operator": [
      ["Furnace Operation", 3],
      ["Casting Line A", 3],
      ["Casting Line B", 2],
      ["Truck / Forklift", 2],
    ],
    "Casting Operator": [
      ["Casting Line A", 3],
      ["Casting Line B", 3],
      ["Quality Reporting", 2],
      ["Truck / Forklift", 2],
    ],
    "Laboratory Technician": [
      ["Sample Preparation", 3],
      ["Spectrometer XRF", 3],
      ["Quality Reporting", 3],
      ["5S", 2],
    ],
    "Maintenance Technician": [
      ["Preventive Maintenance", 3],
      ["Electrical Safety (ESA)", 3],
      ["Hydraulics", 2],
      ["Truck / Forklift", 2],
    ],
    "Logistics Operator": [
      ["Truck / Forklift", 3],
      ["Warehouse System", 3],
      ["Loading & Dispatch", 3],
      ["5S", 2],
    ],
  };
  const role_requirements: RoleRequirement[] = [];
  Object.entries(reqDefs).forEach(([role, reqs]) =>
    reqs.forEach(([name, lvl]) => {
      const c = cByName.get(name);
      if (c)
        role_requirements.push({
          id: uid(),
          role,
          competence_id: c.id,
          required_level: lvl,
          mandatory: true,
          updated_by: "System",
          updated_at: nowIso(),
        });
    }),
  );
  const operator_competences: OperatorCompetence[] = [];
  const training_log: TrainingLogRow[] = [];
  operators.forEach((op, oi) => {
    competences.forEach((c, ci) => {
      const req = role_requirements.find((r) => r.role === op.role && r.competence_id === c.id);
      const same = c.area === op.area;
      const chance = req ? (oi % 5 === 0 ? 0.55 : 0.86) : same ? 0.38 : 0.08;
      if (op.active && Math.random() < chance) {
        const level = Math.max(
          1,
          Math.min(
            4,
            (req
              ? req.required_level + (oi % 4 === 0 ? -1 : oi % 7 === 0 ? 1 : 0)
              : 1 + ((ci + oi) % 4)) as Level,
          ),
        );
        const t = new Date(Date.now() - Math.floor(Math.random() * 180) * 86400000).toISOString();
        operator_competences.push({
          id: uid(),
          operator_id: op.id,
          competence_id: c.id,
          actual_level: level,
          required_level: req?.required_level ?? 0,
          assigned_date: t,
          created_at: t,
          created_by: "Nam Nguyen",
          updated_by: "Nam Nguyen",
          updated_at: t,
        });
        training_log.push({
          id: uid(),
          operator_id: op.id,
          competence_id: c.id,
          old_level: null,
          new_level: level,
          action: "Created",
          changed_by: "Nam Nguyen",
          created_at: t,
        });
      }
    });
  });
  training_log.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return { operators, competences, operator_competences, role_requirements, training_log };
}
function isValidStore(value: unknown): value is Store {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Store>;
  return (
    Array.isArray(candidate.operators) &&
    Array.isArray(candidate.competences) &&
    Array.isArray(candidate.operator_competences) &&
    Array.isArray(candidate.role_requirements) &&
    Array.isArray(candidate.training_log)
  );
}

function saveSeededStore(storeToSave: Store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storeToSave));
  } catch (error) {
    console.warn("Unable to persist demo store", error);
  }
}

function load(): Store {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidStore(parsed)) return parsed;
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.warn("Resetting invalid demo store", error);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  const seeded = seed();
  saveSeededStore(seeded);
  return seeded;
}
let store = load();
function persist() {
  if (typeof window !== "undefined") saveSeededStore(store);
  notify();
}
export function resetDemo() {
  store = seed();
  persist();
}
export async function m_fetchOperators() {
  return [...store.operators].sort((a, b) => a.last_name.localeCompare(b.last_name));
}
export async function m_fetchCompetences() {
  return [...store.competences].sort((a, b) =>
    a.competence_id.localeCompare(b.competence_id, undefined, { numeric: true }),
  );
}
export async function m_fetchOperatorCompetences() {
  return [...store.operator_competences];
}
export async function m_fetchRoleRequirements() {
  return [...store.role_requirements];
}
export async function m_fetchTrainingLog() {
  return [...store.training_log].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}
export async function m_upsertOperator(
  input: Partial<Operator> & Pick<Operator, "employee_id" | "first_name" | "last_name">,
  id?: string,
) {
  if (id) {
    const e = store.operators.find((o) => o.id === id);
    if (!e) throw Error("Operator not found");
    Object.assign(e, input);
    persist();
    return e;
  }
  const c = {
    id: uid(),
    employee_id: input.employee_id,
    first_name: input.first_name,
    last_name: input.last_name,
    shift: input.shift ?? null,
    area: input.area ?? null,
    role: input.role ?? "Charger",
    active: input.active ?? true,
    created_at: nowIso(),
  };
  store.operators.push(c);
  persist();
  return c;
}
export async function m_setOperatorActive(id: string, active: boolean) {
  const o = store.operators.find((x) => x.id === id);
  if (o) {
    o.active = active;
    persist();
  }
}
export async function m_upsertCompetence(
  input: Partial<Competence> & Pick<Competence, "competence_id" | "competence_name">,
  id?: string,
) {
  if (id) {
    const e = store.competences.find((c) => c.id === id);
    if (!e) throw Error("Competence not found");
    Object.assign(e, input);
    persist();
    return e;
  }
  const c = {
    id: uid(),
    competence_id: input.competence_id,
    competence_name: input.competence_name,
    area: input.area ?? null,
    active: input.active ?? true,
    created_at: nowIso(),
  };
  store.competences.push(c);
  persist();
  return c;
}
export async function m_setCompetenceActive(id: string, active: boolean) {
  const c = store.competences.find((x) => x.id === id);
  if (c) {
    c.active = active;
    persist();
  }
}
export type BulkResult = { added: number; removed: number; updated: number; skipped: number };
export async function m_bulkSetLevel(
  operatorIds: string[],
  competenceIds: string[],
  level: Level,
  changedBy: string,
): Promise<BulkResult> {
  let added = 0,
    updated = 0,
    skipped = 0;
  const now = nowIso();
  for (const op of operatorIds)
    for (const c of competenceIds) {
      const row = store.operator_competences.find(
        (r) => r.operator_id === op && r.competence_id === c,
      );
      const req =
        store.role_requirements.find(
          (r) => r.role === store.operators.find((o) => o.id === op)?.role && r.competence_id === c,
        )?.required_level ?? 0;
      if (row) {
        if (row.actual_level === level) {
          skipped++;
          continue;
        }
        const old = row.actual_level;
        row.actual_level = level;
        row.required_level = req;
        row.updated_at = now;
        row.updated_by = changedBy;
        updated++;
        store.training_log.unshift({
          id: uid(),
          operator_id: op,
          competence_id: c,
          old_level: old,
          new_level: level,
          action: "Level updated",
          changed_by: changedBy,
          created_at: now,
        });
      } else {
        store.operator_competences.push({
          id: uid(),
          operator_id: op,
          competence_id: c,
          actual_level: level,
          required_level: req,
          assigned_date: now,
          created_at: now,
          created_by: changedBy,
          updated_by: changedBy,
          updated_at: now,
        });
        added++;
        store.training_log.unshift({
          id: uid(),
          operator_id: op,
          competence_id: c,
          old_level: null,
          new_level: level,
          action: "Created",
          changed_by: changedBy,
          created_at: now,
        });
      }
    }
  persist();
  return { added, updated, removed: 0, skipped };
}
export async function m_bulkAssign(o: string[], c: string[], by: string) {
  return m_bulkSetLevel(o, c, 3, by);
}
export async function m_bulkUnassign(
  operatorIds: string[],
  competenceIds: string[],
  changedBy: string,
): Promise<BulkResult> {
  let removed = 0,
    skipped = 0;
  const now = nowIso();
  const keep: OperatorCompetence[] = [];
  for (const r of store.operator_competences) {
    if (operatorIds.includes(r.operator_id) && competenceIds.includes(r.competence_id)) {
      removed++;
      store.training_log.unshift({
        id: uid(),
        operator_id: r.operator_id,
        competence_id: r.competence_id,
        old_level: r.actual_level,
        new_level: 0,
        action: "Removed",
        changed_by: changedBy,
        created_at: now,
      });
    } else keep.push(r);
  }
  skipped = operatorIds.length * competenceIds.length - removed;
  store.operator_competences = keep;
  persist();
  return { added: 0, updated: 0, removed, skipped };
}
export async function m_setRoleRequirement(
  role: string,
  competenceId: string,
  mandatory: boolean,
  requiredLevel: Level,
  changedBy: string,
) {
  const existing = store.role_requirements.find(
    (r) => r.role === role && r.competence_id === competenceId,
  );
  const now = nowIso();
  if (existing) {
    existing.mandatory = mandatory;
    existing.required_level = requiredLevel;
    existing.updated_by = changedBy;
    existing.updated_at = now;
  } else if (mandatory)
    store.role_requirements.push({
      id: uid(),
      role,
      competence_id: competenceId,
      mandatory,
      required_level: requiredLevel,
      updated_by: changedBy,
      updated_at: now,
    });
  if (!mandatory)
    store.role_requirements = store.role_requirements.filter(
      (r) => !(r.role === role && r.competence_id === competenceId),
    );
  store.training_log.unshift({
    id: uid(),
    operator_id: null,
    competence_id: competenceId,
    role,
    old_level: null,
    new_level: mandatory ? requiredLevel : 0,
    action: "Role requirement changed",
    changed_by: changedBy,
    created_at: now,
  });
  persist();
}
export async function m_importOperators(rows: Omit<Operator, "id" | "created_at">[]) {
  rows.forEach((r) => store.operators.push({ ...r, id: uid(), created_at: nowIso() }));
  persist();
}
export async function m_importCompetences(rows: Omit<Competence, "id" | "created_at">[]) {
  rows.forEach((r) => store.competences.push({ ...r, id: uid(), created_at: nowIso() }));
  persist();
}
