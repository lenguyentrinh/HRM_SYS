ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
