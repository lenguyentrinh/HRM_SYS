-- Khoản thưởng/phạt đặc biệt ngoài tính toán tự động (per nhân viên, per tháng)
CREATE TABLE IF NOT EXISTS public.employee_bonuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  amount NUMERIC(12,0) NOT NULL, -- positive = thưởng, negative = phạt
  reason TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS employee_bonuses_emp_month_idx
  ON public.employee_bonuses(employee_id, month, year);

ALTER TABLE public.employee_bonuses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'employee_bonuses' AND policyname = 'allow_all_employee_bonuses'
  ) THEN
    CREATE POLICY "allow_all_employee_bonuses" ON public.employee_bonuses
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Thêm cột special_bonus vào payroll_records (tổng employee_bonuses tháng đó)
ALTER TABLE public.payroll_records
  ADD COLUMN IF NOT EXISTS special_bonus NUMERIC(12,0) NOT NULL DEFAULT 0;
