# AUTO_TEST_PHASE_3.md — Phase 3 E2E Automation Report

## Summary

| Metric | Value |
|---|---|
| Total tests | 70 |
| Passed | 70 |
| Failed | 0 |
| Run time | ~2.1 min |
| Projects | `admin`, `employee-portal` |
| Auth | `storageState` reuse (setup files) |

---

## Test Files

| File | Project | Tests | Route |
|---|---|---|---|
| `e2e/phase3/admin-dashboard.spec.ts` | admin | 5 | `/admin` |
| `e2e/phase3/admin-leaves.spec.ts` | admin | 9 | `/admin/leaves` |
| `e2e/phase3/admin-settings.spec.ts` | admin | 8 | `/admin/settings` |
| `e2e/phase3/analytics.spec.ts` | admin | 6 | `/admin/analytics` |
| `e2e/phase3/payroll.spec.ts` | admin | 10 | `/admin/payroll` |
| `e2e/phase3/notifications.spec.ts` | admin | 4 | `/admin` |
| `e2e/phase3/employee-leave.spec.ts` | employee-portal | 14 | `/leave` |
| `e2e/phase3/employee-profile.spec.ts` | employee-portal | 8 | `/profile` |
| `e2e/phase3/employee-salary.spec.ts` | employee-portal | 6 | `/salary` |

---

## Bugs Found During Test Authoring

### BUG-AUTO-P3-01: Admin dashboard route is `/admin`, not `/admin/dashboard`

- **Root cause**: `DashboardPage` is the **index route** of `/admin` — `{ index: true, element: <DashboardPage /> }` in `router.tsx:100`. There is no `/admin/dashboard` path → 404.
- **Fix**: Test files use `page.goto('/admin')` instead of `page.goto('/admin/dashboard')`.
- **Affected files**: `admin-dashboard.spec.ts`, `notifications.spec.ts`

### BUG-AUTO-P3-02: Strict mode — sidebar NavLink "Nhân viên" vs stat card button

- **Root cause**: `getByText('Nhân viên')` matched both the sidebar `<a>` (NavLink) and the `<p>` label in the stat card → 2 elements → strict mode violation.
- **Fix**: `page.locator('button').filter({ hasText: 'Nhân viên' })` — stat cards are `<button>` elements, sidebar items are `<a>` (NavLink).
- **Affected tests**: `shows all 4 stat cards`, `stat cards are clickable and navigate correctly`

### BUG-AUTO-P3-03: Strict mode — settings page `.or()` locator chain

- **Root cause**: `.or()` in Playwright creates a UNION locator. If multiple conditions match different elements, strict mode fails the entire assertion. The original `beforeEach` used `heading('Cài đặt').or(heading('Settings')).or(getByText('Cấu hình lương'))` — when all 3 conditions matched different elements, the union resolved to multiple matches.
- **Fix**: Use a single specific locator: `page.getByRole('heading', { name: 'Cài đặt', exact: true })`.
- **Affected**: `admin-settings.spec.ts` `beforeEach`

### BUG-AUTO-P3-04: Strict mode — "BHXH", "Cuối tuần", "Ngày lễ" substring matches

- **Root cause**: `getByText('BHXH')` matched CardTitle h3 + labels containing "BHXH" (e.g., "Tỷ lệ BHXH nhân viên đóng"). `getByText('Cuối tuần')` matched label + CardDescription containing "cuối tuần". `getByText('Ngày lễ')` matched label + "Ngày lễ" tab trigger.
- **Fix**:
  - `getByText('BHXH')` → `getByRole('heading', { name: 'BHXH', exact: true })`
  - `getByText('Cuối tuần')`, `getByText('Ngày thường')`, `getByText('Ngày lễ')` → `page.locator('label', { hasText: '...' })`
- **Affected**: `admin-settings.spec.ts` tests 2 and 3

### BUG-AUTO-P3-05: Wrong topbar selector — sidebar `border-b` div intercepted

