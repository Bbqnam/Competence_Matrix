// Data access layer. For the demo build, all reads/writes go through a
// local persistent mock store (src/lib/mock-store.ts) so the app is stable
// even without a backend connection.

import {
  m_fetchOperators,
  m_fetchCompetences,
  m_fetchOperatorCompetences,
  m_fetchTrainingLog,
} from "./mock-store";

export type Operator = {
  id: string;
  employee_id: string;
  last_name: string;
  first_name: string;
  shift: string | null;
  area: string | null;
  active: boolean;
  created_at: string;
};

export type Competence = {
  id: string;
  competence_id: string;
  competence_name: string;
  active: boolean;
  created_at: string;
};

export type OperatorCompetence = {
  id: string;
  operator_id: string;
  competence_id: string;
  created_at: string;
  created_by: string | null;
};

export type TrainingLogRow = {
  id: string;
  operator_id: string;
  competence_id: string;
  action: "added" | "removed";
  changed_by: string | null;
  created_at: string;
};

export const CHANGED_BY_KEY = "kubal_changed_by";
export const DEFAULT_CHANGED_BY = "Nam Nguyen";

export function getChangedBy(): string {
  if (typeof window === "undefined") return DEFAULT_CHANGED_BY;
  return localStorage.getItem(CHANGED_BY_KEY) || DEFAULT_CHANGED_BY;
}

export const fetchOperators = m_fetchOperators;
export const fetchCompetences = m_fetchCompetences;
export const fetchOperatorCompetences = m_fetchOperatorCompetences;
export const fetchTrainingLog = m_fetchTrainingLog;
