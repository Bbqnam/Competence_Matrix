
CREATE TABLE public.operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL UNIQUE,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  shift TEXT,
  area TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operators TO anon, authenticated;
GRANT ALL ON public.operators TO service_role;
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access" ON public.operators FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.competences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competence_id TEXT NOT NULL UNIQUE,
  competence_name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competences TO anon, authenticated;
GRANT ALL ON public.competences TO service_role;
ALTER TABLE public.competences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access" ON public.competences FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.operator_competences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  competence_id UUID NOT NULL REFERENCES public.competences(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  UNIQUE (operator_id, competence_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operator_competences TO anon, authenticated;
GRANT ALL ON public.operator_competences TO service_role;
ALTER TABLE public.operator_competences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access" ON public.operator_competences FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.training_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  competence_id UUID NOT NULL REFERENCES public.competences(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('added','removed')),
  changed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_log TO anon, authenticated;
GRANT ALL ON public.training_log TO service_role;
ALTER TABLE public.training_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access" ON public.training_log FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX ON public.operator_competences (operator_id);
CREATE INDEX ON public.operator_competences (competence_id);
CREATE INDEX ON public.training_log (created_at DESC);
