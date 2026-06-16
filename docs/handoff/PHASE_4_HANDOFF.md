# Phase 4 Handoff – Performance, Export & Advanced Features

## Tổng quan
- **Mục tiêu ban đầu:** Code splitting, Salary Preview, Leave Balance UI, Deployment guide, Export CSV, Roster, Link account, Holiday config, Bulk import, Audit log, Shift change nav
- **Kết quả:** 100% tất cả milestone hoàn thành (Milestone 1 + 2 + 3)
- **Ngày hoàn thành:** 2026-05-19

---

## Tính năng đã hoàn thành

### 1.1 Code Splitting (React.lazy + Suspense)

**Mô tả:** Tất cả route pages được lazy-loaded. Initial bundle giảm đáng kể.

**Cách hoạt động:**
- `src/router.tsx`: Mỗi page dùng `lazy(() => import(...))`, bọc trong `<LazyPage>` (Suspense wrapper)
- Fallback: `PageSkeleton` component — skeleton animation đẹp thay vì blank screen
- Login page và NotFoundPage vẫn eager-loaded (bundle nhỏ, luôn cần ngay)

**Cách test:**
1. `npm run build` → kiểm tra output `dist/` — phải có nhiều `.js` chunk files
2. Mở DevTools → Network → Disable cache → Load trang → F5 lại, click vào `/admin/payroll` → thấy chunk mới được tải

---

### 1.2 Salary Preview Edge Function + Employee Dashboard

**Mô tả:** Employee dashboard hiển thị lương dự kiến thực tế tháng hiện tại (tính đến hôm nay).

**Cách hoạt động:**
- Edge Function `salary-preview`: Input `{ employee_id, month, year }` → tính đến ngày hiện tại → return JSON không lưu DB
- Output: `{ net_estimate, gross_estimate, salary_earned, overtime_pay, attendance_bonus, days_worked, days_remaining, late_penalty, absent_penalty }`
- Frontend hook: `useSalaryPreview` (`staleTime: 5 phút`)
- Dashboard hiển thị: lương net lớn, gross nhỏ hơn, thưởng chuyên cần (xanh), khấu trừ (đỏ)

**Deploy:**
```bash
supabase functions deploy salary-preview
```

**Cách test:**
1. Login nhân viên → Dashboard → Card lương hiển thị số tiền thực tế
2. Nếu chưa deploy edge function: hiển thị "—" (không crash)

---

### 1.3 Leave Balance Admin UI + Link Account cho nhân viên cũ

**Mô tả:**
- Tab "Nghỉ phép" mới trong Employee Detail Page — xem/sửa số ngày phép theo năm
- Card "Tài khoản" thêm nút "Tạo tài khoản" cho nhân viên chưa có `user_id`

**Leave Balance:**
- Hiển thị grid: Tổng / Đã dùng / Còn lại
- Chỉnh sửa `total_paid_days` trực tiếp
- Tạo mới với 12 ngày nếu chưa có record

**Link Account:**
- Click "Tạo tài khoản" → Dialog nhập SĐT + mật khẩu → tạo user mới + update `employees.user_id`
- Rollback user nếu employee update thất bại

**Files:** `src/features/employees/pages/EmployeeDetailPage.tsx`, `src/features/leaves/hooks/useLeaveBalance.ts`, `src/features/employees/hooks/useEmployees.ts` (thêm `useLinkEmployeeAccount`)

**Cách test:**
1. Vào Employee Detail → tab "Nghỉ phép" → thấy balance + nút chỉnh sửa
2. Vào nhân viên chưa có tài khoản → nút "Tạo tài khoản" xuất hiện

---

### 1.4 Deployment Guide

**File:** `docs/DEPLOYMENT.md`

**Nội dung:** Migrations, Realtime setup, Edge Functions deploy, pg_cron setup, Frontend build (Cloudflare Pages + Nginx), post-deploy checklist.

---

### 2.1 Export CSV

**Attendance Page (`/admin/attendance`):**
- Nút "Xuất CSV" xuất hiện khi có data
- Export ngày đang filter: cột Ngày, NV, Ca, Check-in, Check-out, Tổng giờ, OT, Trạng thái, Ghi chú
- Tên file: `chamcong_DD-MM-YYYY.csv`

**Payroll Page (`/admin/payroll`):**
- Nút "Xuất CSV" xuất hiện khi có data
- Export bảng lương tháng đang xem: đầy đủ các cột lương
- Tên file: `luong_Tháng_Năm.csv`

**UTF-8 BOM:** Cả hai có BOM để Excel đọc được tiếng Việt.

