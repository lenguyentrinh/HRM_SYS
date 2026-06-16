-- =============================================================================
-- INITIAL SCHEMA â€“ HRM Management App (Custom Auth â€“ khÃ´ng dÃ¹ng Supabase Auth)
-- Cháº¡y toÃ n bá»™ file nÃ y trong Supabase SQL Editor
--
-- Reset náº¿u cáº§n cháº¡y láº¡i tá»« Ä‘áº§u:
--   DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO anon, authenticated, service_role;
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE: branches
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.branches (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  address    TEXT,
  phone      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: users  (custom auth â€“ khÃ´ng liÃªn káº¿t auth.users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id     UUID REFERENCES public.branches(id),
  phone         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('super_admin', 'manager', 'employee')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- =============================================================================
-- TABLE: employees
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.employees (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
  branch_id     UUID NOT NULL REFERENCES public.branches(id),
  employee_code TEXT UNIQUE NOT NULL DEFAULT '',
  full_name     TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('fulltime', 'parttime')),
  department    TEXT,
  position      TEXT,
  base_salary   NUMERIC(15,2) NOT NULL CHECK (base_salary > 0),
  allowance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  join_date     DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  avatar_url    TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS employee_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_employee_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employee_code IS NULL OR NEW.employee_code = '' THEN
    NEW.employee_code := 'EMP-' || LPAD(nextval('employee_code_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_employee_code
  BEFORE INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION generate_employee_code();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: shifts
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.shifts (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id            UUID NOT NULL REFERENCES public.branches(id),
  name                 TEXT NOT NULL,
  start_time           TIME NOT NULL,
  end_time             TIME NOT NULL,
  is_overnight         BOOLEAN NOT NULL DEFAULT FALSE,
  grace_period_minutes INT NOT NULL DEFAULT 5 CHECK (grace_period_minutes >= 0),
  early_leave_minutes  INT NOT NULL DEFAULT 15 CHECK (early_leave_minutes >= 0),
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: employee_shift_assignments
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.employee_shift_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_id    UUID NOT NULL REFERENCES public.shifts(id),
  month       SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year        SMALLINT NOT NULL CHECK (year >= 2020),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, month, year)
);

-- =============================================================================
-- TABLE: shift_schedules (ngÃ y cá»¥ thá»ƒ, Æ°u tiÃªn hÆ¡n assignment)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.shift_schedules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_id    UUID NOT NULL REFERENCES public.shifts(id),
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, date)
);

-- =============================================================================
-- TABLE: shift_change_requests
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.shift_change_requests (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id        UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  target_date        DATE NOT NULL,
  current_shift_id   UUID NOT NULL REFERENCES public.shifts(id),
  requested_shift_id UUID NOT NULL REFERENCES public.shifts(id),
  reason             TEXT,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by        UUID REFERENCES public.users(id),
  reviewed_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: qr_tokens
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.qr_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id   UUID NOT NULL REFERENCES public.shifts(id),
  date       DATE NOT NULL,
  token      UUID NOT NULL DEFAULT uuid_generate_v4(),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shift_id, date)
);

-- =============================================================================
-- TABLE: attendance_records
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_id            UUID NOT NULL REFERENCES public.shifts(id),
  date                DATE NOT NULL,
  check_in_at         TIMESTAMPTZ,
  check_out_at        TIMESTAMPTZ,
  check_in_source     TEXT CHECK (check_in_source IN ('qr', 'manual', 'system')),
  check_out_source    TEXT CHECK (check_out_source IN ('qr', 'manual', 'system')),
  status              TEXT NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'late', 'absent', 'leave', 'holiday')),
  late_minutes        INT NOT NULL DEFAULT 0,
  early_leave_minutes INT NOT NULL DEFAULT 0,
  overtime_minutes    INT NOT NULL DEFAULT 0,
  leave_request_id    UUID,
  notes               TEXT,
  created_by          UUID REFERENCES public.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, date, shift_id)
);

CREATE TRIGGER attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: leave_policies
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.leave_policies (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id                UUID NOT NULL REFERENCES public.branches(id),
  employee_type            TEXT NOT NULL CHECK (employee_type IN ('fulltime', 'parttime')),
  total_paid_days_per_year INT NOT NULL DEFAULT 12,
  carry_over_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  max_carry_over_days      INT NOT NULL DEFAULT 0,
  min_advance_notice_days  INT NOT NULL DEFAULT 1,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (branch_id, employee_type)
);

-- =============================================================================
-- TABLE: leave_balances
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year            SMALLINT NOT NULL,
  total_paid_days INT NOT NULL DEFAULT 12,
  used_paid_days  NUMERIC(5,1) NOT NULL DEFAULT 0,
  carried_over    NUMERIC(5,1) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, year)
);

-- =============================================================================
-- TABLE: leave_requests
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type  TEXT NOT NULL CHECK (leave_type IN ('paid', 'unpaid', 'sick', 'other')),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  total_days  NUMERIC(5,1) NOT NULL,
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_leave_fkey
  FOREIGN KEY (leave_request_id) REFERENCES public.leave_requests(id);

