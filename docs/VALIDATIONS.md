# VALIDATIONS.md – Business Rules & Validation Logic

## Validation Principles

**2-layer validation** — client (fast UX) and server (security):
- **Client-only:** Rules that cause no harm if bypassed (e.g.: input formatting)
- **Server-only:** Complex rules requiring DB queries (e.g.: phone uniqueness check)
- **Both:** Critical rules that must never be skipped (e.g.: valid dates, amount > 0)

**Never validate only on client** for sensitive data (salary, attendance, approvals). Client code can be bypassed.

**On validation failure:**
- Client: show inline error below the field, do not submit form
- Edge Function: return HTTP 400 with `{ error: "error_code", message: "..." }`
- DB constraint: Supabase returns PostgreSQL error — catch on client and map to user-friendly message

This document defines all business rules requiring validation. Each rule specifies: validation location (client / Edge Function), error message returned.

---

## Attendance

### ATT-01: Valid QR Token
- **Rule:** Token must exist, `is_active = true`, and `expires_at > now()`
- **Validate:** Edge Function `checkin`
- **Error:** `"QR code has expired or is invalid"`

### ATT-02: Employee belongs to shift
- **Rule:** Employee can only check-in with QR of the shift assigned to them on that day (check `shift_schedules` → fallback `employee_shift_assignments`)
- **Validate:** Edge Function `checkin`
- **Error:** `"You are not assigned to this shift"`

### ATT-03: No duplicate check-in for same shift
- **Rule:** `attendance_records` already has `check_in_at IS NOT NULL` for the `(employee_id, date, shift_id)` pair → block re-check-in
- **Validate:** Edge Function `checkin`
- **Error:** `"You have already checked in for this shift"`

### ATT-04: Check-out must be after check-in
- **Rule:** `check_out_at > check_in_at`
- **Validate:** Edge Function `checkin`
- **Error:** `"Check-out time is invalid"`

### ATT-05: Late arrival calculation
- **Rule:** `check_in_at > (shift.start_time + grace_period_minutes)` → `status = 'late'`, calculate `late_minutes`
- **Validate:** Edge Function `checkin` (automatic, no error)

### ATT-06: Early leave calculation
- **Rule:** `check_out_at < (shift.end_time - early_leave_minutes)` → record `early_leave_minutes`
- **Validate:** Edge Function `checkin` (automatic)

### ATT-07: Overtime calculation
- **Rule:** `check_out_at > shift.end_time` → calculate `overtime_minutes = check_out_at - shift.end_time`
- **Validate:** Edge Function `checkin` (automatic)

---

## Leave

### LEA-01: Valid date range
- **Rule:** `end_date >= start_date`
- **Validate:** Client + server
- **Error:** `"End date must be after start date"`

### LEA-02: Cannot request past dates
- **Rule:** `start_date >= today`
- **Validate:** Client + server
- **Error:** `"Cannot request leave for past dates"`

### LEA-03: Sufficient advance notice
- **Rule:** `start_date >= today + leave_policies.min_advance_notice_days` (count working days, excluding weekends)
- **Validate:** Server (before insert)
- **Error:** `"Must request leave at least {N} working days in advance"`
- **Default:** min_advance_notice_days = 1

### LEA-04: No overlapping pending/approved requests
- **Rule:** No other `leave_requests` for the same employee with `status IN ('pending', 'approved')` with overlapping `date range`
- **Validate:** Server
- **Error:** `"You already have a leave request for this period"`

### LEA-05: Check remaining leave days
- **Rule:** If `leave_type = 'paid'`, check `leave_balances.total_paid_days - used_paid_days >= total_days`
- **Validate:** Client (warning) + server (confirm)
- **Warning:** `"You only have {N} paid leave days remaining. Excess days will be converted to unpaid leave."`

### LEA-06: Approved leave → sync attendance
- **Rule:** When `status` changes from `pending` → `approved`, auto-create/update `attendance_records` for all days in range with `status = 'leave'` and `leave_request_id`
- **Validate:** Database trigger or Edge Function

### LEA-07: Cancel approved request
- **Rule:** Only admin can reject an approved request. When rejecting, must restore `leave_balances.used_paid_days`
- **Validate:** Server

