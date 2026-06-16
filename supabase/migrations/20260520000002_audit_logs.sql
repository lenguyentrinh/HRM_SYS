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
