# Auto Test Phase 1 – Auth, Employee Management, Shift Configuration

**Loại test:** Playwright E2E (live Supabase)  
**Ngày chạy:** 2026-05-21  
**Môi trường:** Local — `http://localhost:5173`, Supabase project `vmivaujlstwnqziauqqf`  
**Kết quả cuối:** ✅ **39/39 passed**

---

## Thông tin chạy test

| Mục | Giá trị |
|-----|---------|
| Framework | Playwright `^1.60.0` |
| Browser | Chromium (headless) |
| Workers | 1 (sequential — live DB) |
| Auth strategy | `storageState` — login 1 lần, tái dùng session cho toàn bộ admin tests |
| Thời gian chạy | ~1 phút 18 giây |

### Cấu trúc file test

```
e2e/
  auth.admin.setup.ts         ← login admin, lưu session
  auth.employee.setup.ts      ← login employee, lưu session
  phase1/
    login.spec.ts             ← 13 tests (project: no-auth)
    employees.spec.ts         ← 14 tests (project: admin)
    shifts.spec.ts            ← 12 tests (project: admin)
```

---

## Kết quả chi tiết

### Login & Auth (13 tests) — `login.spec.ts`

| # | Test case | Kết quả |
|---|-----------|---------|
| 1 | Login form renders đầy đủ (title, inputs, button) | ✅ PASS |
| 2 | Password field mặc định là hidden (`type="password"`) | ✅ PASS |
| 3 | Toggle password visibility (eye icon) | ✅ PASS |
| 4 | Validation: phone < 10 ký tự → error "Số điện thoại không hợp lệ" | ✅ PASS |
| 5 | Validation: password < 6 ký tự → error "Mật khẩu tối thiểu 6 ký tự" | ✅ PASS |
| 6 | Sai credentials → toast "Sai số điện thoại hoặc mật khẩu" | ✅ PASS |
| 7 | Submit button bị disabled khi đang submit (`isSubmitting=true`) | ✅ PASS |
| 8 | Admin login → redirect đến `/admin` | ✅ PASS |
| 9 | Employee login → redirect đến `/` | ✅ PASS |
| 10 | Truy cập `/admin` khi chưa login → redirect về `/login` | ✅ PASS |
| 11 | Truy cập `/admin/employees` khi chưa login → redirect về `/login` | ✅ PASS |

### Employee Management (14 tests) — `employees.spec.ts`

| # | Test case | Kết quả |
|---|-----------|---------|
| 12 | List page load: title "Nhân viên", buttons Export/Import/Thêm | ✅ PASS |
| 13 | Có search input và 2 filter dropdowns (status, type) | ✅ PASS |
| 14 | Table headers đúng khi có data | ✅ PASS |
| 15 | Search debounce: nhập chuỗi không tồn tại → 0 rows; xóa → rows trở lại | ✅ PASS |
| 16 | Status filter dropdown: Tất cả / Đang làm / Tạm nghỉ / Đã nghỉ | ✅ PASS |
| 17 | Type filter dropdown: Tất cả / Toàn thời gian / Bán thời gian | ✅ PASS |
| 18 | Click "Thêm nhân viên" → dialog mở | ✅ PASS |
| 19 | Dialog có đủ required fields: Họ và tên, SĐT, Lương CB, Ngày vào làm | ✅ PASS |
| 20 | Submit rỗng → validation error hiện, dialog vẫn mở | ✅ PASS |
| 21 | Tạo nhân viên mới thành công → dialog đóng, tên xuất hiện trong list | ✅ PASS |
| 22 | Click "Hủy" → dialog đóng, không tạo | ✅ PASS |
| 23 | Click row → navigate đến `/admin/employees/:id` | ✅ PASS |
| 24 | Detail page có ≥3 tabs, có tab "Thông tin" và "Lương" | ✅ PASS |
| 25 | Detail page hiển thị tên nhân viên đã click | ✅ PASS |

### Shift Configuration (12 tests) — `shifts.spec.ts`

| # | Test case | Kết quả |
|---|-----------|---------|
| 26 | List page load: title "Ca làm việc", button "Tạo ca mới" | ✅ PASS |
| 27 | Table headers đúng khi có data | ✅ PASS |
| 28 | Click "Tạo ca mới" → dialog mở với title "Tạo ca mới" | ✅ PASS |
| 29 | Dialog có đủ fields: Tên ca, Giờ bắt đầu, Giờ kết thúc, Grace period, checkboxes | ✅ PASS |
| 30 | Submit không có tên → validation error, dialog vẫn mở | ✅ PASS |
| 31 | **SHF-01**: end_time < start_time (non-overnight) → validation error | ✅ PASS |
| 32 | Tick "Ca qua đêm" → helper text xuất hiện | ✅ PASS |
| 33 | Click "Hủy" → dialog đóng | ✅ PASS |
| 34 | Tạo ca thành công → xuất hiện trong list, sau đó xóa (cleanup) | ✅ PASS |
| 35 | Click edit icon → dialog "Chỉnh sửa ca" mở với dữ liệu pre-filled | ✅ PASS |
| 36 | Sửa tên ca → save → tên mới xuất hiện trong list | ✅ PASS |
| 37 | Click delete → confirm dialog hiện; click Hủy → dialog đóng, ca không bị xóa | ✅ PASS |
| 38 | Xóa ca thành công → biến mất khỏi list | ✅ PASS |

