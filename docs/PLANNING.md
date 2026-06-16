# PLANNING.md – Specification & Implementation Plan for HRM System

## Project Background

**HRM System** is an internal HR management web app for a business of approximately 50 employees.
The app includes 2 separate portals: **Admin Portal** and **Employee Portal**.

| | |
|---|---|
| **App type** | Internal company web app (no SEO/SSR needed) |
| **Scale** | ~50 employees, 1 branch initially (multi-branch later) |
| **Stack** | React 18 + Vite + TypeScript + Supabase |
| **Deploy** | Nginx self-host or Cloudflare Pages |
| **Timeline** | ~5–6 weeks (AI-assisted development) |

---

## Modules & Users

### Roles

| Role | Description |
|---|---|
| `super_admin` | Full system access: configuration, HR, salary, reports |
| `manager` | Operations management: view/edit employees, approve leave, view salary. Cannot configure system |
| `employee` | Employee: QR attendance, view personal salary, submit leave/shift change requests |

### Login
- All roles log in using **phone number + password**
- After login, auto-redirect by role: admin/manager → Admin Portal, employee → Employee Portal
- Session managed by **custom auth**: `users` table + SHA-256 password hash, not using Supabase Auth
- Session persisted to `localStorage` via Zustand, route guard reads synchronously on app load

---

## Employee Types

| Type | Characteristics |
|---|---|
| `fulltime` | Fixed monthly salary calculated by work days. Annual leave carries over to next year |
| `parttime` | Salary calculated by shift/hour. Monthly leave, no carry-over |

---

## I. Admin Portal

### 1. Dashboard

**Purpose:** An overview of HR status and today's operations.

**Displayed content:**
- **4 stat cards:** Total employees, Present today, Late today, Absent/On leave today
- **7-day attendance chart:** Bar chart showing number of employees present each day
- **Action items list:** Pending leave requests, pending shift change requests, employees not yet checked out
- **Recent attendance records:** 5–10 latest records of the day (name, check-in time, shift, status)

**Interactions:**
- Click "View all" in each section → navigate to the corresponding module
- Data refreshes in real-time (Supabase Realtime)

---

### 2. Employee Management

#### 2a. Employee List
**Purpose:** View, search, and filter all employees in the system.

**Table columns:** Avatar (initials), Employee code, Full name, Phone, Default shift, Employee type (fulltime/parttime), Status (active/inactive/probation).

**Features:**
- Search by name or phone (real-time search)
- Filter by: department, employee type, status
- Pagination (10 users/page)
- **Single add:** Popup form to add a new employee (full name, phone, employee type, base salary, default shift, join date)
- **Bulk Import from Excel:** Upload `.xlsx` file, system parses and validates each row, displays preview with errors, confirms import
- **Export Excel:** Export the current filtered list to an Excel file

#### 2b. Employee Details
**Purpose:** View and edit all information of an employee.

**Layout:** Header section shows avatar, name, employee code, shift, and status. Below are tabs:

- **Tab "Info":** Personal info (name, phone, email, employee type, department, position, join date) + Salary config (base salary, fixed monthly allowance, applicable OT multiplier) + Leave settings (leave days per year, carry-over or not)
- **Tab "Attendance":** Attendance history for this employee, filter by month, displayed as a table
- **Tab "Leave":** List of submitted leave requests, remaining leave days by year
- **Tab "Salary":** Salary table for confirmed months
- **Tab "Bonus/Penalty":** History of special bonuses/penalties (outside automatic calculation)

Admin can edit all information in the "Info" tab.

---

### 3. Shifts Configuration

**Purpose:** Define the company's work shifts.

**Shift information:**
- Shift name (e.g., "Shift 1 – Morning")
- Start time / End time
- **Grace period (minutes):** Number of minutes late allowed without penalty. E.g., Shift starts at 07:00, grace period 30 min → arriving before 07:30 is still "on time"
- **Early leave threshold (minutes):** How many minutes early checkout is considered early leave
- Whether shift is overnight (is_overnight)

**Assign shifts to employees:**
- Each employee is assigned a default shift per month
- Assignment in Employee Details page or via Roster scheduling

---

### 4. Roster Scheduling

**Purpose:** Admin views and adjusts each employee's work schedule by day/week, different from the monthly default shift.

