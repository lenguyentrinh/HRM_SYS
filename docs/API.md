# API.md – Data Access & Edge Functions

## Overview

Since we use the Supabase SDK directly from the client, there is no separate REST API server. All data access consists of 2 types:

| Type | When to use |
|---|---|
| **Supabase SDK directly** | Regular CRUD, queries with natural RLS protection |
| **Edge Functions** | Complex server-side logic: needs to bypass RLS, needs atomic multi-table operations, or needs computation unsafe on client |

**Selection principle:**
- If only reading/writing 1–2 tables with user's own data → use SDK directly
- If needed: complex calculations, multi-table atomic writes, creating auth.users, or sensitive logic → use Edge Function

---

## Edge Functions

### `POST /functions/v1/checkin`

**Purpose:** Validate QR token and record attendance. Runs server-side because it needs to check multiple tables atomically and we don't want the client to calculate status (easily spoofed).

**Called by:** Employee Portal, `/checkin` page, after successful QR scan.

**Request:**
```json
{
  "token": "uuid-string",
  "employee_id": "uuid",
  "type": "check_in"
}
```

**Logic:**
1. Find `qr_tokens` by token → check `is_active = true` and `expires_at > now()`
2. Verify employee is assigned to this shift: prioritize `shift_schedules` by date, fallback to `employee_shift_assignments`
3. Check not already checked in for this shift (`attendance_records` UNIQUE constraint)
4. Get `shifts.start_time`, `grace_period_minutes` → calculate `late_minutes`
5. If check-out: calculate `overtime_minutes = check_out_at - shift.end_time`
6. Insert/Update `attendance_records`
7. Insert `notifications` confirmation for employee

**Success response:**
```json
{
  "success": true,
  "status": "present",
  "late_minutes": 0,
  "message": "Check-in successful at 07:02 – On time ✓"
}
```

**Error response:**
```json
{
  "success": false,
  "error": "invalid_token" | "wrong_shift" | "already_checked_in" | "expired_token",
  "message": "Error description in Vietnamese"
}
```

---

### `POST /functions/v1/generate-qr`

**Purpose:** Generate QR tokens for the day's shifts. Runs server-side because it needs `service_role` to insert into `qr_tokens` (this table has RLS restricting employees from inserting).

**Called by:**
- **pg_cron** automatically at 06:30 daily with `{"run_all": true}`
- **Admin** manually when needing to regenerate (e.g., after approving shift change) with `{"shift_id": "uuid", "date": "YYYY-MM-DD"}`

**Request (pg_cron):**
```json
{ "run_all": true, "date": "2026-05-18" }
```

**Request (manual):**
```json
{ "shift_id": "uuid", "date": "2026-05-18" }
```

**Logic:**
1. If `run_all`: get all `shifts` of all branches for that day
2. For each shift: `token = crypto.randomUUID()`, `expires_at = date + shift.end_time`
3. Upsert into `qr_tokens` (on conflict shift_id + date → update token, reset is_active = true)

---

### `POST /functions/v1/calculate-payroll`

**Purpose:** Calculate monthly salary for one or all employees. Runs server-side because the logic is complex and sensitive — we don't let the client calculate and send results.

**Called by:** Admin Portal, `/admin/payroll` page, when clicking "Calculate monthly payroll".

**Request:**
```json
{
  "month": 5,
  "year": 2026,
  "employee_id": "uuid"   // optional — if omitted, calculate all employees in branch
}
```

**Logic:**
1. Get all `attendance_records` for the employee in the month
2. Count: `working_days_actual`, `total_overtime_minutes`, `total_late_minutes`, `total_absent_days`
3. Get `payroll_configs` with `effective_from <= last day of month` (most recent config)
4. Calculate:
   - `salary_earned = base_salary × (working_days_actual / working_days_standard)`
   - `overtime_pay` by day type (weekday / weekend / holiday) × OT multiplier
   - `late_penalty = total_late_minutes × late_penalty_per_minute`
   - `attendance_bonus` if conditions met in `attendance_bonus_condition`
   - `gross = salary_earned + allowance + overtime_pay + bonus - late_penalty - absent_penalty`
   - `bhxh_employee = gross × bhxh_employee_rate`
   - `net = gross - bhxh_employee` (tax = 0, admin enters later)
5. Upsert `payroll_records` with `status = 'draft'`

**Response:**
```json
{
  "success": true,
  "calculated": 48,
  "errors": []
}
```

---

### `POST /functions/v1/bulk-import`

**Purpose:** Bulk create accounts for employees. Runs server-side because it needs `service_role` to create `auth.users` (Supabase Admin API).

**Called by:** Admin Portal, `/admin/employees` page, after reviewing the Excel file.

**Request:**
```json
{
  "branch_id": "uuid",
  "employees": [
    {
      "full_name": "Nguyen Thi Thu",
      "phone": "0901234567",
      "type": "fulltime",
      "base_salary": 6000000,
      "allowance": 500000,
      "shift_id": "uuid",
      "department": "Sales",
      "position": "Staff",
      "join_date": "2026-01-01"
    }
  ]
}
```

**Logic:**
1. Validate each row (phone format, required fields, phone unique check)
2. For each valid row: create `auth.users` (default password = phone number) → create `users` → create `employees`
3. Assign default shift in `employee_shift_assignments` for current month
4. Initialize `leave_balances` according to `leave_policies` for the employee type
5. Return result: success list + error list per row

**Response:**
```json
{
  "success_count": 45,
  "error_count": 3,
  "errors": [
    { "row": 5, "phone": "0901234567", "reason": "Phone number already exists" }
  ]
}
```

---

### `GET /functions/v1/salary-preview`

**Purpose:** Calculate estimated salary up to today for Employee Portal. No DB storage — calculates in realtime each time the employee visits the dashboard.

