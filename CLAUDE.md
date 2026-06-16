# HRM System – Claude Code Context

Internal HR management web app for ~50 employees: QR attendance tracking, payroll calculation, leave management.
Company internal app — **no SEO, no SSR needed**. All users have accounts.

---

## System Overview

**2 separate portals**, different layouts and route guards:

| Portal | Route prefix | Users | Purpose |
|---|---|---|---|
| Admin Portal | `/admin/*` | `super_admin`, `manager` | Full system operations management |
| Employee Portal | `/` | `employee` | Check-in, view salary, submit requests |

**After login**, system reads `users.role` from Supabase and redirects:
- `super_admin` / `manager` → `/admin/dashboard`
- `employee` → `/` (personal dashboard)

---

## Commands

```bash
npm run dev        # Dev server at http://localhost:5173
npm run build      # Build production (output: dist/)
npm run preview    # Preview production build
npm run typecheck  # TypeScript check (no emit)
npm run lint       # ESLint check
```

---

## Directory Structure

```
src/
  components/
    ui/                   # shadcn/ui components (do not modify directly)
    admin/                # Layout, Sidebar, shared components Admin portal
    employee/             # Layout, BottomNav, shared components Employee portal
    shared/               # Components used in both portals (NotificationBell, Avatar...)
  pages/
    admin/
      DashboardPage.tsx
      EmployeesPage.tsx
      EmployeeDetailPage.tsx
      AttendancePage.tsx
      LeavePage.tsx
      PayrollPage.tsx
      SettingsPage.tsx    # super_admin only
      AnalyticsPage.tsx
    employee/
      HomePage.tsx        # Dashboard + salary preview
      CheckinPage.tsx     # QR scanner
      AttendanceHistoryPage.tsx
      LeavePage.tsx       # Leave list + create form
      SalaryPage.tsx      # Salary details
      ProfilePage.tsx
    auth/
      LoginPage.tsx
  hooks/
    useAuth.ts            # Current user + role
    useAttendance.ts
    useLeave.ts
    usePayroll.ts
    useNotifications.ts   # Realtime subscription
  lib/
    supabase.ts           # Supabase client singleton
    utils.ts              # formatCurrency, formatDate, calcWorkingDays...
    payroll.ts            # Payroll formula (used for client preview)
  stores/
    authStore.ts          # Zustand: user, role, branch_id
    uiStore.ts            # Zustand: sidebar open, notification count
  types/
    supabase.ts           # Auto-generated from Supabase CLI
    index.ts              # Custom types: EmployeeWithUser, AttendanceWithShift...
supabase/
  functions/
    checkin/              # Validate QR + record attendance
    generate-qr/          # Generate QR token (called by pg_cron)
    calculate-payroll/    # Calculate monthly payroll
    bulk-import/          # Import employees from Excel
    salary-preview/       # Real-time salary estimate
  migrations/             # SQL migration files (name: YYYYMMDDHHMMSS_desc.sql)
docs/                     # Project documentation — read before coding
  PLANNING.md             # Full feature spec + task checklist
  DATABASE.md             # Schema, ERD, data flows
  API.md                  # Edge Functions + query patterns
  VALIDATIONS.md          # Business rules
  DESIGN.md               # Design system, components, UX patterns
  handoff/                # Handoff files at end of each phase
rules/                    # Coding rules — read before writing code
skills/                   # Reusable skill templates
```

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 18 + Vite | Internal app, no SSR needed. Vite faster than Next.js |
| Language | TypeScript strict | Full type safety, especially Supabase types |
| Styling | Tailwind CSS + shadcn/ui | Utility-first, pre-built component library |
| Server state | TanStack Query | Cache, refetch, optimistic updates |
| UI state | Zustand | Lighter than Redux, sufficient for this app |
| Database | Supabase PostgreSQL | Built-in Realtime, Auth, Edge Functions |
| Auth | Custom (SHA-256 + Zustand persist) | Not using Supabase Auth — self-managed users table |
| Realtime | Supabase Realtime | Notifications without separate WebSocket server |
| Edge Logic | Supabase Edge Functions (Deno) | Server-side logic: payroll, QR validation |
| Cron | Supabase pg_cron | Auto-generate QR token 30 min before each shift |
| Deploy | Nginx / Cloudflare Pages | Static files, no Node server needed |

---

## Important Architecture — Read Before Coding

### Multi-branch
Every table has `branch_id`. Currently 1 branch but designed for expansion. Do not hardcode branch logic.

### Employee Shift Lookup
When determining which shift employee X works on date Y:
1. Check `shift_schedules` (date-specific override) — higher priority
2. If none → fallback to `employee_shift_assignments` (default monthly shift)

### QR Token Flow
- `pg_cron` → calls Edge Function `generate-qr` at 06:30 daily
- Each shift has 1 unique token per day (`UNIQUE shift_id + date`)
- Token expires at shift end time
- Office tablet displays current shift QR, auto-refreshes