---

## Bugs phát hiện trong quá trình automation

### BUG-AUTO-P1-01 — Selector sai: submit button EmployeeForm

| Mục | Chi tiết |
|-----|---------|
| **Severity** | Test failure (không phải app bug) |
| **Phát hiện lúc** | Lần chạy đầu tiên, test #21 và #22 |
| **Mô tả** | Test dùng selector `getByRole('button', { name: /Tạo/ })` để click submit trong add employee dialog, nhưng button thực tế có text **"Thêm nhân viên"** (không phải "Tạo") |
| **Root cause** | `EmployeeForm.tsx:129` — `{isEditing ? 'Cập nhật' : 'Thêm nhân viên'}` — khác với `ShiftForm.tsx` dùng `'Tạo ca'` |
| **Fix** | Đổi selector thành `getByRole('button', { name: 'Thêm nhân viên' })` |
| **File** | `e2e/phase1/employees.spec.ts` |

---

### BUG-AUTO-P1-02 — Selector sai: ConfirmDialog dùng Dialog thường, không phải AlertDialog

| Mục | Chi tiết |
|-----|---------|
| **Severity** | Test failure (không phải app bug) |
| **Phát hiện lúc** | Lần chạy đầu tiên, tests #35–#39 (shift delete/edit) |
| **Mô tả** | Test dùng `getByRole('alertdialog')` để tìm confirm dialog, nhưng `ConfirmDialog.tsx` implement bằng `<Dialog>` thường (role=`"dialog"`), không phải `<AlertDialog>` (role=`"alertdialog"`) |
| **Root cause** | `src/components/shared/ConfirmDialog.tsx:35` — `<Dialog open={open}>` |
| **Fix** | Thay `getByRole('alertdialog')` bằng text-based assertion `getByText('Xóa ca làm việc?')` |
| **Ghi chú cho tests sau** | Bất kỳ test nào dùng `ConfirmDialog` component đều phải dùng text selector, không dùng `alertdialog` role |
| **File** | `e2e/phase1/shifts.spec.ts` |

---

### BUG-AUTO-P1-03 — Giá trị time input: DB trả về có giây ("HH:MM:SS")

| Mục | Chi tiết |
|-----|---------|
| **Severity** | Test failure (không phải app bug) |
| **Phát hiện lúc** | Lần chạy thứ 2 (sau fix #01, #02), test #36 (Edit Shift pre-filled data) |
| **Mô tả** | Test assert `toHaveValue('08:00')` nhưng input nhận được `"08:00:00"`. PostgreSQL `TIME` type lưu với giây, Supabase trả về dạng `"HH:MM:SS"` |
| **Root cause** | Khi load shift từ DB, `defaultValues.start_time = "08:00:00"`. HTML `<input type="time">` lưu `element.value = "08:00:00"` dù UI chỉ hiển thị `"08:00"` |
| **Fix** | Dùng regex `toHaveValue(/^08:00/)` thay vì exact string |
| **Ghi chú cho tests sau** | Tất cả time value assertion phải dùng regex `^HH:MM` thay vì exact string |
| **File** | `e2e/phase1/shifts.spec.ts` |

---

## Ghi chú kỹ thuật cho tests sau

1. **ConfirmDialog selector pattern** — Vì `ConfirmDialog` không dùng `AlertDialog`, luôn dùng:
   ```ts
   await expect(page.getByText('<title text>')).toBeVisible()  // wait for dialog
   await page.getByRole('button', { name: '<confirmLabel>' }).click()
   ```

2. **Time input value** — Selects from DB trả về `"HH:MM:SS"`, dùng regex:
   ```ts
   await expect(input).toHaveValue(/^HH:MM/)
   ```

3. **Employee form button** — Submit button text theo mode:
   - Create: `"Thêm nhân viên"`
   - Edit: `"Cập nhật"`

4. **Auth reuse** — `playwright/.auth/admin.json` được tái dùng giữa các test trong project `admin`. Không cần login lại mỗi test. Session TTL: 12 giờ theo authStore.

5. **Data cleanup** — Các tests tạo shift đều có cleanup (delete sau khi assert). Test tạo employee KHÔNG cleanup (không có delete UI). Employee test sẽ tạo nhân viên với tên `"Test NV <timestamp>"` trong DB — cần xóa thủ công nếu cần.
