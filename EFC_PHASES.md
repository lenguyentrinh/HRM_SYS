# HRM System — EFC Breakdown

> **Epic → Feature → Child** structure for all 4 development phases.

---

## Epic 1: Foundation — Init & Auth

| # | Feature | Child (Subtasks) |
|---|---------|------------------|
| 1.1 | Project Scaffolding | Initialize Vite + React + TypeScript + Tailwind |
| | | Install shadcn/ui, TanStack Query, Zustand, React Router |
| | | Configure path aliases, ESLint, Prettier |
| | | Setup environment variables (.env) |
| 1.2 | Database Setup | Create Supabase project |
| | | Run SQL migrations (users, employees, branches) |
| | | Configure RLS policies for all tables |
| | | Setup pg_cron extension |
| 1.3 | Custom Auth Flow | Build `users` table with phone + SHA-256 password_hash |
| | | Implement `login(phone, password)` in `src/lib/auth.ts` |
| | | Build `authStore.ts` (Zustand + persist to localStorage) |
| | | Create LoginPage with phone input + form validation |
| | | Implement `createUserWithPhone()` for admin |
| 1.4 | Layouts & Routing | Build Admin Layout (sidebar + topbar) |
| | | Build Employee Layout (bottom nav, mobile-first) |
| | | Configure React Router with all routes |
| | | Implement route guards by role (super_admin / manager / employee) |
| 1.5 | Employee CRUD | Employee list page: search, filter, paginate |
| | | Add/edit employee form |
| | | Bulk import from Excel (.xlsx) |
| | | Export employee list to Excel |
| | | Employee detail page: info, status management |
| 1.6 | Shift CRUD | Shift list page with CRUD operations |
| | | Shift form: name, start/end time, grace period, overnight flag |

---

## Epic 2: Attendance — QR & Check-in

| # | Feature | Child (Subtasks) |
|---|---------|------------------|
| 2.1 | Roster Scheduling | Calendar grid UI for weekly shift assignment |
| | | Assign default shift by month per employee |
| | | Copy roster from previous month |
| | | Override specific days (shift_schedules table) |
| 2.2 | QR Token Generation | Edge Function `generate-qr`: read active shifts, compute expires_at |
| | | UUID token upsert into `qr_tokens` table (UNIQUE shift_id + date) |
| | | pg_cron job scheduled at 06:30 VN daily |
| | | Timezone handling (UTC+7 for Vietnam) |
| 2.3 | Tablet QR Display | TabletQRPage at `/tablet/:branch_id` (no auth) |
| | | Realtime clock + large QR code render (react-qr-code) |
| | | Auto-refresh every 60 seconds |
| | | Countdown timer to QR expiry |
| | | Multi-shift dropdown selector with auto-select logic |
| 2.4 | Mobile QR Scanner | CheckinPage with camera auto-start |
| | | BarcodeDetector API (Chrome Android/Desktop) |
| | | jsQR canvas fallback (iOS Safari, Firefox) |
| | | File input fallback (`capture="environment"`) |
| | | Token extraction from QR URL |
| | | Confirm screen: shift name, token snippet, submit button |
| 2.5 | Check-in Validation | Edge Function `checkin`: validate token exists + not expired |
| | | Verify employee belongs to shift (shift_schedules → employee_shift_assignments) |
| | | Duplicate check-in detection |
| | | Late minutes calculation (now vs start_time + grace_period) |
| | | Upsert attendance_records + insert notifications |
| 2.6 | Attendance Management | Auto status: on time / late / early leave / OT / absent |
| | | Manual attendance entry (Admin, with reason) |
| | | Admin attendance table: filter, paginate, export Excel |
| | | Audit log for every manual edit |
| 2.7 | Shift Change Requests | Employee submits shift change request (1-day or full-week) |
| | | Admin approval/rejection with reason |
| | | Realtime status updates for employee |

---

## Epic 3: Leave, Payroll & Notifications

