# Fix Bugs – Phase 3 & 4 Testing

**Ngày fix:** 2026-05-19  
**Scope:** Tất cả bugs được QC log trong `TESTING_PHASE_3.md` và `TESTING_PHASE_4.md`

---

## 1. Tablet page link trong Admin sidebar

**Nguồn:** Yêu cầu từ user (không có đường dẫn đến `/tablet/:branch_id`)  
**File:** `src/layouts/AdminSidebar.tsx`  
**Fix:** Thêm link "Màn hình tablet" ở cuối sidebar, dưới nav chính. Dùng `<a target="_blank">` để mở tab mới. `branch_id` lấy từ `useAuthStore`.

---

## 2. Phạt đi trễ — đổi sang phạt cố định per-occurrence

**Nguồn:** Yêu cầu từ user (phạt theo phút → phạt theo lần)  
**Files:**
- `src/features/settings/pages/SettingsPage.tsx` — đổi label `₫/phút` → `₫/lần`
- `supabase/functions/calculate-payroll/index.ts` — `totalLateMinutes × rate` → `lateCount × rate`
- `supabase/functions/salary-preview/index.ts` — `totalLateMinutes × rate` → `lateCount × rate`

**Lưu ý:** Reuse cột `late_penalty_per_minute` trong DB, không cần migration. Ý nghĩa của cột thay đổi: giờ là "số tiền phạt mỗi lần trễ".  
**Deploy cần thiết:** `supabase functions deploy calculate-payroll && supabase functions deploy salary-preview`

---

## 3. [BUG-P4-NEW-01] Audit log không được ghi

**Mức độ:** HIGH  
**Mô tả gốc:** `useInsertAuditLog` được export nhưng không được gọi ở bất kỳ đâu. Trang `/admin/audit` luôn rỗng.  
**Files sửa:**

### `src/features/leaves/hooks/useLeaves.ts`
- `leave_approved`: thêm `table_name: 'leave_requests'` (field bắt buộc bị thiếu)
- `leave_rejected`: thêm `table_name: 'leave_requests'`

### `src/features/payroll/hooks/usePayroll.ts`
- `payroll_confirmed`: thêm `table_name: 'payroll_records'`

### `src/features/shift-change/hooks/useShiftChange.ts`
- `shift_change_approved`: thêm audit log mới — `table_name: 'shift_change_requests'`, `branchId` từ authStore
- `shift_change_rejected`: thêm audit log mới

### `src/features/employees/hooks/useEmployees.ts` *(fix từ session trước)*
- `employee_created`: thêm `table_name: 'employees'`
- `employee_updated`: thêm `table_name: 'employees'`
- `password_reset`: thêm `table_name: 'users'`

### `src/features/attendance/hooks/useAttendance.ts` *(fix từ session trước)*
- `manual_attendance`: thêm `table_name: 'attendance_records'`

**Root cause:** Cột `table_name TEXT NOT NULL` trong schema `audit_logs` nhưng tất cả insert call đều thiếu field này → constraint violation → silent fail.

---

## 4. [BUG-P4-NEW-03] Payroll CSV filename có space

**Mức độ:** Low  
**Mô tả gốc:** `label.replace(' ', '_')` chỉ replace lần đầu. `"tháng 5 2026"` → `"luong_tháng_5 2026.csv"` (còn space trước năm).  
**File:** `src/features/payroll/pages/PayrollPage.tsx`  
**Fix:** `.replace(' ', '_')` → `.replace(/ /g, '_')`

---

## 5. [BUG-P4-NEW-04] Bulk import drag-and-drop không hoạt động

**Mức độ:** Low/UX  
**Mô tả gốc:** UI hint "Kéo thả hoặc click" nhưng chỉ có `onClick` được handle. Drag file vào không có tác dụng.  
**File:** `src/features/employees/components/BulkImportDialog.tsx`  
**Fix:** Thêm `onDragOver` (prevent default) và `onDrop` (lấy `e.dataTransfer.files[0]`, set vào state) cho vùng upload.

---

## 6. [BUG-P4-NEW-05] Tab "Yêu cầu" không active khi ở `/shift-change`

**Mức độ:** Low/UX  
**Mô tả gốc:** NavLink `to='/leave'` nên khi URL là `/shift-change`, React Router không match → tab bị bỏ highlight.  
**File:** `src/layouts/EmployeeLayout.tsx`  
**Fix:** Thêm `leaveGroupRoutes = ['/leave', '/shift-change']`. Khi tab là `/leave`, kiểm tra `leaveGroupRoutes.includes(location.pathname)` để force active class.

---

## 7. [BUG-P3-NEW-01] Đổi mật khẩu không verify mật khẩu cũ

**Mức độ:** Medium  
**Mô tả gốc:** `changePassword(userId, newPw)` gọi trực tiếp mà không xác minh mật khẩu hiện tại. State `currentPw` được khai báo nhưng không có input field tương ứng.  
**File:** `src/features/employee-portal/pages/ProfilePage.tsx`  
**Fix:**
- Thêm input "Mật khẩu hiện tại" bind vào `currentPw`
- Trước khi `changePassword`: gọi `loginWithPhone(user.phone, currentPw)` để xác minh
- Nếu fail → toast "Mật khẩu hiện tại không đúng"
- Button disabled khi `!currentPw || !newPw || !confirmPw`

---

## 8. [BUG-P2-07] Unlinked employee — loading vô hạn trên CheckinPage

**Mức độ:** Medium  
**Mô tả gốc:** CheckinPage render "Đang tải..." vô hạn khi `employee = null`.  
**Trạng thái:** Đã được fix trước đó (không rõ phase nào). Code hiện tại (`CheckinPage.tsx` lines 128–143) đã có:
- Guard `if (employeeLoading)` → hiện skeleton "Đang tải thông tin nhân viên..."
- Guard `if (!employee)` → hiện "Tài khoản chưa được liên kết, vui lòng liên hệ quản lý"

Không cần fix thêm.

---

## Bugs không fix (accepted / out of scope)

| Bug ID | Mô tả | Lý do |
|--------|--------|-------|
| BUG-P2-06 | `isNaN` dead code trong `generate-qr` | Code smell, không gây lỗi |
| DEBT-P2-01 | Dead code `[sh, sm]`, `[eh, em]` trong checkin Edge Function | Code smell, không gây lỗi |
| BUG-P2-01 / DEBT-P2-02 | `formatPhone` không dùng ở AdminTopbar | Cosmetic, low priority |
| DEBT-P3-NEW-01 | Dashboard 7 parallel queries | Low perf impact với 50 NV, không cần optimize |
| DEBT-P3-NEW-02 | Leave approval bỏ qua ngày không có shift | Behavior có chủ ý, cần spec rõ trước khi fix |
| LIMIT-P3-01 | Settings accessible bởi manager | Accepted limitation cho app nội bộ |

---

## Tổng kết

| Hạng mục | Số lượng |
|----------|---------|
| Bugs đã fix | 7 |
| Bugs đã fix trước đó (confirmed) | 1 (BUG-P2-07) |
| Bugs không fix (accepted) | 6 |
| Files thay đổi (frontend) | 8 |
| Edge functions cần redeploy | 2 (`calculate-payroll`, `salary-preview`) |
