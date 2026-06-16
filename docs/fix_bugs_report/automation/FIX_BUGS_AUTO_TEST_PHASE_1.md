# Fix Bugs Auto Test Phase 1

**Phạm vi:** E2E test files — `e2e/phase1/`  
**Loại bug:** Test code bugs (không phải app bugs)  
**Kết quả sau fix:** 39/39 passed ✅

---

## BUG-AUTO-P1-01 — Selector sai: submit button EmployeeForm

**Severity:** Test failure  
**File:** `e2e/phase1/employees.spec.ts`

### Mô tả
Test dùng selector `getByRole('button', { name: /Tạo/ })` để click submit trong add employee dialog, nhưng button thực tế trong `EmployeeForm.tsx:129` có text `"Thêm nhân viên"` (create mode) / `"Cập nhật"` (edit mode).

### Root Cause
Nhầm lẫn với `ShiftForm.tsx` dùng `"Tạo ca"`. `EmployeeForm` có convention riêng: `{isEditing ? 'Cập nhật' : 'Thêm nhân viên'}`.

### Fix
```diff
- await dialog.getByRole('button', { name: /Tạo/ }).click()
+ await dialog.getByRole('button', { name: 'Thêm nhân viên' }).click()
```

Áp dụng ở 2 chỗ: test "shows validation errors on empty submit" (line 112) và test "creates a new employee successfully" (line 132).

### Ghi chú cho tests sau
Employee form button text: create = `"Thêm nhân viên"`, edit = `"Cập nhật"`.

---

## BUG-AUTO-P1-02 — Selector sai: ConfirmDialog dùng `dialog` role, không phải `alertdialog`

**Severity:** Test failure  
**File:** `e2e/phase1/shifts.spec.ts`

### Mô tả
Test dùng `getByRole('alertdialog')` để tìm confirm dialog, nhưng `src/components/shared/ConfirmDialog.tsx` implement bằng `<Dialog>` (role=`"dialog"`), không phải `<AlertDialog>` (role=`"alertdialog"`).

### Root Cause
Shadcn/ui có 2 component riêng biệt: `Dialog` (role=`"dialog"`) và `AlertDialog` (role=`"alertdialog"`). `ConfirmDialog.tsx:35` dùng `<Dialog open={open}>`.

### Fix
```diff
- await expect(page.getByRole('alertdialog')).toBeVisible()
+ await expect(page.getByText('Xóa ca làm việc?')).toBeVisible()
```

Dùng text-based assertion thay vì role assertion. Áp dụng trong `deleteShift` helper (line 33) và describe "Delete Shift" (line 208).

### Ghi chú cho tests sau
Bất kỳ test nào dùng `ConfirmDialog` component đều phải dùng text selector, không dùng `alertdialog` role:
```ts
await expect(page.getByText('<dialog title>')).toBeVisible()
await page.getByRole('button', { name: '<confirm label>' }).click()
```

---

## BUG-AUTO-P1-03 — Time input value: DB trả về `"HH:MM:SS"` thay vì `"HH:MM"`

**Severity:** Test failure  
**File:** `e2e/phase1/shifts.spec.ts`

### Mô tả
Test assert `toHaveValue('08:00')` nhưng input nhận `"08:00:00"`. PostgreSQL `TIME` type lưu với giây, Supabase trả về `"HH:MM:SS"`. HTML `<input type="time">` lưu `element.value = "08:00:00"` dù UI chỉ hiển thị `"08:00"`.

### Root Cause
Khi edit shift, `defaultValues.start_time` = `"08:00:00"` từ DB. Input nhận đúng giá trị đó, nhưng test expect string ngắn hơn.

### Fix
```diff
- await expect(dialog.getByLabel('Giờ bắt đầu')).toHaveValue('08:00')
- await expect(dialog.getByLabel('Giờ kết thúc')).toHaveValue('17:00')
+ await expect(dialog.getByLabel('Giờ bắt đầu')).toHaveValue(/^08:00/)
+ await expect(dialog.getByLabel('Giờ kết thúc')).toHaveValue(/^17:00/)
```

Dùng regex prefix match `^HH:MM` thay vì exact string.

### Ghi chú cho tests sau
Tất cả time value assertion phải dùng regex: `toHaveValue(/^HH:MM/)` — không dùng exact string.
