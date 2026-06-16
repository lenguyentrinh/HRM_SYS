CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch_id, date)
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_holidays" ON public.holidays
  FOR ALL USING (true) WITH CHECK (true);