-- =============================================================================
-- TABLE: payroll_configs
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.payroll_configs (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id                  UUID NOT NULL REFERENCES public.branches(id),
  effective_from             DATE NOT NULL,
  working_days_standard      INT NOT NULL DEFAULT 26,
  bhxh_employee_rate         NUMERIC(5,4) NOT NULL DEFAULT 0.105,
  bhxh_employer_rate         NUMERIC(5,4) NOT NULL DEFAULT 0.215,
  ot_multiplier_weekday      NUMERIC(4,2) NOT NULL DEFAULT 1.5,
  ot_multiplier_weekend      NUMERIC(4,2) NOT NULL DEFAULT 2.0,
  ot_multiplier_holiday      NUMERIC(4,2) NOT NULL DEFAULT 3.0,
  late_penalty_per_minute    NUMERIC(10,2) NOT NULL DEFAULT 0,
  absent_penalty_per_day     NUMERIC(10,2) NOT NULL DEFAULT 0,
  attendance_bonus           NUMERIC(10,2) NOT NULL DEFAULT 0,
  attendance_bonus_condition INT NOT NULL DEFAULT 26,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (branch_id, effective_from)
);

-- =============================================================================
-- TABLE: payroll_records
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.payroll_records (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id            UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month                  SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year                   SMALLINT NOT NULL CHECK (year >= 2020),
  working_days_standard  INT NOT NULL DEFAULT 26,
  working_days_actual    INT NOT NULL DEFAULT 0,
  total_overtime_minutes INT NOT NULL DEFAULT 0,
  total_late_minutes     INT NOT NULL DEFAULT 0,
  total_absent_days      INT NOT NULL DEFAULT 0,
  base_salary            NUMERIC(15,2) NOT NULL,
  salary_earned          NUMERIC(15,2) NOT NULL DEFAULT 0,
  allowance              NUMERIC(15,2) NOT NULL DEFAULT 0,
  overtime_pay           NUMERIC(15,2) NOT NULL DEFAULT 0,
  attendance_bonus       NUMERIC(15,2) NOT NULL DEFAULT 0,
  late_penalty           NUMERIC(15,2) NOT NULL DEFAULT 0,
  absent_penalty         NUMERIC(15,2) NOT NULL DEFAULT 0,
  gross_salary           NUMERIC(15,2) NOT NULL DEFAULT 0,
  bhxh_employee          NUMERIC(15,2) NOT NULL DEFAULT 0,
  bhxh_employer          NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount             NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_salary             NUMERIC(15,2) NOT NULL DEFAULT 0,
  status                 TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
  notes                  TEXT,
  confirmed_by           UUID REFERENCES public.users(id),
  confirmed_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, month, year)
);

CREATE TRIGGER payroll_records_updated_at
  BEFORE UPDATE ON public.payroll_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: notifications
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  related_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: audit_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES public.users(id),
  action     TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id  UUID,
  old_data   JSONB,
  new_data   JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_employees_branch_id          ON public.employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_status             ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date     ON public.attendance_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date              ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee      ON public.leave_requests(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user           ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_token              ON public.qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_employee_date ON public.shift_schedules(employee_id, date);

-- =============================================================================
-- RLS â€“ má»Ÿ hoÃ n toÃ n cho anon key (app ná»™i bá»™, auth tá»± quáº£n lÃ½ á»Ÿ táº§ng app)
-- =============================================================================
ALTER TABLE public.branches                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_schedules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_change_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_tokens                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_policies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_configs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs                ENABLE ROW LEVEL SECURITY;

-- Cho phÃ©p anon key Ä‘á»c/ghi táº¥t cáº£ (authorization Ä‘Æ°á»£c xá»­ lÃ½ á»Ÿ táº§ng app)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'branches','users','employees','shifts','employee_shift_assignments',
    'shift_schedules','shift_change_requests','qr_tokens','attendance_records',
    'leave_policies','leave_balances','leave_requests','payroll_configs',
    'payroll_records','notifications','audit_logs'
  ] LOOP
    EXECUTE format('CREATE POLICY "allow_all_%s" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- =============================================================================
-- SEED: Táº¡o dá»¯ liá»‡u ban Ä‘áº§u
-- password_hash lÃ  SHA-256 cá»§a '123456'
-- Thay báº±ng hash tháº­t qua app hoáº·c tÃ­nh táº¡i: https://emn178.github.io/online-tools/sha256.html
-- =============================================================================

-- BÆ°á»›c 1: táº¡o branch
INSERT INTO public.branches (id, name, address)
VALUES ('00000000-0000-0000-0000-000000000001', 'Chi nhÃ¡nh chÃ­nh', 'Äá»‹a chá»‰ cÃ´ng ty')
ON CONFLICT DO NOTHING;

-- BÆ°á»›c 2: táº¡o super_admin
-- password '123456' â†’ SHA-256: 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
INSERT INTO public.users (id, branch_id, phone, password_hash, role)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '0901234567',
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  'super_admin'
)
ON CONFLICT DO NOTHING;

