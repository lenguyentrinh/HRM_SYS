# Phase 5 Handoff – Hoàn thiện & Nâng cao

## Tổng quan
- **Mục tiêu**: Hoàn thiện các tính năng còn thiếu từ Phase 1–4, nâng cấp logic nghiệp vụ, cải thiện UX
- **Kết quả**: Hoàn thành 100% — 13/13 items (3 milestones)
- **Ngày hoàn thành**: 2026-05-19

---

## Tính năng đã hoàn thành

### 1. Fix bug: Nút "Tính lương" bị disabled sai

**Vấn đề**: Nút "Tính lương" bị disabled ngay cả khi chưa có bản ghi lương nào. Nguyên nhân: `[].every(fn)` trong JavaScript trả về `true` (vacuous truth) khi mảng rỗng, khiến `allConfirmed = true` không đúng.

**Fix**: Thêm guard `hasRecords`:
```tsx
const hasRecords = (records?.length ?? 0) > 0
const allDraft = hasRecords && (records?.every((r) => r.status === 'draft') ?? false)
const allConfirmed = hasRecords && (records?.every((r) => r.status === 'confirmed') ?? false)
```

**File**: `src/features/payroll/pages/PayrollPage.tsx`

**Test**: Chọn tháng chưa có bản ghi lương → nút "Tính lương" phải enabled (không bị disabled).

---

### 2. Thưởng/Phạt đặc biệt (employee_bonuses)

**Mô tả**: Admin có thể thêm/xóa khoản thưởng hoặc phạt đặc biệt cho từng nhân viên theo tháng. Khoản này được tổng hợp vào `gross_salary` khi tính lương.

**Luồng**:
1. Vào `/admin/employees/:id` → tab "Thưởng/Phạt"
2. Chọn tháng, click "Thêm" → form inline: loại (Thưởng/Phạt), số tiền, lý do
3. Save → ghi vào bảng `employee_bonuses`
4. Khi chạy "Tính lương" → Edge Function `calculate-payroll` tổng hợp bonus theo employee_id vào `special_bonus`

**Files**:
- `supabase/migrations/20260521000001_employee_bonuses.sql` — bảng + RLS + cột `special_bonus` trên `payroll_records`
- `src/types/database.ts` — thêm `EmployeeBonus` interface, `special_bonus` vào `PayrollRecord`
- `src/features/payroll/hooks/useEmployeeBonuses.ts` — hooks: list, add, delete
- `src/features/employees/pages/EmployeeDetailPage.tsx` — tab "Thưởng/Phạt" mới
- `supabase/functions/calculate-payroll/index.ts` — cộng `special_bonus` vào gross

**Edge case**: `amount` có thể âm (phạt). Tổng bonuses per employee dùng `SUM` — nhiều khoản cộng dồn.

**Test**:
1. Thêm khoản thưởng 500,000 VND tháng 5/2026 → thấy trong danh sách, tổng hiển thị đúng
2. Thêm khoản phạt -200,000 VND → tổng trừ đi đúng
3. Tính lương tháng 5 → cột `special_bonus` trong bảng lương khớp

---

### 3. Lịch sử lương trong Employee Detail

**Mô tả**: Admin xem lịch sử các tháng lương đã tính của một nhân viên ngay trong `/admin/employees/:id`.

**Tab "Lịch sử lương"**: Bảng gồm tháng, ngày công thực tế, lương cơ bản tính được, OT, thưởng/phạt tổng hợp (attendance_bonus + special_bonus − late_penalty − absent_penalty), gross, net, status badge (draft/confirmed).

**File**: `src/features/employees/pages/EmployeeDetailPage.tsx`

**Test**: Mở employee đã có payroll records → tab "Lịch sử lương" hiển thị đúng dữ liệu.

---

### 4. Audit logging cho các thao tác quan trọng

**Mô tả**: Ghi log vào bảng `audit_logs` cho 3 thao tác: tạo/cập nhật nhân viên, reset mật khẩu, chấm công thủ công.