**Called by:** Employee Portal, `/` (dashboard), on component mount.

**Request:** Query param `?employee_id=uuid` (taken from auth session, not arbitrarily passed by client).

**Logic:** Similar to `calculate-payroll` but:
- Only count `attendance_records` from start of month to `now()`
- No upsert to DB
- Estimate remaining work days for the month based on assigned shifts

---

## Supabase Data Access Patterns

### Auth (Custom – not using Supabase Auth)

```ts
// Login: hash password with SHA-256, query users table
import { loginWithPhone } from '@/lib/auth'
const user = await loginWithPhone(phone, password)
// → { id, role, branch_id, phone }
// Save to Zustand store (persist localStorage)
useAuthStore.getState().setUser(user)

// Logout
useAuthStore.getState().logout()
// remove localStorage key 'hrm-auth'

// Create new user (Admin creating employee)
import { createUserWithPhone } from '@/lib/auth'
const userId = await createUserWithPhone(phone, password, 'employee', branchId)
```

> **Note:** Do not use `supabase.auth.*` — all auth goes through `src/lib/auth.ts`.
> Session is persisted to `localStorage` key `hrm-auth` via Zustand persist middleware.

---

### Employees

```ts
// Employee list with pagination + search (Admin)
const { data, count } = await supabase
  .from('employees')
  .select('*, users(phone)', { count: 'exact' })
  .eq('branch_id', branchId)
  .ilike('full_name', `%${keyword}%`)    // search
  .eq('status', 'active')               // filter
  .order('full_name')
  .range(page * 10, page * 10 + 9)      // pagination

// View single employee details
const { data } = await supabase
  .from('employees')
  .select(`
    *,
    users(phone, role),
    employee_shift_assignments(shift_id, month, year, shifts(name))
  `)
  .eq('id', employeeId)
  .single()

// Update employee info
await supabase.from('employees')
  .update({ base_salary, allowance, department, position })
  .eq('id', employeeId)
```

---

### Attendance

```ts
// Today's attendance table (Admin) — joined with employees, filtered by branch
const { data } = await supabase
  .from('attendance_records')
  .select(`
    *,
    employees!inner(full_name, employee_code, branch_id),
    shifts(name, start_time, end_time)
  `)
  .eq('date', toISODate(new Date()))
  .eq('employees.branch_id', branchId)
  .order('check_in_at', { nullsFirst: false })

// Personal attendance history (Employee)
const { data } = await supabase
  .from('attendance_records')
  .select('*, shifts(name, start_time, end_time)')
  .eq('employee_id', employeeId)
  .gte('date', startOfMonth)
  .lte('date', endOfMonth)
  .order('date', { ascending: false })

// Manual attendance (Admin) — upsert to handle both add and update
await supabase.from('attendance_records').upsert({
  employee_id, shift_id, date,
  check_in_at: new Date().toISOString(),
  check_in_source: 'manual',
  status: 'present',
  created_by: adminUserId,
  notes: 'Manual attendance entry by admin'
}, { onConflict: 'employee_id,date,shift_id' })
```

---

### Leave Requests

```ts
// Pending requests list (Admin)
const { data } = await supabase
  .from('leave_requests')
  .select(`
    *,
    employees!inner(full_name, employee_code, branch_id),
    leave_balances!inner(total_paid_days, used_paid_days)
  `)
  .eq('status', 'pending')
  .eq('employees.branch_id', branchId)
  .order('created_at')

// Submit leave request (Employee) — after this, Edge Function or DB trigger sends notification
const { data, error } = await supabase.from('leave_requests').insert({
  employee_id, leave_type, start_date, end_date, total_days, reason
})

// Approve request (Admin) — validate first in VALIDATIONS.md LEA-*
await supabase.from('leave_requests').update({
  status: 'approved',
  reviewed_by: adminId,
  reviewed_at: new Date().toISOString()
}).eq('id', requestId)
// Then: sync attendance + update leave_balances + send notification
// (see VALIDATIONS.md LEA-06)
```

---

### Payroll

```ts
// Monthly payroll table (Admin)
const { data } = await supabase
  .from('payroll_records')
  .select('*, employees(full_name, employee_code, type)')
  .eq('month', month)
  .eq('year', year)
  .eq('employees.branch_id', branchId)  // filter by branch via join
  .order('net_salary', { ascending: false })

// Confirm payroll — super_admin only
await supabase.from('payroll_records').update({
  status: 'confirmed',
  confirmed_by: adminId,
  confirmed_at: new Date().toISOString()
}).eq('month', month).eq('year', year)
// Do NOT use .eq('employees.branch_id') because update does not support join filter
// Instead, get employee_ids in the branch first, then .in('employee_id', ids)
```

---

### Notifications (Realtime)

```ts
// Initialize realtime subscription — placed in useNotifications hook
useEffect(() => {
  const channel = supabase
    .channel(`user-notifications-${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      // Invalidate query to refetch list
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      // Show toast
      toast(payload.new.title)
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [userId])

// Notification list (with pagination)
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(20)

// Mark all as read
await supabase.from('notifications')
  .update({ is_read: true })
  .eq('user_id', userId)
  .eq('is_read', false)
```

---

## pg_cron Jobs

```sql
-- Runs at 06:30 daily — 30 minutes before earliest shift (07:00)
-- Replace <project-ref> and <service_role_key> with actual values during setup
SELECT cron.schedule(
  'generate-qr-tokens-daily',
  '30 6 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/generate-qr',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <service_role_key>',
      'Content-Type', 'application/json'
    ),
    body    := jsonb_build_object('run_all', true)
  );
  $$
);

-- View running jobs
SELECT * FROM cron.job;

-- Remove job if needed
SELECT cron.unschedule('generate-qr-tokens-daily');
```