---

## Shift Change

### SHI-01: Cannot change shift for past dates
- **Rule:** `target_date >= today`
- **Validate:** Client + server
- **Error:** `"Cannot change shift for past dates"`

### SHI-02: Must change to a different shift
- **Rule:** `requested_shift_id != current_shift_id` for that date
- **Validate:** Client
- **Error:** `"This is already your assigned shift"`

### SHI-03: No duplicate pending request
- **Rule:** No other `shift_change_requests` with `status = 'pending'` for the same `employee_id` and `target_date`
- **Validate:** Server
- **Error:** `"You already have a pending shift change request for this date"`

### SHI-04: Update after approval
- **Rule:** When approved → upsert `shift_schedules` with the new `shift_id`. If QR token exists for that date → deactivate old token, generate new token for the new shift
- **Validate:** Server (in approve flow)

---

## Payroll

### PAY-01: Only calculate when attendance data is complete
- **Rule:** Warn if the month has working days without `attendance_records` (employee may have unrecorded absences)
- **Validate:** Edge Function `calculate-payroll` (warning, not blocking)

### PAY-02: Cannot overwrite confirmed payroll
- **Rule:** If `payroll_records.status = 'confirmed'` → block auto-recalculation. Admin must unlock first
- **Validate:** Edge Function
- **Error:** `"This month's payroll has been confirmed. Contact Super Admin to unlock."`

### PAY-03: Net salary must not be negative
- **Rule:** `net_salary = gross - bhxh - tax >= 0`. If negative → report error
- **Validate:** Edge Function
- **Error:** `"Net salary is negative due to large deductions. Please review."`

### PAY-04: Valid OT multipliers
- **Rule:** `ot_multiplier_weekday >= 1.0`, `ot_multiplier_weekend >= ot_multiplier_weekday`, `ot_multiplier_holiday >= ot_multiplier_weekend`
- **Validate:** Client when Admin updates config
- **Error:** `"Invalid OT multiplier (must increase: weekday < weekend < holiday)"`

---

## Employee

### EMP-01: Unique phone number
- **Rule:** `phone` must be unique system-wide (used for login)
- **Validate:** DB constraint + client check before submit
- **Error:** `"This phone number is already registered"`

### EMP-02: Base salary > 0
- **Rule:** `base_salary > 0`
- **Validate:** Client
- **Error:** `"Base salary must be greater than 0"`

### EMP-03: Join date not too far in the future
- **Rule:** `join_date <= today + 30 days` (allow onboard up to 1 month in advance)
- **Validate:** Client (soft warning)

### EMP-04: Bulk import – row validation
- **Rule:** Each row must have `full_name`, `phone` (valid format), `type`, `base_salary > 0`
- **Validate:** Client before calling Edge Function
- **Error:** Display list of error rows with reason, allow editing before import

---

## Shifts

### SHF-01: End time must be after start time (regular shift)
- **Rule:** If `is_overnight = false` then `end_time > start_time`
- **Validate:** Client
- **Error:** `"End time must be after start time"`

### SHF-02: Reasonable grace period
- **Rule:** `grace_period_minutes >= 0` and `< (end_time - start_time) / 2`
- **Validate:** Client
- **Error:** `"Grace period cannot exceed half the shift duration"`

### SHF-03: Cannot delete shift that is assigned
- **Rule:** Cannot delete `shifts` if there are `employee_shift_assignments` or future `shift_schedules`
- **Validate:** Server
- **Error:** `"This shift is assigned to employees. Unassign before deleting."`

---

## Notification Triggers

| Event | Recipient | Type |
|---|---|---|
| Employee submits leave request | Admin + Manager of branch | `leave_request_new` |
| Admin approves leave request | Employee who submitted | `leave_approved` |
| Admin rejects leave request | Employee who submitted | `leave_rejected` |
| Employee submits shift change | Admin + Manager | `shift_change_new` |
| Admin approves shift change | Employee who submitted | `shift_change_approved` |
| Admin rejects shift change | Employee who submitted | `shift_change_rejected` |
| Admin confirms payroll | All employees in branch | `payroll_confirmed` |
| Admin manually records attendance | Employee affected | `attendance_manual` |
