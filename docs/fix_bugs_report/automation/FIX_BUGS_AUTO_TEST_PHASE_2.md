# Fix Bugs Auto Test Phase 2

**Phạm vi:** E2E test files — `e2e/phase2/`, `e2e/auth.admin.setup.ts`  
**Loại bug:** Test code bugs (không phải app bugs)  
**Kết quả sau fix:** 44/44 passed ✅

---

## BUG-AUTO-P2-01 — `getByText()` strict mode: ambiguous Vietnamese text

**Severity:** Test failure  
**Files:** `e2e/phase2/employee-shift-change.spec.ts` (lines 15, 25), `e2e/phase2/employee-dashboard.spec.ts` (lines 38, 45)

### Mô tả
`page.getByText('Đổi ca')` resolve 3 elements (sub-tab button, `<h1>` heading, EmptyState description).  
`page.getByText('Chấm công')` resolve 2 elements (quick-action button + BottomNav link).

### Root Cause
`getByText()` dùng substring matching — các cụm từ ngắn tiếng Việt như "Đổi ca", "Chấm công" xuất hiện ở nhiều nơi trên trang.

### Fix

**`employee-shift-change.spec.ts`:**
```diff
- await expect(page.getByText('Đổi ca')).toBeVisible()          // beforeEach guard
+ await expect(page.getByRole('heading', { name: 'Đổi ca', exact: true })).toBeVisible()

- await expect(page.getByText('Đổi ca')).toBeVisible()          // sub-tab button
+ await expect(page.getByRole('button', { name: 'Đổi ca' })).toBeVisible()
```

**`employee-dashboard.spec.ts`:**
```diff
- await expect(page.getByText('Chấm công')).toBeVisible()
+ await expect(page.getByRole('button', { name: 'Chấm công' })).toBeVisible()

- await expect(page.getByText('Đổi ca')).toBeVisible()
+ await expect(page.getByText('Đổi ca').first()).toBeVisible()
```

### Ghi chú cho tests sau
- Dùng `getByRole('heading', { name: '...', exact: true })` cho page-load guard
- Dùng `getByRole('button', { name: '...' })` để target button cụ thể
- Nếu phải dùng `getByText`, thêm `.first()` khi chấp nhận element đầu tiên

---

## BUG-AUTO-P2-02 — `getByRole('heading')` partial match hits EmptyState heading

**Severity:** Test failure  
**Files:** `e2e/phase2/attendance.spec.ts` (lines 11, 15), `e2e/phase2/shift-changes.spec.ts` (line 14)

### Mô tả
`getByRole('heading', { name: 'Chấm công' })` resolve 2 elements:
1. `<h1>Chấm công</h1>` (page title)
2. `<h3>Không có dữ liệu chấm công</h3>` (EmptyState — chứa "chấm công" dạng substring)

Tương tự với `'Yêu cầu đổi ca'` matching `<h3>Không có yêu cầu đổi ca</h3>`.

### Root Cause
`getByRole('heading', { name: 'X' })` dùng substring matching mặc định. `EmptyState` component render `<h3>` có text chứa heading text của trang.

### Fix
Thêm `{ exact: true }` vào tất cả heading assertions dùng làm beforeEach guard và page-load check:

```diff
- await expect(page.getByRole('heading', { name: 'Chấm công' })).toBeVisible()
+ await expect(page.getByRole('heading', { name: 'Chấm công', exact: true })).toBeVisible()

- await expect(page.getByRole('heading', { name: 'Yêu cầu đổi ca' })).toBeVisible()
+ await expect(page.getByRole('heading', { name: 'Yêu cầu đổi ca', exact: true })).toBeVisible()
```

### Ghi chú cho tests sau
Luôn dùng `{ exact: true }` khi match heading mà page có EmptyState chứa text tương tự.

---

## BUG-AUTO-P2-03 — `BranchSelectOverlay` block click cho super_admin khi không có `activeBranchId`

**Severity:** Test failure (click timeout)  
**File:** `e2e/auth.admin.setup.ts`

### Mô tả
`beforeEach` của `ManualAttendanceDialog` thấy button "Chấm thủ công" nhưng `.click()` timeout vì `BranchSelectOverlay` (`div.fixed.inset-0 z-50`) intercept pointer events. Saved auth state `playwright/.auth/admin.json` có `activeBranchId: null` vì setup test chưa chọn branch trước khi lưu `storageState`.

### Root Cause
Test admin user có role `super_admin`. `AdminLayout.tsx` hiển thị overlay khi `role === 'super_admin' && !activeBranchId`. Setup test login xong nhưng chưa handle overlay trước khi `page.context().storageState()`.