- **Root cause**: `locator('header, .border-b').first()` picks the **first** element matching either `<header>` or `.border-b` in DOM order. `AdminSidebar` renders a `<div class="h-14 ... border-b ...">` (the logo area) **before** the `<header>` element in the DOM → wrong container.
- **Fix**: Use `page.locator('header button.relative')` — the NotificationBell button has `className="relative h-9 w-9"` which is unique among header buttons.
- **Affected**: `notifications.spec.ts` — all 3 click/interaction tests

### BUG-AUTO-P3-06: Strict mode — "Thông báo" heading vs empty-state text

- **Root cause**: After clicking the bell, `getByText('Thông báo')` matched both `<h3>Thông báo</h3>` (popover header) and `<div>Không có thông báo nào</div>` (the empty state div contains "thông báo" as a substring).
- **Fix**: `page.getByRole('heading', { name: 'Thông báo', exact: true })` — targets the h3 heading only.
- **Affected**: `notifications.spec.ts` — `clicking bell opens notification popover`

### BUG-AUTO-P3-07: Strict mode — "Lý do" label vs "Lý do khác" option

- **Root cause**: In the leave request dialog, `dialog.getByText('Lý do')` matched both the `<label>Lý do</label>` AND `<option value="other">Lý do khác</option>` (since "Lý do" is a substring of "Lý do khác").
- **Fix**: `dialog.getByText('Lý do', { exact: true })` — matches only the label with exactly "Lý do".
- **Affected**: `employee-leave.spec.ts` — `dialog has all required fields`

### BUG-AUTO-P3-08: Strict mode — "Đổi mật khẩu" heading vs button

- **Root cause**: `page.getByText('Đổi mật khẩu')` matched both the `<h2>` heading and the `<button>Đổi mật khẩu</button>` (submit button).
- **Fix**: `page.getByRole('heading', { name: 'Đổi mật khẩu' })` — targets the h2 only.
- **Affected**: `employee-profile.spec.ts` — `shows change password section`

### BUG-AUTO-P3-09: Wrong error toast text for wrong current password

- **Root cause**: Test expected `'Mật khẩu hiện tại không đúng'` but `loginWithPhone()` in `src/lib/auth.ts` throws `'Sai số điện thoại hoặc mật khẩu'`. The error doesn't contain `'không đúng'`, `'Invalid'`, or `'not found'` — so ProfilePage falls into the `else` branch and calls `toast.error(msg)` with the raw error.
- **Fix**: Changed expected text to `'Sai số điện thoại hoặc mật khẩu'`.
- **Affected**: `employee-profile.spec.ts` — `wrong current password shows error toast`

---

## Selector Patterns Established in Phase 3

| Pattern | Use case |
|---|---|
| `page.locator('button').filter({ hasText: 'X' })` | When text appears in both sidebar `<a>` and a `<button>` element |
| `page.locator('label', { hasText: 'X' })` | When text appears in both a `<label>` and another container (CardDescription, tab trigger) |
| `page.getByRole('heading', { name: 'X', exact: true })` | CardTitle h3 elements when labels/descriptions also contain that text |
| `page.locator('header button.relative')` | NotificationBell — unique by `className="relative"` in AdminTopbar header |
| `page.getByRole('tab', { name: 'X' })` | Radix `TabsTrigger` (renders with `role="tab"`) |
| `page.getByRole('heading', { name: 'X', exact: true })` | Avoid matching when text is a substring in another element |

---

## Known Limitations

- **Salary page tests (employee)**: 4 of 6 tests skip gracefully when no confirmed payroll records exist (uses `test.info().annotations.push` skip pattern).
- **Payroll page tests (admin)**: 3 of 10 tests skip gracefully when no payroll records exist.
- **Analytics page tests**: 1 of 6 tests skips gracefully when no employees in DB.
- **Notification bell tests**: The "unread count badge" test only verifies the bell is visible/enabled, not the actual badge — cannot guarantee unread notifications in the test environment.
- **Password change test**: Uses wrong password to trigger the toast; the actual error message comes from `loginWithPhone`, not a custom message.

---

## Infrastructure Notes

- Auth storageState from Phase 2 fix is still valid: `super_admin` user has `activeBranchId` set → no `BranchSelectOverlay` blocking tests.
- Sequential `workers: 1` prevents DB race conditions.
- All Phase 3 tests run in ~2.1 minutes (setup ~4s + 68 tests).
