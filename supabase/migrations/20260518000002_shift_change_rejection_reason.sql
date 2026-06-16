ALTER TABLE shift_change_requests
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