### Fix
**`auth.admin.setup.ts`** — Thêm branch overlay detection sau khi redirect vào `/admin`:

```ts
// If super_admin without activeBranchId, the BranchSelectOverlay blocks the UI.
// Select the first available branch so all admin tests can interact freely.
const overlay = page.locator('div.fixed.inset-0').filter({ hasText: 'Chọn chi nhánh' })
const hasOverlay = await overlay.isVisible().catch(() => false)
if (hasOverlay) {
  const branchBtn = overlay.locator('button').first()
  await branchBtn.waitFor({ state: 'visible', timeout: 10_000 })
  await branchBtn.click()
  await overlay.waitFor({ state: 'hidden', timeout: 5_000 })
}
```

`admin.json` được regenerate với `activeBranchId` hợp lệ → overlay không hiện trong các tests tiếp theo.

### Ghi chú cho tests sau
Khi test environment dùng super_admin account, luôn đảm bảo setup đã chọn branch và lưu vào storageState.

---

## BUG-AUTO-P2-04 — `getByText('Ca hiện tại')` strict mode: label vs combobox placeholder

**Severity:** Test failure  
**File:** `e2e/phase2/employee-shift-change.spec.ts` (lines 60–61)

### Mô tả
`dialog.getByText('Ca hiện tại')` resolve 2 elements:
1. `<label>Ca hiện tại *</label>` (form label, có asterisk từ red star span)
2. `<span>Chọn ca hiện tại</span>` bên trong Radix UI SelectTrigger placeholder (chứa "Ca hiện tại" dạng substring)

### Root Cause
Label có text "Ca hiện tại *" và combobox placeholder "Chọn ca hiện tại" — cả hai đều khớp với substring "Ca hiện tại".

### Fix
```diff
- await expect(dialog.getByText('Ca hiện tại')).toBeVisible()
- await expect(dialog.getByText('Ca muốn đổi')).toBeVisible()
+ await expect(dialog.locator('label', { hasText: 'Ca hiện tại' })).toBeVisible()
+ await expect(dialog.locator('label', { hasText: 'Ca muốn đổi' })).toBeVisible()
```

Scope search xuống `<label>` element để tránh match placeholder.

### Ghi chú cho tests sau
Verify form label bằng `dialog.locator('label', { hasText: '...' })` khi combobox placeholder có text tương tự.

---

## BUG-AUTO-P2-05 — Zod `.refine()` bị skip khi có field-level validation errors

**Severity:** Test failure (wrong validation behavior)  
**File:** `e2e/phase2/employee-shift-change.spec.ts` (lines 75–124)

### Mô tả
Test set ngày hôm nay và submit → kỳ vọng thấy "Phải đổi ca cho ngày mai trở đi" nhưng error không xuất hiện. Zod's `.refine()` ở object-level chỉ chạy sau khi **tất cả** field-level validations pass. Form rỗng nên `current_shift_id`, `requested_shift_id`, `reason` fail trước → Zod abort → date refine không chạy.

### Root Cause
Zod schema: field validators chạy trước `.refine()`. Submit form rỗng chỉ trigger field errors, không trigger cross-field refine logic.

### Fix
Rewrite test để fill đủ các fields trước, chỉ để date sai:

```ts
// 1. Chọn ca hiện tại
await dialog.getByText('Chọn ca hiện tại').click()
await opts1.first().click()

// 2. Chọn ca muốn đổi (khác ca hiện tại để tránh same-shift refine)
await dialog.getByText('Chọn ca mới').click()
await opts2.nth(1).click()   // shift thứ 2 nếu có

// 3. Fill lý do
await dialog.getByPlaceholder('Lý do đổi ca...').fill('Test BUG-P2-09')

// 4. Force-set today's date — bypass HTML5 min constraint + trigger RHF
await dateInput.evaluate((el: HTMLInputElement, val) => {
  el.removeAttribute('min')
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set
  nativeSetter?.call(el, val)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}, todayStr)

// 5. Submit → chỉ date refine còn lại
await dialog.getByRole('button', { name: 'Gửi yêu cầu' }).click()
await expect(dialog.getByText('Phải đổi ca cho ngày mai trở đi')).toBeVisible()
```

Thêm graceful degradation: nếu DB chỉ có 1 ca, chấp nhận bất kỳ validation error nào vì same-shift refine sẽ fire thay thế.

### Ghi chú cho tests sau
Khi test Zod cross-field refine, phải fill đủ các field-level validations trước. Dùng native value setter để bypass React controlled input và HTML5 constraints khi cần force-set giá trị.
