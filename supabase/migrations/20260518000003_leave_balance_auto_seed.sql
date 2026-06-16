-- Auto-create leave_balance for the current year when a new employee is inserted.
-- total_paid_days defaults to 12 (fulltime); admin can adjust afterwards.
CREATE OR REPLACE FUNCTION public.seed_leave_balance_on_employee_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.leave_balances (employee_id, year, total_paid_days, used_paid_days, carried_over)
  VALUES (NEW.id, EXTRACT(YEAR FROM NOW())::SMALLINT, 12, 0, 0)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_leave_balance ON public.employees;
CREATE TRIGGER trg_seed_leave_balance
  AFTER INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.seed_leave_balance_on_employee_insert();