-- BÆ°á»›c 3: táº¡o leave policies máº·c Ä‘á»‹nh
INSERT INTO public.leave_policies (branch_id, employee_type, total_paid_days_per_year, carry_over_enabled, min_advance_notice_days)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'fulltime', 12, true, 1),
  ('00000000-0000-0000-0000-000000000001', 'parttime', 6, false, 1)
ON CONFLICT DO NOTHING;

-- ========================================
-- Migration: 20260518000002_shift_change_rejection_reason.sql
-- ========================================

ALTER TABLE shift_change_requests
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ========================================
-- Migration: 20260518000003_leave_balance_auto_seed.sql
-- ========================================

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

-- ========================================
-- Migration: 20260518000004_branch_default_password.sql
-- ========================================

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS default_employee_password TEXT NOT NULL DEFAULT '123456';

-- ========================================
-- Migration: 20260518000005_leave_rejection_reason.sql
-- ========================================

ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ========================================
-- Migration: 20260519000001_notifications_realtime.sql
-- ========================================

-- Enable full row tracking so Realtime can deliver old/new row values
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add notifications to the Supabase Realtime publication
-- Without this, postgres_changes subscriptions on this table never fire
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ========================================
-- Migration: 20260520000001_holidays.sql
-- ========================================

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

-- ========================================
-- Migration: 20260520000002_audit_logs.sql
-- ========================================

-- audit_logs table may already exist from initial schema with fewer columns.
-- Use ADD COLUMN IF NOT EXISTS to safely add missing columns.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns that may not exist if table was created with an older schema
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_type TEXT,
  ADD COLUMN IF NOT EXISTS target_id UUID,
  ADD COLUMN IF NOT EXISTS details JSONB;

CREATE INDEX IF NOT EXISTS audit_logs_branch_id_idx ON public.audit_logs(branch_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs(user_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_logs' AND policyname = 'anon_read_audit_logs'
  ) THEN
    CREATE POLICY "anon_read_audit_logs" ON public.audit_logs
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_logs' AND policyname = 'anon_insert_audit_logs'
  ) THEN
    CREATE POLICY "anon_insert_audit_logs" ON public.audit_logs
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- ========================================
-- Migration: 20260521000001_employee_bonuses.sql
-- ========================================

-- Khoáº£n thÆ°á»Ÿng/pháº¡t Ä‘áº·c biá»‡t ngoÃ i tÃ­nh toÃ¡n tá»± Ä‘á»™ng (per nhÃ¢n viÃªn, per thÃ¡ng)
CREATE TABLE IF NOT EXISTS public.employee_bonuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  amount NUMERIC(12,0) NOT NULL, -- positive = thÆ°á»Ÿng, negative = pháº¡t
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

-- ThÃªm cá»™t special_bonus vÃ o payroll_records (tá»•ng employee_bonuses thÃ¡ng Ä‘Ã³)
ALTER TABLE public.payroll_records
  ADD COLUMN IF NOT EXISTS special_bonus NUMERIC(12,0) NOT NULL DEFAULT 0;

-- ========================================
-- Migration: 20260521000002_leave_balance_trigger_fix.sql
-- ========================================

-- Cáº­p nháº­t trigger seed_leave_balance Ä‘á»ƒ Ä‘á»c tá»« leave_policies thay vÃ¬ hardcode 12 ngÃ y
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

  -- Fallback vá» 12 náº¿u chÆ°a cáº¥u hÃ¬nh leave policy
  IF v_total_days IS NULL THEN
    v_total_days := 12;
  END IF;

  INSERT INTO public.leave_balances (employee_id, year, total_paid_days, used_paid_days, carried_over)
  VALUES (NEW.id, EXTRACT(YEAR FROM NOW())::INTEGER, v_total_days, 0, 0)
  ON CONFLICT (employee_id, year) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Migration: 20260521000003_grant_table_permissions.sql
-- ========================================

-- Grant table-level permissions to anon, authenticated, and service_role.
-- Without these, PostgreSQL rejects access before RLS policies are evaluated,
-- causing "permission denied for table X" errors in edge functions and client queries.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Ensure future tables also get the same permissions automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ========================================
-- Migration: 20260521000004_employee_ot_multiplier.sql
-- ========================================

-- Add per-employee OT multiplier override
-- NULL = use branch-level config (ot_multiplier_weekday)
-- Only applies to weekday OT; weekend and holiday multipliers remain global
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS ot_multiplier_override NUMERIC(3,1) NULL;

-- ========================================
-- Migration: 20260521000005_branch_default_allowance.sql
-- ========================================

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS default_allowance_fulltime NUMERIC DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS default_allowance_parttime NUMERIC DEFAULT 0 NOT NULL;

-- ========================================
-- Enable pg_cron extension & schedule QR gen
-- ========================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'generate-qr-daily',
  '30 23 * * *',
  $$SELECT net.http_post(
    url:='https://comowysogauuepbctpzu.supabase.co/functions/v1/generate-qr',
    headers:='{"Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  )$$
);
