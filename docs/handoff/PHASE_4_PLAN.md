# PHASE 4 PLAN

**Trạng thái:** Sẵn sàng bắt đầu  
**Prerequisite:** Phase 3 đã hoàn thành, build clean  
**Pre-Phase 4 bugs:** Đã fix (xem `TESTING_PHASE_3.md`)

---

## Pre-Phase 4 — Bugs đã fix (2026-05-18)

| Bug | Fix |
|---|---|
| Admin không nhận noti khi NV gửi đơn nghỉ/đổi ca | Thêm notification trigger trong `useCreateLeaveRequest` và `useCreateShiftChangeRequest` |
| Danh sách nghỉ phép không reload sau duyệt/từ chối | Thêm cột `rejection_reason` vào `leave_requests` (migration 00005) + error throwing |
| Danh sách nhân viên không có indicator khi refetching | Thêm `isFetching` Loader2 spinner vào EmployeeListPage, LeavePage, ShiftChangePage |
| Employee không thấy lý do từ chối đơn nghỉ phép | Hiển thị `rejection_reason` trong employee portal LeavePage |

**Migration cần chạy:** `supabase/migrations/20260518000005_leave_rejection_reason.sql`

---

## Mục tiêu Phase 4

Hoàn thiện các tính năng còn thiếu, tối ưu hiệu năng, và chuẩn bị infrastructure để có thể deploy lên production.

---

## Milestone 1 — Performance & Missing Core Features

*Ưu tiên cao — phải có trước khi dùng thực tế*

### 1.1 Code Splitting (DEBT-01)

**Vấn đề:** Bundle ~920KB (gzip ~263KB) — vượt ngưỡng khuyến nghị 500KB.

**Giải pháp:** `React.lazy()` + `Suspense` cho từng feature route.

```tsx
// router.tsx — lazy import từng page
const DashboardPage = lazy(() => import('./features/admin/pages/DashboardPage'))
const PayrollPage = lazy(() => import('./features/payroll/pages/PayrollPage'))
// ...

// Bọc trong Suspense với fallback skeleton
<Suspense fallback={<PageSkeleton />}>
  <DashboardPage />
</Suspense>
```

**Kết quả mong đợi:** Initial bundle < 200KB, lazy chunks ~50-100KB mỗi route.

---

### 1.2 Salary Preview Edge Function + Employee Dashboard

**Vấn đề:** Employee dashboard hiện hiển thị lương cơ bản, không phải lương dự kiến thực tế tháng này.

**File cần tạo:** `supabase/functions/salary-preview/index.ts`

**Logic:**
- Input: `{ employee_id, month, year }`
- Tính toán tương tự `calculate-payroll` nhưng chỉ cho 1 nhân viên, chỉ tính đến ngày hôm nay
- Không lưu DB — return JSON ngay
- Gọi từ `EmployeeDashboardPage` với `useQuery` (staleTime: 5 phút)

**Output:** `{ salary_earned, overtime_pay, attendance_bonus, gross_estimate, net_estimate, days_worked, days_remaining }`

---

### 1.3 Leave Balance Admin UI

**Vấn đề:** Admin không có giao diện xem/sửa số ngày phép của từng nhân viên. Trigger tạo 12 ngày mặc định cho mọi người, cần điều chỉnh.

**Thêm vào Employee Detail Page:**
- Tab "Nghỉ phép" (hoặc trong tab "Thông tin")
- Hiển thị balance năm hiện tại: tổng ngày phép, đã dùng, còn lại
- Admin có thể chỉnh `total_paid_days` (ví dụ: nhân viên mới vào tháng 7 chỉ có 6 ngày)

**Fix leave balance trigger:** Đọc `leave_policies` để lấy `total_paid_days_per_year` theo `employee_type` thay vì hardcode 12.

---

### 1.4 Edge Functions Deployment Guide

Tạo file `docs/DEPLOYMENT.md` với hướng dẫn đầy đủ:

```bash
# Deploy tất cả Edge Functions
supabase functions deploy generate-qr
supabase functions deploy checkin
supabase functions deploy calculate-payroll
supabase functions deploy salary-preview

# Setup pg_cron (chạy trong SQL Editor)
SELECT cron.schedule(
  'generate-qr-tokens-daily',
  '30 6 * * *',
  $$ SELECT net.http_post(...) $$
);
```

Và hướng dẫn set environment variables, enable Replication cho `notifications` table.

---

## Milestone 2 — Export & Roster

*Quan trọng cho vận hành thực tế*

### 2.1 Export CSV/Excel

**Attendance Export (`/admin/attendance`):**
- Nút "Xuất CSV" trong `AttendancePage`
- Export theo ngày đang filter, hoặc chọn khoảng ngày
- Columns: Ngày, Nhân viên, Ca, Check-in, Check-out, Tổng giờ, OT, Trạng thái, Ghi chú

**Payroll Export (`/admin/payroll`):**
- Nút "Xuất Excel" trong `PayrollPage`
- Export bảng lương tháng đang xem
- Dùng `xlsx` library hoặc generate CSV đơn giản