| # | Feature | Child (Subtasks) |
|---|---------|------------------|
| 3.1 | Leave Management | Leave policy configuration (Admin Settings) |
| | | Employee submits leave request (type, dates, reason) |
| | | Display remaining leave days before submit |
| | | Auto-convert to unpaid when exceeding balance |
| | | Admin approve/reject with reason |
| | | Auto sync attendance + deduct leave_balances on approval |
| | | Export leave request list to Excel |
| 3.2 | Payroll Configuration | OT multipliers: weekday (1.5x), weekend (2x), holiday (3x) |
| | | Allowance, BHXH rate (%) configuration |
| | | Late/absent penalty rates |
| | | Attendance bonus conditions |
| | | Vietnamese holiday calendar import |
| 3.3 | Payroll Calculation | Edge Function `calculate-payroll`: read attendance, config, employees |
| | | Formula: salary_earned = base_salary × (working_days / standard_days) |
| | | OT pay, allowance, bonus, penalty calculations |
| | | Gross → Net (minus BHXH, tax) |
| | | Upsert payroll_records with draft status |
| | | Lock mechanism: draft → confirmed (no recalculation) |
| | | Super_admin unlock capability |
| 3.4 | Salary Preview | Edge Function `salary-preview`: realtime estimated salary |
| | | Salary Preview Card on Employee Dashboard |
| | | Breakdown: base, OT, allowances, deductions |
| 3.5 | Payroll Admin UI | Payroll table: view all employees, filter by month/year |
| | | Detail breakdown per employee with manual override |
| | | Confirm payroll action (draft → confirmed → locked) |
| | | Export full payroll to Excel |
| 3.6 | Realtime Notifications | Supabase Realtime channel subscription per user_id |
| | | Bell icon UI with unread badge count |
| | | Notification list dropdown |
| | | Mark as read on click |
| | | Insert notifications on check-in, leave status, payroll events |
| 3.7 | Dashboard & Analytics | Admin dashboard: 4 stat cards (total, present, late, absent) |
| | | 7-day attendance chart |
| | | Pending requests summary widget |
| | | Employee ranking: work days, late count, % |
| | | Classification: Excellent / Good / Needs improvement |
| | | Monthly payroll fund line chart |
| | | Cost breakdown charts |
| | | Export statistics to Excel |

---

## Epic 4: Refactor, Fix & Polish

| # | Feature | Child (Subtasks) |
|---|---------|------------------|
| 4.1 | Code Architecture | Organize code into feature-based folder structure |
| | | Extract shared components, hooks, utils |
| | | Standardize import patterns and naming conventions |
| | | Remove dead code and duplicated logic |
| 4.2 | Timezone Fixes | Fix `generate-qr` dateStr (use VN UTC+7, not UTC) |
| | | Fix `expires_at` with correct +07:00 timezone |
| | | Fix `checkin` shift.start_time parsing (slice to HH:MM) |
| | | Audit all `new Date()` calls across Edge Functions |
| | | Regenerate QR tokens after timezone fixes |
| 4.3 | QR Token Fixes | Fix token expiry calculation (end_time + timezone aware) |
| | | Fix pg_cron schedule alignment with VN time |
| | | Add token regeneration fallback on expiry edge case |
| 4.4 | SPA Routing | Configure Vercel `rewrites` for SPA (all routes → index.html) |
| | | Test all direct URL access for 404 errors |
| 4.5 | iOS Camera Compatibility | Add jsQR canvas fallback for iOS Safari / Firefox |
| | | Add file input `capture="environment"` fallback |
| | | Remove incorrect `isIOSNonSafari()` detection |
| | | Handle getUserMedia permission denied gracefully |
| | | Test on real iOS devices (Safari + Chrome) |
| 4.6 | Error Message Handling | Fix FunctionsHttpError to extract real message from context |
| | | Map edge function errors to user-friendly messages |
| | | Add Vietnamese language error messages support |
| | | Handle network timeout and offline states |
| 4.7 | E2E Testing | Playwright setup with test configuration |
| | | Phase 1 tests: auth flow, route guards, CRUD employees |
| | | Phase 2 tests: QR display, scanning, check-in validation |
| | | Phase 3 tests: leave request flow, payroll calculation |
| | | Phase 4-9 tests: edge cases, error states, permissions |
| 4.8 | Tablet Multi-Shift | Load all active shifts instead of first match |
| | | Auto-select most recently started shift |
| | | Manual shift selection via custom dropdown |
| | | Fallback to auto-select when selected shift ends |
| | | useRef to prevent stale closures in 60s interval |
| 4.9 | Audit Logging | Create audit_logs table |
| | | Log critical admin operations (create/edit/delete employee, confirm payroll) |
| | | Audit log viewer for super_admin |
| 4.10 | Performance & Polish | Bundle size optimization (code splitting, lazy loading) |
| | | Loading states and skeleton screens |
| | | Empty state components for all lists |
| | | Responsive design audit (mobile + tablet + desktop) |
| | | Accessibility improvements (aria labels, keyboard nav) |