### Salary Preview vs Payroll Record
- **Salary preview** (Employee Portal): real-time calculation, no DB storage, computed up to today
- **Payroll record** (Admin Portal): end-of-month calculation, stored in DB with status `draft` → `confirmed`
- When `confirmed`: locked, cannot recalculate unless super_admin unlocks

### Auth Flow (Custom)
- Do not use `supabase.auth.*` — all auth goes through `src/lib/auth.ts`
- Login: query `users` table by phone + SHA-256(password)
- Session: store `{ id, role, branch_id, phone }` in Zustand store, persist to `localStorage` key `hrm-auth`
- Route guard reads from store — no async call needed on app startup
- Create new user: `createUserWithPhone()` in `src/lib/auth.ts` (admin uses when adding employees)

### Notifications
- Insert into `notifications` table → Supabase Realtime trigger → client receives instantly
- No polling, no separate WebSocket server
- Each user subscribes to their own channel by `user_id`

---

## Route Map

```
/login                          # Login (redirect if already logged in)

# Admin Portal (requires role: super_admin or manager)
/admin/dashboard                # Today's overview
/admin/employees                # Employee list
/admin/employees/:id            # Employee details
/admin/attendance               # Attendance table
/admin/leaves                   # Leave management
/admin/shift-changes            # Shift change requests
/admin/payroll                  # Payroll table
/admin/analytics                # Statistics & reports
/admin/settings                 # Settings (super_admin only)

# Employee Portal (requires role: employee)
/                               # Personal dashboard + salary preview
/checkin                        # QR check-in scanner
/attendance                     # Personal attendance history
/leaves                         # Leave requests
/salary                         # View salary
/profile                        # Personal info

# Public (no login required)
/tablet/:branch_id              # QR display page for office tablet
```

---

## Key Docs

| File | When to Read |
|---|---|
| [docs/PLANNING.md](docs/PLANNING.md) | Understand features to build — read first |
| [docs/DATABASE.md](docs/DATABASE.md) | Before writing queries or migrations |
| [docs/API.md](docs/API.md) | Before calling Edge Functions or Supabase |
| [docs/VALIDATIONS.md](docs/VALIDATIONS.md) | Before writing form submit or Edge Function |
| [docs/DESIGN.md](docs/DESIGN.md) | Before writing UI components |

---

## Rules — Required Reading Before Coding

| File | Content |
|---|---|
| [rules/code-style.md](rules/code-style.md) | TypeScript, naming, imports, formatting |
| [rules/security.md](rules/security.md) | RLS, keys, auth, input validation |
| [rules/supabase-patterns.md](rules/supabase-patterns.md) | Query patterns, realtime, migration |

---

## Handoff Rules — Required at Phase Completion

**When a phase is completed, create a handoff file before moving to the next phase.**

Handoff files are for QC testing and handover — must be detailed enough for someone not involved in development to read and understand.

### File Location
```
docs/handoff/PHASE_1_HANDOFF.md
docs/handoff/PHASE_2_HANDOFF.md
docs/handoff/PHASE_3_HANDOFF.md
docs/handoff/PHASE_4_HANDOFF.md
```

### Additional Testing File (TESTING_PHASE_X.md)
If bugs are found during handoff QC testing, create a separate file:
```
docs/handoff/TESTING_PHASE_3.md   ← bugs found during Phase 3 QC
docs/handoff/TESTING_PHASE_4.md   ← same for Phase 4
```
This file records: bug description, root cause, fix, files changed — **do not** merge into the main HANDOFF file to keep it clean.

### Fix Log File (FIX_BUGS_PHASE_X.md) — Required After Fixing Bugs from TESTING File
After fixing all bugs logged in `TESTING_PHASE_X.md`, **must** create a file:
```
docs/handoff/FIX_BUGS_PHASE_3_4.md   ← example already created
docs/handoff/FIX_BUGS_PHASE_5.md     ← create after fixing bugs from TESTING_PHASE_5.md
```
This file records each fixed bug: description, root cause, files changed, verification steps — so QC can retest.  
**Rule:** Every time bugs are fixed from a TESTING file → must create a corresponding FIX_BUGS file before reporting completion.

### Required Handoff File Structure

```markdown
# Phase X Handoff – [Phase Name]

## Overview
- Original phase objective
- Actual results achieved (% complete, deviations if any)
- Completion date

## Completed Features
### [Feature Name]
- How it works (end-to-end flow)
- Edge cases handled
- Key files/components involved
- Manual testing steps

(repeat for each feature)

## Incomplete or Skipped Features
- Feature name: reason not done, impact on next phase

## Known Issues & Technical Debt
- [BUG/DEBT-XX] Issue description, why not fixed, impact level

## QC Test Checklist
- [ ] Test case 1: test steps + expected result
- [ ] Test case 2: ...
(minimum 1 test case per completed feature)

## Notes for Next Phase
- Dependencies the next phase must know about
- Technical decisions the next phase must respect
- Outstanding issues to fix at the start of next phase
```

### Example Issue Names in Known Issues
- `[BUG-01]` — logic bug needing fix
- `[DEBT-01]` — acceptable technical debt but needs cleanup
- `[LIMIT-01]` — intentional limitation (not a bug, but QC needs to know)