**Thư viện đề xuất:** `xlsx` (SheetJS) cho Excel, hoặc custom CSV nếu muốn không thêm dependency.

---

### 2.2 Roster Scheduling

**Vấn đề:** Admin hiện phải vào từng Employee Detail page để gán ca tháng. Không có view tổng thể.

**Trang mới: `/admin/roster`**

```
Layout: Grid
- Cột: Ngày 1-31 trong tháng
- Hàng: Từng nhân viên
- Cell: Tên ca (màu khác nhau cho từng ca) hoặc trống
- Click cell: Popup chọn ca cho ngày đó → upsert shift_schedules
- Row header: Tên NV + ca mặc định tháng (từ employee_shift_assignments)
```

**Tính năng:**
- "Copy từ tháng trước": copy toàn bộ shift_schedules sang tháng mới
- Filter theo phòng ban
- Highlight ngày cuối tuần

---

### 2.3 Link Tài khoản cho Nhân viên cũ (LIMIT-06)

**Vấn đề:** Nhân viên tạo trước Phase 3 có `user_id = null`.

**Thêm vào Employee Detail Page:**
- Khi card "Tài khoản" hiện ⚠️ Chưa có tài khoản → Nút "Tạo tài khoản"
- Click → Dialog nhập SĐT → Tạo user mới + link `employees.user_id`
- Mật khẩu ban đầu lấy từ branch default

---

## Milestone 3 — Advanced Features

*Nice-to-have — làm nếu còn thời gian*

### 3.1 Holiday Config

**Vấn đề:** `calculate-payroll` dùng `ot_multiplier_weekday` cho tất cả OT, không phân biệt ngày lễ.

**Thêm bảng `holidays`:**
```sql
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(branch_id, date)
);
```

**Settings page:** Admin thêm/xóa ngày lễ.

**calculate-payroll update:** Join `holidays`, dùng `ot_multiplier_holiday` cho ngày lễ.

---

### 3.2 Bulk Import Nhân viên

**Edge Function `bulk-import`:**
- Input: CSV/Excel file (multipart form)
- Parse, validate, tạo users + employees hàng loạt
- Return: `{ success: N, errors: [...] }`

**Admin UI:**
- Nút "Import từ Excel" trong `/admin/employees`
- Download template CSV
- Upload → Preview → Confirm

---

### 3.3 Audit Log

**Bảng `audit_logs` đã có trong schema.**

**Trigger tự động cho các thao tác quan trọng:**
- Approve/reject leave
- Confirm payroll
- Reset password
- Thêm/xóa nhân viên

**Trang `/admin/audit` (optional):** Bảng log với filter theo user, action, date range.

---

### 3.4 Shift Change trong Employee Bottom Nav

**Vấn đề:** Bottom nav hiện chỉ có 5 items (Home, Attendance, Leave, Salary, Profile) — "Đổi ca" không có icon.

**Options:**
- Thêm icon "Đổi ca" vào bottom nav (thành 6 items, có thể hơi chật)
- Hoặc gộp "Nghỉ phép" và "Đổi ca" vào 1 tab "Yêu cầu" với sub-tabs
- Hoặc giữ nguyên (nhân viên vào qua `/shift-change` URL hoặc quick action trên dashboard)

---

## Tóm tắt theo độ ưu tiên

| Tính năng | Milestone | Độ ưu tiên | Ước tính |
|---|---|---|---|
| Code splitting | 1 | 🔴 Cao | 2-3h |
| Salary Preview Edge Function | 1 | 🔴 Cao | 3-4h |
| Leave balance admin UI | 1 | 🔴 Cao | 2-3h |
| Deployment guide | 1 | 🔴 Cao | 1h |
| Export CSV attendance | 2 | 🟡 Trung bình | 2h |
| Export Excel payroll | 2 | 🟡 Trung bình | 2h |
| Roster scheduling | 2 | 🟡 Trung bình | 6-8h |
| Link tài khoản NV cũ | 2 | 🟡 Trung bình | 1-2h |
| Holiday config | 3 | 🟢 Thấp | 4-5h |
| Bulk import | 3 | 🟢 Thấp | 6-8h |
| Audit log UI | 3 | 🟢 Thấp | 3-4h |
| Shift change bottom nav | 3 | 🟢 Thấp | 1h |

**Tổng ước tính Phase 4:**
- Milestone 1: ~9-11h
- Milestone 2: ~12-15h
- Milestone 3: ~14-18h

---

## Quyết định kỹ thuật quan trọng

1. **Lazy loading:** Dùng `React.lazy` + dynamic `import()` — không cần thêm library
2. **Export:** Ưu tiên CSV thuần (không cần library) cho attendance; dùng `xlsx` chỉ nếu cần format Excel thực sự cho payroll
3. **Roster grid:** Tự build bằng CSS grid + Supabase batch upsert — không dùng date grid library để tránh tăng bundle size
4. **Salary preview:** Gọi từ client qua fetch (tương tự calculate-payroll) — không cần realtime subscription
