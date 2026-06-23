import { supabase } from "@/integrations/supabase/client";

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

export function getChangedBy(): string {
  if (typeof window === "undefined") return "system";
  return localStorage.getItem(CHANGED_BY_KEY) || "shiftleader";
}

export async function fetchOperators() {
  const { data, error } = await supabase
    .from("operators")
    .select("*")
    .order("last_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Operator[];
}

export async function fetchCompetences() {
  const { data, error } = await supabase
    .from("competences")
    .select("*")
    .order("competence_id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Competence[];
}

export async function fetchOperatorCompetences() {
  const { data, error } = await supabase.from("operator_competences").select("*");
  if (error) throw error;
  return (data ?? []) as OperatorCompetence[];
}

export async function fetchTrainingLog() {
  const { data, error } = await supabase
    .from("training_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as TrainingLogRow[];
}
