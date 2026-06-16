# Automation Test Report — Phase 2

**Date:** 2026-05-21
**Runner:** Playwright v1.60.0 — Chromium, live Supabase
**Test files:** `e2e/phase2/` (5 files)
**Result: 44/44 PASSED ✓**

---

## Test Files & Coverage

| File | Describe Block | Tests | Result |
|---|---|---|---|
| `employee-attendance.spec.ts` | Employee Attendance History | 5 | ✓ All pass |
| `employee-dashboard.spec.ts` | Employee Dashboard | 7 | ✓ All pass |
| `employee-shift-change.spec.ts` | Employee Shift Change Request Page | 4 | ✓ All pass |
| `employee-shift-change.spec.ts` | Send Shift Change Request Dialog | 7 | ✓ All pass |
| `attendance.spec.ts` | Admin Attendance Page | 7 | ✓ All pass |
| `attendance.spec.ts` | Manual Attendance Dialog | 6 | ✓ All pass |
| `shift-changes.spec.ts` | Admin Shift Change Page | 7 | ✓ All pass |

---

## Bugs Found During Test Authoring

### BUG-AUTO-P2-01: `getByText()` strict mode with ambiguous Vietnamese text

**Symptom:** `page.getByText('Đổi ca')` resolved to 3 elements (sub-tab button, `<h1>` heading, EmptyState description text that contains "đổi ca"). `page.getByText('Chấm công')` resolved to 2 elements (quick-action button + BottomNav link).

**Root cause:** `getByText()` performs substring matching by default. Short Vietnamese phrases like "Đổi ca" and "Chấm công" appear in multiple places on the page (headings, buttons, nav links, description text).

**Fix pattern:**
- Use `getByRole('heading', { name: 'Đổi ca', exact: true })` for page-load guards
- Use `getByRole('button', { name: 'Chấm công' })` or `getByRole('button', { name: 'Đổi ca' })` to target specific buttons
- For text assertions that accept the first occurrence: `.first()` suffix

**Files fixed:** `employee-shift-change.spec.ts:15`, `employee-shift-change.spec.ts:25`, `employee-dashboard.spec.ts:38,45`

---

### BUG-AUTO-P2-02: `getByRole('heading')` partial name match hits EmptyState heading

**Symptom:** `getByRole('heading', { name: 'Chấm công' })` resolved to 2 elements:
1. `<h1>Chấm công</h1>` (page title)
2. `<h3>Không có dữ liệu chấm công</h3>` (EmptyState heading — contains "chấm công" as substring)

Same for `'Yêu cầu đổi ca'` matching `<h3>Không có yêu cầu đổi ca</h3>`.

**Root cause:** Playwright's `getByRole('heading', { name: 'X' })` uses substring matching by default. The `EmptyState` component renders an `<h3>` whose text contains the page heading text.

**Fix:** Always use `{ exact: true }` when matching headings that might appear in empty-state variants.

**Files fixed:** `attendance.spec.ts:11,15`, `shift-changes.spec.ts:14` (all beforeEach guards)

---

### BUG-AUTO-P2-03: `BranchSelectOverlay` blocks click for super_admin without activeBranchId

**Symptom:** `ManualAttendanceDialog` `beforeEach` could resolve the "Chấm thủ công" button as visible, but `.click()` timed out because `<div class="fixed inset-0 bg-slate-50 z-50">` (BranchSelectOverlay) intercepted pointer events.

**Root cause:** The test admin user has role `super_admin`. `AdminLayout.tsx:13` shows the overlay when `user.role === 'super_admin' && !activeBranchId`. The saved auth state (`playwright/.auth/admin.json`) had `activeBranchId: null` because the setup test didn't select a branch before saving `storageState`.

**Fix:** Updated `auth.admin.setup.ts` to detect and click the first branch button if the BranchSelectOverlay appears before saving state. The saved `admin.json` now contains a valid `activeBranchId`, so no overlay appears in subsequent tests.

**File fixed:** `e2e/auth.admin.setup.ts`

---

### BUG-AUTO-P2-04: `getByText('Ca hiện tại')` strict mode — label vs combobox placeholder

**Symptom:** `dialog.getByText('Ca hiện tại')` resolved to 2 elements:
1. `<label>Ca hiện tại *</label>` (the form label)
2. `<span>Chọn ca hiện tại</span>` inside the Radix UI SelectTrigger (combobox placeholder)

**Root cause:** The label text is "Ca hiện tại *" (with asterisk from the red star span), and the combobox placeholder "Chọn ca hiện tại" contains "Ca hiện tại" as a substring.

**Fix:** Use `dialog.locator('label', { hasText: 'Ca hiện tại' })` to scope the search to `<label>` elements only.

**Files fixed:** `employee-shift-change.spec.ts:60-61`

---

### BUG-AUTO-P2-05: BUG-P2-09 date refine — Zod `.refine()` skipped when other fields are empty

**Symptom:** Setting today's date and submitting didn't show "Phải đổi ca cho ngày mai trở đi" error.

**Root cause:** Zod's `.refine()` at object level only runs after ALL field-level validations pass. With an empty form (no shifts selected, no reason), field validators for `current_shift_id`, `requested_shift_id`, and `reason` fail first, and Zod aborts before running the date refine.

**Fix:** Rewrote the BUG-P2-09 test to:
1. Select first available shift as `current_shift_id`
2. Select second available shift (different) as `requested_shift_id`
3. Fill `reason`
4. Use `evaluate` + React native value setter to force-set today's date (bypasses `min` attr and triggers RHF update)
5. Submit → now only the date refine can fire → "Phải đổi ca cho ngày mai trở đi" appears
6. Falls back to generic error assertion if only 1 shift is available in DB

**Files fixed:** `employee-shift-change.spec.ts:75-124`

**Note:** The `evaluate` trick uses `Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set` (React's known workaround for triggering controlled input updates from outside React). Combined with `el.removeAttribute('min')` to bypass the HTML5 constraint.

---

## Selector Patterns Established (Phase 2)

| Pattern | Use case |
|---|---|
| `getByRole('heading', { name: '...', exact: true })` | Page-load guard when EmptyState has similar heading text |
| `getByRole('button', { name: 'Chấm công' })` | Quick-action buttons where text also appears in BottomNav links |
| `getByRole('button', { name: 'Đổi ca' })` | Sub-tab button where text also appears in heading and description |
| `dialog.locator('label', { hasText: '...' })` | Form label verification when combobox placeholder shares text |
| `el.removeAttribute('min') + nativeSetter + dispatchEvent` | Force-update a date input value in RHF controlled form |

---

## Known Limitations

- **BUG-P2-09 test with 1 shift:** If only 1 active shift exists in DB, the test cannot isolate the date refine (same-shift refine fires instead). The test degrades gracefully to asserting any validation error. This is annotated in the test.
- **Manual attendance create test:** The "creates manual attendance record" test skips if no employees or shifts exist. Current DB has data so it passes.
- **Shift change approval tests:** Duyệt/Từ chối button tests skip if no pending requests exist. Current DB has pending requests so they pass.

---

## Test Infrastructure Changes

- `e2e/auth.admin.setup.ts` — Added branch overlay detection and click before saving `storageState`
- `playwright/.auth/admin.json` — Regenerated with valid `activeBranchId` (branch selected during setup)