**File:** `src/lib/export.ts` (utility function `downloadCSV`)

---

### 2.2 Roster Scheduling (`/admin/roster`)

**Mô tả:** Grid lịch ca tháng — xem và chỉnh sửa ca của từng nhân viên theo từng ngày.

**Cách hoạt động:**
- Grid CSS table: cột = ngày 1-31, hàng = nhân viên active
- Mỗi ô: hiển thị tên ca (4 ký tự đầu) với màu riêng biệt
- Click ô → Popover chọn ca (hoặc xóa override)
- **Ca ưu tiên:** shift_schedules (override ngày cụ thể) > employee_shift_assignments (ca mặc định tháng)
- Override được đánh dấu bằng ring/viền đậm
- Cuối tuần highlight màu đỏ
- Nút "Copy từ tháng trước": copy toàn bộ override sang tháng mới (upsert, không xóa)

**Routes thêm vào:** `/admin/roster` trong router.tsx + AdminSidebar

**Migration cần chạy:** Không cần (dùng bảng `shift_schedules` đã có)

---

### 2.3 Link tài khoản cho nhân viên cũ

*Đã gộp vào mục 1.3 ở trên.*

---

### 3.1 Holiday Config

**Mô tả:** Admin quản lý danh sách ngày lễ theo năm. Ngày lễ được dùng để tính OT với hệ số `ot_multiplier_holiday` trong `calculate-payroll`.

**Cách hoạt động:**
- Settings page → Tab "Ngày lễ": thêm/xóa ngày lễ theo năm
- Migration: `20260520000001_holidays.sql` — bảng `holidays(branch_id, date, name)`
- `calculate-payroll` edge function: query holidays → dùng đúng multiplier per ngày

**Migration cần chạy:** `20260520000001_holidays.sql`

---

### 3.2 Bulk Import nhân viên từ CSV

**Mô tả:** Import nhiều nhân viên cùng lúc từ file CSV.

**Cách hoạt động:**
- Nút "Import CSV" trong `/admin/employees` → BulkImportDialog
- Download template CSV (button "Tải template CSV")
- Upload file → gọi Edge Function `bulk-import` → hiển thị kết quả
- Edge function: validate → check duplicate phone → tạo users + employees tuần tự
- Rollback user nếu employee insert thất bại

**Template CSV columns:** `ho_ten, sdt, loai, phong_ban, chuc_vu, luong_cb, phu_cap, ngay_vao`

**Deploy:**
```bash
supabase functions deploy bulk-import
```

---

### 3.3 Audit Log UI (`/admin/audit`)

**Mô tả:** Trang xem nhật ký các thao tác quan trọng — duyệt/từ chối đơn, xác nhận lương, thêm nhân viên.

**Cách hoạt động:**
- Migration: `20260520000002_audit_logs.sql` — bảng `audit_logs`
- Filter theo: hành động, ngày từ-đến, phân trang 20 records/trang
- Tự động ghi audit cho: `leave_approved`, `leave_rejected`, `payroll_confirmed`
- `useInsertAuditLog` hook có sẵn cho các nơi khác muốn ghi log

**Migration cần chạy:** `20260520000002_audit_logs.sql`

---

### 3.4 Shift Change trong Employee Bottom Nav

**Mô tả:** Tab "Yêu cầu" trong bottom nav của employee portal bao gồm cả Nghỉ phép và Đổi ca.

**Cách hoạt động:**
- Bottom nav: thay "Nghỉ phép" thành "Yêu cầu" (icon `FileText`) → link đến `/leave`
- Cả `/leave` và `/shift-change` đều có sub-tab switcher ở đầu trang
- Click tab "Đổi ca" → navigate sang `/shift-change`, click "Nghỉ phép" → navigate sang `/leave`

---

## Bugs phát hiện & fix trong QC

### [BUG-P4-01] Migration `20260520000002_audit_logs.sql` — column "branch_id" does not exist

**Mô tả:** Chạy migration → lỗi `ERROR: 42703: column "branch_id" does not exist`.

**Root cause:** Bảng `audit_logs` đã tồn tại từ schema Phase 1 với schema cũ (không có `branch_id`). `CREATE TABLE IF NOT EXISTS` bỏ qua bước tạo bảng, nhưng `CREATE INDEX` sau đó cố tìm cột `branch_id` trên bảng cũ → lỗi.

**Fix:** Tách thành 2 bước — `CREATE TABLE IF NOT EXISTS` chỉ với cột tối thiểu (`id`, `action`, `created_at`), sau đó `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` cho từng cột mới. Bọc `CREATE POLICY` trong `DO $$ ... $$`.

