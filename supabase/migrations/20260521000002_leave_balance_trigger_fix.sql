-- Cập nhật trigger seed_leave_balance để đọc từ leave_policies thay vì hardcode 12 ngày
CREATE OR REPLACE FUNCTION public.seed_leave_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_total_days INTEGER;
BEGIN
  SELECT lp.total_paid_days_per_year INTO v_total_days
  FROM public.leave_policies lp
  WHERE lp.branch_id = NEW.branch_id
    AND lp.employee_type = NEW.type
  LIMIT 1;

  -- Fallback về 12 nếu chưa cấu hình leave policy
  IF v_total_days IS NULL THEN
    v_total_days := 12;
  END IF;

  INSERT INTO public.leave_balances (employee_id, year, total_paid_days, used_paid_days, carried_over)
  VALUES (NEW.id, EXTRACT(YEAR FROM NOW())::INTEGER, v_total_days, 0, 0)
  ON CONFLICT (employee_id, year) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