**Các thao tác được log**:
- `employee_created` — khi tạo nhân viên mới (bao gồm employee_code, full_name)
- `employee_updated` — khi cập nhật thông tin nhân viên
- `password_reset` — khi admin reset mật khẩu nhân viên
- `manual_attendance` — khi admin ghi chấm công thủ công (bao gồm ngày, ca, ghi chú)

**Notification**: Khi chấm công thủ công, nếu nhân viên có `user_id`, gửi notification thông báo cho nhân viên.

**Files**:
- `src/features/employees/hooks/useEmployees.ts` — log employee_created, employee_updated, password_reset
- `src/features/attendance/hooks/useAttendance.ts` — log manual_attendance + notification

**Test**:
1. Tạo nhân viên mới → vào `/admin/audit` → thấy record `employee_created`
2. Reset mật khẩu → thấy record `password_reset`
3. Chấm công thủ công → thấy record `manual_attendance`, nhân viên nhận notification

---

### 5. Export CSV danh sách nhân viên

**Mô tả**: Admin xuất danh sách nhân viên hiện tại (bao gồm filter đang áp dụng) ra file CSV.

**File**: `src/features/employees/pages/EmployeeListPage.tsx`

**Luồng**: Click "Xuất CSV" → query tất cả employees theo filter hiện tại (không phân trang) → tải file `nhan_vien_YYYYMMDD.csv` với UTF-8 BOM (để Excel hiển thị tiếng Việt đúng).

**Cột**: Mã NV, Họ tên, SĐT, Chi nhánh, Loại, Lương cơ bản, Phụ cấp, Trạng thái, Ngày tạo.

**Test**: Lọc nhân viên active → click "Xuất CSV" → file tải về, mở Excel hiển thị đúng tiếng Việt.

---

### 6. Export CSV báo cáo Analytics

**Mô tả**: Export bảng xếp hạng chuyên cần ra CSV.

**File**: `src/features/admin/pages/AnalyticsPage.tsx`

**Cột**: Xếp hạng, Mã NV, Họ tên, Ngày công, Vắng, Trễ (lần), Tỷ lệ (%), Thực nhận.

**Test**: Vào `/admin/analytics` → chọn tháng có dữ liệu → click "Xuất CSV".

---

### 7. OT multiplier đúng loại ngày trong salary-preview

**Mô tả**: Edge Function `salary-preview` trước đây dùng multiplier cố định cho tất cả OT. Đã sửa để áp dụng đúng multiplier theo loại ngày: nghỉ lễ (3.0x) > cuối tuần (2.0x) > ngày thường (1.5x).

**File**: `supabase/functions/salary-preview/index.ts`

**Luồng**: Fetch `holidays` cho tháng → với mỗi record attendance có OT, kiểm tra ngày là holiday/weekend/weekday → áp multiplier từ `payroll_config`.

**Test**: Nhân viên có OT ngày lễ → salary preview hiển thị OT pay cao hơn OT ngày thường.

---

### 8. Trigger seed leave_balance khi tạo nhân viên

**Mô tả**: Khi tạo nhân viên mới, tự động tạo bản ghi `leave_balances` cho năm hiện tại dựa trên `leave_policies` của chi nhánh và loại nhân viên.

**File**: `supabase/migrations/20260521000002_leave_balance_trigger_fix.sql`

**Logic**: Trigger `AFTER INSERT ON employees` → tìm `leave_policies` khớp `branch_id + employee_type` → insert vào `leave_balances` với `ON CONFLICT DO NOTHING`.

**Test**: Tạo nhân viên loại `full_time` → kiểm tra bảng `leave_balances` có record mới cho năm hiện tại.

---

### 9. Clear roster button

**Mô tả**: Nút xóa toàn bộ override lịch ca của một nhân viên trong tháng hiện tại (giữ ca mặc định).

**File**: `src/features/roster/pages/RosterPage.tsx`, `src/features/roster/hooks/useRoster.ts`

