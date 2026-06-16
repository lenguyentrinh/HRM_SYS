# Fix Bugs Auto Test Phase 3

**Phạm vi:** E2E test files — `e2e/phase3/`  
**Loại bug:** Test code bugs (không phải app bugs)  
**Kết quả sau fix:** 70/70 passed ✅

---

## BUG-AUTO-P3-01 — Dashboard route sai: `/admin/dashboard` không tồn tại

**Severity:** Test failure (404)  
**Files:** `e2e/phase3/admin-dashboard.spec.ts`, `e2e/phase3/notifications.spec.ts`

### Mô tả
Test dùng `page.goto('/admin/dashboard')` nhưng route không tồn tại. `DashboardPage` là **index route** của `/admin` — `{ index: true, element: <DashboardPage /> }` trong `router.tsx:100`.

### Fix
```diff
- await page.goto('/admin/dashboard')
+ await page.goto('/admin')
```

---

## BUG-AUTO-P3-02 — Strict mode: sidebar NavLink "Nhân viên" vs stat card button

**Severity:** Test failure (strict mode)  
**File:** `e2e/phase3/admin-dashboard.spec.ts`

### Mô tả
`getByText('Nhân viên')` match cả sidebar `<a>` (NavLink) lẫn `<p>` label trong stat card → 2 elements → strict mode violation.

### Fix
```diff
- await expect(page.getByText('Nhân viên')).toBeVisible()
+ await expect(page.locator('button').filter({ hasText: 'Nhân viên' })).toBeVisible()
```

Stat card là `<button>`, sidebar NavLink là `<a>` → scope bằng `locator('button')`.

---

## BUG-AUTO-P3-03 — Strict mode: settings page `.or()` locator chain

**Severity:** Test failure (strict mode)  
**File:** `e2e/phase3/admin-settings.spec.ts` (`beforeEach`)

### Mô tả
`.or()` trong Playwright tạo UNION locator. Khi `heading('Cài đặt').or(heading('Settings')).or(getByText('Cấu hình lương'))` khớp 3 elements khác nhau, strict mode fail toàn bộ assertion.

### Fix
```diff
- await expect(page.getByRole('heading', { name: 'Cài đặt' })
-   .or(page.getByRole('heading', { name: 'Settings' }))
-   .or(page.getByText('Cấu hình lương'))).toBeVisible()
+ await expect(page.getByRole('heading', { name: 'Cài đặt', exact: true })).toBeVisible()
```

---

## BUG-AUTO-P3-04 — Strict mode: "BHXH", "Cuối tuần", "Ngày lễ" substring matches

**Severity:** Test failure (strict mode)  
**File:** `e2e/phase3/admin-settings.spec.ts` (tests 2 và 3)

### Mô tả
- `getByText('BHXH')` match CardTitle h3 + labels chứa "BHXH" ("Tỷ lệ BHXH nhân viên đóng")
- `getByText('Cuối tuần')` match label + CardDescription chứa "cuối tuần"
- `getByText('Ngày lễ')` match label + tab trigger "Ngày lễ"

### Fix
```diff
- await expect(page.getByText('BHXH')).toBeVisible()
+ await expect(page.getByRole('heading', { name: 'BHXH', exact: true })).toBeVisible()

- await expect(page.getByText('Ngày thường')).toBeVisible()
- await expect(page.getByText('Cuối tuần')).toBeVisible()
- await expect(page.getByText('Ngày lễ')).toBeVisible()
+ await expect(page.locator('label', { hasText: 'Ngày thường' })).toBeVisible()
+ await expect(page.locator('label', { hasText: 'Cuối tuần' })).toBeVisible()
+ await expect(page.locator('label', { hasText: 'Ngày lễ' })).toBeVisible()
```

---

## BUG-AUTO-P3-05 — Topbar selector sai: sidebar `border-b` div bị chọn trước `<header>`

**Severity:** Test failure (wrong element)  
**File:** `e2e/phase3/notifications.spec.ts`

### Mô tả
`locator('header, .border-b').first()` chọn phần tử **đầu tiên trong DOM** khớp `<header>` hoặc `.border-b`. `AdminSidebar` render `<div class="h-14 ... border-b ...">` (logo area) **trước** `<header>` trong DOM → chọn nhầm container.

### Fix
```diff
- const bellBtn = page.locator('header, .border-b').first().locator('button')
+ const bellBtn = page.locator('header button.relative')
```

`NotificationBell` button có `className="relative h-9 w-9"` — unique trong header.

---

## BUG-AUTO-P3-06 — Strict mode: "Thông báo" heading vs empty-state text

**Severity:** Test failure (strict mode)  
**File:** `e2e/phase3/notifications.spec.ts`

### Mô tả
`getByText('Thông báo')` match `<h3>Thông báo</h3>` (popover header) lẫn `<div>Không có thông báo nào</div>` (empty state chứa "thông báo" dạng substring).

### Fix
```diff
- await expect(page.getByText('Thông báo')).toBeVisible()
+ await expect(page.getByRole('heading', { name: 'Thông báo', exact: true })).toBeVisible()
```

---

## BUG-AUTO-P3-07 — Strict mode: "Lý do" label vs "Lý do khác" option

**Severity:** Test failure (strict mode)  
**File:** `e2e/phase3/employee-leave.spec.ts`

### Mô tả
`dialog.getByText('Lý do')` match `<label>Lý do</label>` và `<option value="other">Lý do khác</option>` vì "Lý do" là substring của "Lý do khác".

### Fix
```diff
- await expect(dialog.getByText('Lý do')).toBeVisible()
+ await expect(dialog.getByText('Lý do', { exact: true })).toBeVisible()
```

---

## BUG-AUTO-P3-08 — Strict mode: "Đổi mật khẩu" heading vs submit button

**Severity:** Test failure (strict mode)  
**File:** `e2e/phase3/employee-profile.spec.ts`

### Mô tả
`page.getByText('Đổi mật khẩu')` match cả `<h2>Đổi mật khẩu</h2>` heading lẫn `<button>Đổi mật khẩu</button>` submit button.

### Fix
```diff
- await expect(page.getByText('Đổi mật khẩu')).toBeVisible()
+ await expect(page.getByRole('heading', { name: 'Đổi mật khẩu' })).toBeVisible()
```

---

## BUG-AUTO-P3-09 — Sai expected text: error toast mật khẩu sai

**Severity:** Test failure (wrong assertion)  
**File:** `e2e/phase3/employee-profile.spec.ts`

### Mô tả
Test expect `'Mật khẩu hiện tại không đúng'` nhưng `loginWithPhone()` trong `src/lib/auth.ts` throw `'Sai số điện thoại hoặc mật khẩu'`. `ProfilePage` không reformat lỗi — dùng `toast.error(msg)` với raw error message.

### Fix
```diff
- await expect(page.getByText('Mật khẩu hiện tại không đúng')).toBeVisible()
+ await expect(page.getByText('Sai số điện thoại hoặc mật khẩu')).toBeVisible({ timeout: 10_000 })
```

### Ghi chú
Comment trong test giải thích rõ nguồn gốc của message: `loginWithPhone throws "Sai số điện thoại hoặc mật khẩu" — profile page shows it as-is`.
