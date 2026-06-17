-- =============================================================================
-- INITIAL SCHEMA – HRM Management App (Custom Auth – does not use Supabase Auth)
-- Run this entire file in Supabase SQL Editor
--
-- Reset if you need to run from scratch:
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
-- TABLE: users  (custom auth – not linked to auth.users)
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
-- TABLE: shift_schedules (specific date, takes priority over assignment)
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
-- RLS – fully open for anon key (internal app, auth managed at app layer)
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

-- Allow anon key to read/write all (authorization handled at app layer)
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
-- SEED: Create initial data
-- password_hash is SHA-256 of '123456'
-- Replace with real hash via app or compute at: https://emn178.github.io/online-tools/sha256.html
-- =============================================================================

-- Step 1: create branch
INSERT INTO public.branches (id, name, address)
VALUES ('00000000-0000-0000-0000-000000000001', 'Main Branch', 'Company Address')
ON CONFLICT DO NOTHING;

-- Step 2: create super_admin
-- password '123456' → SHA-256: 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
INSERT INTO public.users (id, branch_id, phone, password_hash, role)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '0901234567',
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  'super_admin'
)
ON CONFLICT DO NOTHING;

-- Step 3: create default leave policies
INSERT INTO public.leave_policies (branch_id, employee_type, total_paid_days_per_year, carry_over_enabled, min_advance_notice_days)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'fulltime', 12, true, 1),
  ('00000000-0000-0000-0000-000000000001', 'parttime', 6, false, 1)
ON CONFLICT DO NOTHING;