**Interface:** Weekly calendar grid. Each cell = 1 employee × 1 day, showing the assigned shift. Admin clicks a cell to change the shift or mark as off.

**Flow:** Override schedules are saved to `shift_schedules`. When the system needs to know an employee's shift for a specific day, it prioritizes `shift_schedules` first, falling back to `employee_shift_assignments` (default monthly shift).

---

### 5. Attendance Management

**Purpose:** Monitor all attendance data, detect anomalies, edit when needed.

**Daily attendance table:**
- Defaults to showing today
- Each row: Avatar + Employee name, Shift, Check-in time, Check-out time, Total hours worked, Status (On time / Late Xmin / Early leave / Absent / On leave / Holiday), Notes

**Auto-calculated statuses:**
- **On time:** Check-in within grace period
- **Late:** Check-in after grace period → shows late minutes, auto-calculates penalty per config
- **Early leave:** Check-out before early leave threshold
- **OT:** Check-out after shift end → auto-calculates OT hours
- **Absent:** No check-in record after shift has passed
- **On leave:** Synced from approved leave requests
- **Holiday:** Marked by admin, different OT multiplier applies

**Filters:** Date/Month, Shift, Status, Employee name.

**Manual attendance (Admin/Manager):**
- Admin can add/edit attendance records for any employee
- Reason is required when entering manually
- This action is logged in `audit_logs`

**Export:** Export filtered data to Excel.

---

### 6. Leave Management

**Purpose:** Receive and process leave requests from employees.