**Luồng**: Icon Trash2 ở đầu hàng nhân viên → ConfirmDialog → xóa tất cả `shift_schedules` của nhân viên trong khoảng ngày của tháng.

**Test**: Nhân viên có nhiều override → click Trash → xác nhận → tất cả ô override biến mất, hiển thị lại ca mặc định.

---

## Tính năng chưa hoàn chỉnh hoặc bị bỏ qua

Không có — tất cả 13 items trong scope Phase 5 đã được hoàn thành.

**Ngoài scope** (từ Phase trước, vẫn chưa xử lý):
- BarcodeDetector không hỗ trợ iOS Safari (LIMIT-04 từ Phase 2) — cần polyfill hoặc thư viện thứ 3

---

## Known Issues & Technical Debt

- **[DEBT-01]** Edge Functions `calculate-payroll` và `salary-preview` cần deploy lại sau thay đổi. Lệnh: `supabase functions deploy calculate-payroll && supabase functions deploy salary-preview`
- **[DEBT-02]** Migration `20260521000001_employee_bonuses.sql` cần chạy trên production DB trước khi dùng tính năng Thưởng/Phạt và Tính lương có special_bonus.
- **[DEBT-03]** Migration `20260521000002_leave_balance_trigger_fix.sql` cần chạy để trigger tự động tạo leave_balance. Nhân viên đã tạo trước đó cần seed thủ công nếu chưa có bản ghi.

---

## Checklist QC Test

### Payroll button fix
- [ ] Chọn tháng chưa có bảng lương → nút "Tính lương" enabled, click được
- [ ] Tính lương xong (draft) → nút "Xác nhận tất cả" enabled, nút "Tính lại" enabled
- [ ] Xác nhận tất cả → nút "Tính lại" disabled

### Thưởng/Phạt
- [ ] Mở employee detail → tab "Thưởng/Phạt" hiển thị
- [ ] Thêm thưởng 1,000,000 VND tháng hiện tại → thấy trong danh sách, tổng đúng
- [ ] Thêm phạt -300,000 VND → tổng giảm đúng
- [ ] Xóa khoản thưởng → biến mất khỏi danh sách
- [ ] Tính lương tháng → cột `special_bonus` khớp với tổng bonuses

### Lịch sử lương
- [ ] Employee có payroll records → tab "Lịch sử lương" hiển thị đúng dữ liệu theo tháng

### Audit log
- [ ] Tạo nhân viên mới → `/admin/audit` thấy `employee_created`
- [ ] Cập nhật nhân viên → thấy `employee_updated`
- [ ] Reset mật khẩu → thấy `password_reset`
- [ ] Chấm công thủ công → thấy `manual_attendance` + nhân viên nhận notification

### Export CSV
- [ ] Xuất danh sách nhân viên → file tải về, mở Excel đúng tiếng Việt
- [ ] Xuất báo cáo analytics → file tải về đúng cột

### OT multiplier salary-preview
- [ ] Nhân viên có OT ngày thường 60 phút + OT cuối tuần 60 phút → preview hiển thị OT pay khác nhau cho 2 ngày

### Leave balance trigger
- [ ] Tạo nhân viên mới → `leave_balances` có bản ghi năm hiện tại với `total_paid_days` đúng theo policy

### Clear roster
- [ ] Nhân viên có override → click Trash → ConfirmDialog hiện ra → xác nhận → tất cả override biến mất

---

## Ghi chú cho Phase tiếp theo

- **Migrations cần chạy trước mọi thứ**: `20260521000001_employee_bonuses.sql` và `20260521000002_leave_balance_trigger_fix.sql`
- **Edge Functions cần deploy**: `calculate-payroll` (cộng `special_bonus`) và `salary-preview` (OT multiplier đúng)
- **iOS QR scan** vẫn là vấn đề tồn đọng — nếu ưu tiên mobile, cần xử lý sớm
- `special_bonus` column trong `payroll_records` có DEFAULT 0, an toàn cho records cũ