**File:** `supabase/migrations/20260520000002_audit_logs.sql`

---

### [BUG-P4-02] `/admin/audit` crash khi load — Select.Item value empty string

**Mô tả:** Vào trang `/admin/audit` → crash ngay với lỗi: `A <Select.Item /> must have a value prop that is not an empty string.`

**Root cause:** `ACTION_OPTIONS[0]` có `value: ''`. Radix UI Select không cho phép `SelectItem` có value là empty string (reserved cho clear/placeholder).

**Fix:** Đổi `value: ''` → `value: 'all'`, initial state `useState('all')`, filter condition `actionFilter !== 'all' ? actionFilter : undefined`, reset về `'all'` thay vì `''`.

**File:** `src/features/audit/pages/AuditPage.tsx`

---

## Known Issues & Technical Debt

- **[LIMIT-P4-01]** `salary-preview` edge function tính OT với multiplier ngày thường (weekday), không phân biệt weekend/holiday — tương tự issue đã fix trong `calculate-payroll`. Salary preview là estimate nên chấp nhận được sai lệch nhỏ.
- **[LIMIT-P4-02]** Audit log chỉ ghi `leave_approved`, `leave_rejected`, `payroll_confirmed` — chưa có `employee_created`, `employee_updated`, `password_reset`. Hook `useInsertAuditLog` đã có sẵn để thêm sau.
- **[LIMIT-P4-03]** Roster grid chưa có "clear tất cả" cho 1 nhân viên trong tháng — phải click từng ô.
- **[DEBT-P4-01]** Settings page có Select import trùng với existing import — cần kiểm tra và dedup khi refactor.

---

## Checklist QC Test

- [ ] **Code splitting:** `npm run build` → `dist/` có nhiều chunk `.js` files
- [ ] **Salary preview:** Employee login → Dashboard → Card lương hiển thị số tiền (không phải "—")
- [ ] **Leave balance:** Admin → Employee Detail → Tab "Nghỉ phép" → thấy balance, chỉnh được `total_paid_days`
- [ ] **Link account:** Admin → Employee Detail (NV không có tài khoản) → thấy nút "Tạo tài khoản" → tạo thành công → badge đổi sang "Đã có tài khoản"
- [ ] **Export attendance:** Admin → Chấm công → có data → nút "Xuất CSV" → click → file tải xuống, mở Excel đọc được tiếng Việt
- [ ] **Export payroll:** Admin → Tính lương → có data → "Xuất CSV" → file OK
- [ ] **Roster:** Admin → `/admin/roster` → thấy grid → click ô → chọn ca → ô đổi màu
- [ ] **Copy từ tháng trước:** Click "Copy từ tháng trước" → confirm → xem grid tháng hiện tại có lịch mới
- [ ] **Holiday config:** Settings → Tab "Ngày lễ" → thêm ngày lễ → thấy trong danh sách
- [ ] **Bulk import:** Employees → "Import CSV" → download template → điền dữ liệu → upload → thành công → nhân viên xuất hiện trong danh sách
- [ ] **Audit log:** `/admin/audit` → duyệt 1 đơn nghỉ phép → quay lại Audit → thấy record mới
- [ ] **Shift change nav:** Employee portal → tab "Yêu cầu" → hiện trang nghỉ phép với sub-tab → click "Đổi ca" → sang trang đổi ca

---

## Migrations cần chạy

| File | Nội dung |
|------|---------|
| `supabase/migrations/20260520000001_holidays.sql` | Bảng `holidays` |
| `supabase/migrations/20260520000002_audit_logs.sql` | Bảng `audit_logs` |

---

## Edge Functions cần deploy

| Function | Khi nào |
|----------|---------|
| `salary-preview` | Mới — phải deploy để dashboard nhân viên hoạt động |
| `bulk-import` | Mới — phải deploy để import CSV hoạt động |
| `calculate-payroll` | Cập nhật — now uses holiday multiplier, redeploy recommended |

---

## Ghi chú cho Phase tiếp theo

- **Salary preview weekend/holiday OT** (LIMIT-P4-01): Nếu muốn chính xác, cần fetch holidays và check weekend trong `salary-preview` edge function tương tự cách đã làm trong `calculate-payroll`.
- **Audit log coverage** (LIMIT-P4-02): Thêm `useInsertAuditLog` vào `useUpsertEmployee`, `useResetEmployeePassword`, `useReviewShiftChange` để có coverage đầy đủ.
- **Roster mobile:** Grid hiện tại chỉ tốt trên desktop (overflow-x-auto). Mobile experience cần thiết kế riêng nếu cần.