**Flow:**
1. Employee submits request through Employee Portal
2. Admin/Manager receives realtime notification (bell notification)
3. Admin views the request list, clicks to see details (dates, reason, employee's remaining leave days)
4. Press **Approve** or **Reject** (with reason)
5. System automatically:
   - If approved: creates/updates `attendance_records` for the leave days with status = 'leave', deducts `leave_balances`
   - Sends realtime notification to the employee

**Display:** Defaults to filter "Pending" requests (highlighted). Can view all requests by month with status filter.

**Export:** Export leave request list to Excel.

---

### 7. Shift Change Requests

**Purpose:** Process shift change requests from employees.

**Request info:** Employee, Target date(s), Current shift, Requested shift, Reason.

**On approval:** System updates `shift_schedules` for that date/period. If there's an old QR token → deactivate it, generate a new token for the new shift.

---

### 8. Settings

**Access:** Super Admin only.

**Tab "Shifts":** CRUD for work shifts (described in section 3).

**Tab "Bonus/Penalty":**
- Late penalty rate: amount per minute late (can be 0)
- Absent without leave penalty: amount per day
- Attendance bonus conditions: e.g., "100% shift attendance, no late arrivals in the month → bonus X VND"

**Tab "Allowances":**
- Allowance is a fixed amount added each month for employees
- Can configure default allowance amount, but individual employees can have their own set in their profile

**Tab "Leave Policy":**
- Configure paid leave days by employee type (fulltime / parttime)
- Fulltime: carry-over enabled, configure maximum carry-over days
- Parttime: no carry-over, fixed leave days per month
- Required advance notice days

**Tab "Holidays":**
- List of annual holidays (can import Vietnamese calendar)
- These days: OT multiplier = 3.0, `attendance_records.is_holiday = true`

**Tab "OT Multipliers":**
- Weekday OT multiplier (default 1.5)
- Weekend OT multiplier (default 2.0)
- Holiday OT multiplier (default 3.0)
- Employee BHXH contribution rate (default 8%)

---

### 9. Payroll

**Purpose:** Aggregate and confirm monthly salary for all employees.

**Payroll calculation process:**
1. Admin selects month/year, clicks "Calculate monthly payroll"
2. System calls Edge Function `calculate-payroll` for each employee
3. Formula:
   - `salary_earned = base_salary × (working_days_actual / working_days_standard)`
   - `overtime_pay = (base_salary / working_days_standard / shift_hours) × overtime_hours × ot_multiplier`
   - `gross = salary_earned + allowance + overtime_pay + attendance_bonus - late_penalty - absent_penalty`
   - `net = gross - bhxh_employee - tax` (tax entered manually by admin)
4. Results saved to `payroll_records` with status = `draft`

**Payroll table interface:**
- Each row: Employee name, Work days (actual/standard), Base salary, OT, Allowance, Bonus, Penalty, Gross, BHXH, Tax, Net pay
- Admin can click each row to view details and manually adjust individual items
- Summary row at the bottom: Total payroll fund

**Confirm payroll:** Admin clicks "Confirm & Disburse" → status changes to `confirmed`, can no longer be auto-recalculated (must be manually unlocked).

**Export:** Export payroll Excel with full breakdown.

---

### 10. Dashboard Analytics & Reports

**Employee performance statistics:**
- Ranking table: work days, late count, attendance rate (%)
- Classification: Excellent / Good / Needs improvement
- Filter by month, department

**Payroll fund statistics:**
- Total monthly salary disbursed (line chart)
- Breakdown by item type (base salary, OT, allowance, bonus)
- Current month projected salary cost based on actual data up to today

**Export:** Export statistical reports to Excel.

---

## II. Employee Portal

### 1. Personal Dashboard

**Purpose:** Employee's home page, providing the most important information for the day.

**Content:**
- Greeting + employee name
- **Today's status:** Work shift (shift name, start-end time), check-in time / not yet checked in
- **Salary Preview Card:** Estimated salary for this month (calculated up to today). Same formula as Admin but only up to the current date. Displays: estimated total, work days so far, late count
- **Quick actions:** QR Check-in, Request leave, Request shift change, View history

---

### 2. QR Check-in

**QR Mechanism:**
- Each work shift has its own QR token, auto-generated 30 minutes before shift start via pg_cron
- QR displayed on a tablet at the office (dedicated tablet page, auto-refresh)
- Employees scan QR using phone camera
- Can access via link (URL containing token) if scanned with native camera

**Check-in flow:**
1. Employee opens Check-in page, camera auto-starts
2. Scan QR code on tablet
3. System validates: token valid? Is the employee assigned to this shift?
4. Records check-in with precise timestamp
5. Auto-calculates status (on time / late)
6. Displays confirmation message: "Check-in successful at 07:02 – On time ✓"

**Check-out:** Similar to check-in, uses the shift's QR. System auto-calculates OT if leaving late.

**Important validations:**
- Employee can only scan QR of their assigned shift → error if wrong shift
- Expired token → error
- Cannot check-in twice for the same shift

---

### 3. Personal Attendance History

Table displaying all attendance records for the employee. Filter by month. Columns: Date, Shift, Check-in time, Check-out time, Status, Notes (if admin entered manually).

---

### 4. Request Leave

**Request form:**
- Leave type: paid / unpaid / sick / other
- Start date, End date (date picker)
- Reason (text area)
- System auto-calculates and displays number of leave days
- Displays remaining leave days before submission
- If exceeds paid leave days → warning "X days exceeding will be converted to unpaid"

**Validation:** Must request at least N working days in advance (per config). Cannot request past dates. Cannot duplicate pending/approved requests.

**After submission:** Displays "Pending" status. When admin processes it → receives realtime notification.

**Request history:** List of all submitted requests, each request's status (pending / approved / rejected with reason).

---

### 5. Request Shift Change

**Request form:**
- Type: Change 1 day / Change full week
- Specific date or week (select from date picker)
- Requested shift (dropdown of available shifts)
- Reason

**After submission:** Similar to leave request – waits for admin approval, receives notification of result.

---

### 6. View Salary Details

**Current month estimated salary:** Realtime, calculated up to today (see Dashboard).

**Confirmed months salary:**
- List of months with payroll_record status = confirmed
- Click on a month → view detailed breakdown: work days, base salary, OT, allowance, bonus, penalty, BHXH, tax, net pay

---

## III. System Features

### QR Code System

**Auto QR generation (pg_cron):**
- Job runs daily at 06:30 (or 30 minutes before the earliest shift)
- Calls Edge Function `generate-qr` for all shifts of the day
- Each shift = 1 UUID token, expires at shift end

**Office tablet page:**
- Dedicated URL for tablet, no login required
- Displays large QR code for current shift (or upcoming shift)
- Auto-switches QR when shift changes
- Shows shift name, time, countdown to remaining time

**QR Security:**
- Token is UUID v4 (unguessable)
- Expires after shift end
- No sensitive info embedded in token

---

### Realtime Notifications

**Technology:** Supabase Realtime (WebSocket), subscribe by `user_id`.

**Notification events:**

| Event | Recipients |
|---|---|
| Employee submits leave request | Admin + Manager |
| Admin approves leave request | Requesting employee |
| Admin rejects leave request + reason | Requesting employee |
| Employee submits shift change request | Admin + Manager |
| Admin approves shift change | Requesting employee |
| Admin rejects shift change + reason | Requesting employee |
| Admin confirms monthly payroll | All employees in branch |
| Admin manually enters attendance for employee | Employee concerned |

**Notification UI:**
- Bell icon on topbar, shows unread count
- Click bell → dropdown list of recent notifications
- Click notification → navigate to related page
- Mark as read on click or "Mark all as read"

---

## IV. Implementation Plan

### Phase 1 – Foundation (~1 week)

**Goal:** System running, login working, basic employee management.

- [ ] Initialize project: Vite + React + TypeScript + Tailwind + shadcn/ui
- [ ] Configure Supabase project, enable Auth (phone + password)
- [ ] Run migrations to create full schema (see DATABASE.md)
- [ ] Configure RLS policies for all tables
- [ ] Admin Portal layout (sidebar, topbar, route guards by role)
- [ ] Employee Portal layout (mobile-first, bottom navigation)
- [ ] Auth flow: login, logout, redirect by role
- [ ] Employee module: list (search, filter, pagination), single add, edit, view details
- [ ] Bulk import from Excel (parse + validate + preview + insert)
- [ ] Export list to Excel
- [ ] Shifts module: CRUD shifts, assign default shift to employees by month

### Phase 2 – Attendance (~2 weeks)

**Goal:** QR check-in fully operational, roster scheduling, admin attendance table.

- [ ] Roster scheduling: weekly calendar grid interface
- [ ] QR: Edge Function to generate tokens, pg_cron auto-job, tablet QR display page
- [ ] QR: Employee scans QR (camera API), Edge Function validates + records attendance
- [ ] Auto-calculation: on time, late, early leave, OT, absent
- [ ] Manual attendance entry (Admin)
- [ ] Admin attendance table: filter, pagination, export Excel
- [ ] Employee: personal attendance history by month
- [ ] Shift change requests: employee submits, admin approves/rejects, updates shift_schedules

### Phase 3 – Leave, Payroll, Notifications (~2 weeks)

**Goal:** Complete app with all features, ready for production.

- [ ] Leave policy config (Admin Settings)
- [ ] Employee submits leave request, admin approves/rejects
- [ ] Auto sync attendance + deduct leave_balances on approval
- [ ] Payroll config (Admin Settings: OT, allowances, bonus/penalty, BHXH)
- [ ] Edge Function for payroll calculation, admin payroll table
- [ ] Admin manual adjustment + confirm payroll
- [ ] Export payroll Excel
- [ ] Employee: realtime salary preview + view confirmed month details
- [ ] Realtime notifications (Supabase channel, bell UI, mark as read)
- [ ] Admin Dashboard: stat cards, attendance chart, action items list
- [ ] Analytics: employee ranking, payroll fund statistics
- [ ] Holiday config + integration into payroll
- [ ] Audit log for important admin actions

---

## V. Architectural Decisions

| Decision | Reason |
|---|---|
| React + Vite instead of Next.js | Internal app, no SSR/SEO needed, lighter and faster build |
| Supabase SDK called directly from client | No separate API server needed, RLS protects data |
| Edge Functions for payroll & QR validation | Complex logic needs server-side execution, cannot be on client |
| pg_cron for QR auto-gen | Native Supabase, no external scheduler needed |
| Zustand + TanStack Query | Zustand for UI state, TanStack Query for server state + caching + invalidation |
| `branch_id` on all tables | Multi-branch ready from the start, avoids major refactoring later |
| Monthly salary = draft → confirmed | Allows admin review before locking, prevents errors |
| Allowance is fixed amount/month | Simplifies calculation, admin can configure per employee |
| Personal income tax entered manually | PIT is complex (progressive tax brackets, family deductions) – let admin calculate and enter manually |
