import {
  m_fetchOperators,
  m_fetchCompetences,
  m_fetchOperatorCompetences,
  m_fetchTrainingLog,
  m_fetchRoleRequirements,
} from "./mock-store";

export const ROLES = [
  "Charger",
  "Shift Leader",
  "Ugnsman",
  "Hertwich Operator",
  "Casting Operator",
  "Laboratory Technician",
  "Maintenance Technician",
  "Logistics Operator",
] as const;
export type RoleName = (typeof ROLES)[number];
export type Level = 0 | 1 | 2 | 3 | 4;

export type Operator = {
  id: string;
  employee_id: string;
  last_name: string;
  first_name: string;
  shift: string | null;
  area: string | null;
  role: RoleName | string | null;
  active: boolean;
  created_at: string;
};
export type Competence = {
  id: string;
  competence_id: string;
  competence_name: string;
  area?: string | null;
  active: boolean;
  created_at: string;
};
export type OperatorCompetence = {
  id: string;
  operator_id: string;
  competence_id: string;
  actual_level: Level;
  required_level?: Level | null;
  assigned_date: string;
  created_at: string;
  created_by: string | null;
  updated_by: string | null;
  updated_at: string;
};
export type RoleRequirement = {
  id: string;
  role: string;
  competence_id: string;
  required_level: Level;
  mandatory: boolean;
  updated_by: string | null;
  updated_at: string;
};
export type TrainingLogAction =
  "Created" | "Level updated" | "Removed" | "Role requirement changed";
export type TrainingLogRow = {
  id: string;
  operator_id: string | null;
  competence_id: string | null;
  role?: string | null;
  old_level: Level | null;
  new_level: Level | null;
  action: TrainingLogAction;
  changed_by: string | null;
  created_at: string;
};

export const CHANGED_BY_KEY = "kubal_changed_by";
export const DEFAULT_CHANGED_BY = "Nam Nguyen";
export function getChangedBy(): string {
  if (typeof window === "undefined") return DEFAULT_CHANGED_BY;
  return localStorage.getItem(CHANGED_BY_KEY) || DEFAULT_CHANGED_BY;
}
export const LEVEL_LABELS: Record<Level, string> = {
  0: "No competence",
  1: "Basic knowledge",
  2: "Can perform with support",
  3: "Independent",
  4: "Expert / trainer",
};
export const fetchOperators = m_fetchOperators;
export const fetchCompetences = m_fetchCompetences;
export const fetchOperatorCompetences = m_fetchOperatorCompetences;
export const fetchTrainingLog = m_fetchTrainingLog;
export const fetchRoleRequirements = m_fetchRoleRequirements;
