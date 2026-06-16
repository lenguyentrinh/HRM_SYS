# Skill: Tạo Database Migration

## Dùng khi
Cần thêm bảng, cột, index, RLS policy, hoặc function mới vào database.

## Tạo file

```bash
supabase migration new <description>
# Tạo file: supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

## Template migration đầy đủ

```sql
-- ============================================
-- Migration: <mô tả ngắn>
-- ============================================

-- 1. Tạo enum types (nếu cần)
CREATE TYPE employee_type AS ENUM ('fulltime', 'parttime');

-- 2. Tạo bảng
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

-- 5. Enable RLS (LUÔN BẬT)
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Super admin / manager: full access trong branch
CREATE POLICY "admin_full_access" ON table_name
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'manager')
      AND users.branch_id = table_name.branch_id
    )
  );

-- Employee: chỉ xem record của bản thân
CREATE POLICY "employee_own_access" ON table_name
  FOR SELECT USING (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  );
```

## Checklist trước khi chạy
- [ ] Tên bảng và cột đúng theo DATABASE.md
- [ ] Có `branch_id` nếu bảng cần multi-branch support
- [ ] RLS đã bật
- [ ] Policies đủ cho các role: super_admin, manager, employee
- [ ] Index trên các cột thường query (foreign keys, status, date)

## Apply migration

```bash
supabase db push   # Apply lên Supabase project
# hoặc
supabase db reset  # Reset local + apply tất cả migrations
```
