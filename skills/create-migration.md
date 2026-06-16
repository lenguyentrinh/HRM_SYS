# Skill: Create a Database Migration

## When to use
When you need to add new tables, columns, indexes, RLS policies, or functions to the database.

## Create file

```bash
supabase migration new <description>
# Creates: supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

## Full migration template

```sql
-- ============================================
-- Migration: <short description>
-- ============================================

-- 1. Create enum types (if needed)
CREATE TYPE employee_type AS ENUM ('fulltime', 'parttime');

-- 2. Create table
CREATE TABLE IF NOT EXISTS table_name (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  -- ... columns
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_table_name_branch_id ON table_name(branch_id);
CREATE INDEX idx_table_name_created_at ON table_name(created_at DESC);

-- 4. Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_table_name_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Enable RLS (ALWAYS ENABLE)
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Super admin / manager: full access within branch
CREATE POLICY "admin_full_access" ON table_name
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'manager')
      AND users.branch_id = table_name.branch_id
    )
  );

-- Employee: view own records only
CREATE POLICY "employee_own_access" ON table_name
  FOR SELECT USING (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  );
```

## Pre-run checklist
- [ ] Table and column names match DATABASE.md
- [ ] Includes `branch_id` if table needs multi-branch support
- [ ] RLS enabled
- [ ] Policies cover all roles: super_admin, manager, employee
- [ ] Index on frequently queried columns (foreign keys, status, date)

## Apply migration

```bash
supabase db push   # Apply to Supabase project
# or
supabase db reset  # Reset local + apply all migrations
```
