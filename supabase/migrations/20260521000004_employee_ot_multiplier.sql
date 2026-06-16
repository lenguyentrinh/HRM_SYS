-- Add per-employee OT multiplier override
-- NULL = use branch-level config (ot_multiplier_weekday)
-- Only applies to weekday OT; weekend and holiday multipliers remain global
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS ot_multiplier_override NUMERIC(3,1) NULL;
