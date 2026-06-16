# Testing Phase 6 – OT Multiplier Per-Employee

**QC:** Senior QC (static code review)  
**Ngày test:** 2026-05-21  
**Phạm vi:** Carry-over bugs từ Phase 5 + tính năng mới Phase 6  
**Phương pháp:** Đọc source code, trace logic, không có môi trường Supabase live

---

## Phần 1 — Verify carry-over bugs từ các phase trước

Tất cả bugs từ Phase 1–5 đã được xác nhận fixed hoặc accepted trong các vòng test trước. Phần này chỉ xác nhận các bugs quan trọng vẫn còn hiệu lực sau khi codebase thay đổi trong Phase 6.

| Bug ID | Mô tả | Trạng thái |
|--------|--------|-----------|
| BUG-P5-CRITICAL-01 | `lateCount` ordering trong `calculate-payroll` | ✅ VẪN FIXED — line 156: `const lateCount = ...` trước `latePenalty` |
| BUG-P5-NEW-02 | `special_bonus` trong PayrollPage display | ✅ VẪN FIXED |
| BUG-P4-NEW-01 | Audit log wiring | ✅ VẪN FIXED — hooks không thay đổi |
| BUG-P3-NEW-01 | Password verify | ✅ VẪN FIXED — ProfilePage không thay đổi |
| DEBT-P5-01 | `AuditLog` type thiếu `table_name` | ✅ VẪN FIXED |
| DEBT-P5-02 | `useInsertAuditLog` thiếu `table_name` | ✅ VẪN FIXED |
| DEBT-P5-03 | Dead variable `totalLateMinutes` trong salary-preview | ✅ VẪN FIXED |
| Accepted (BarcodeDetector iOS) | Out of scope | ⏸ ACCEPTED |
| Accepted (nhanvien.csv filename) | Minor UX | ⏸ ACCEPTED |
| L-05 (trigger live verify) | Cần live DB | 🔍 NEEDS-LIVE |

**Lưu ý về `totalLateMinutes` trong `calculate-payroll`:** Biến này vẫn còn ở line 131 nhưng KHÔNG phải dead code — nó được dùng để lưu vào cột `total_late_minutes` trong `payroll_records` cho mục đích lưu trữ lịch sử. Khác với `salary-preview` (nơi variable này không được dùng). Behavior đúng.

---

## Phần 2 — Test tính năng Phase 6: OT Multiplier Per-Employee

### 2.1 Migration

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P6-01 | `20260521000004_employee_ot_multiplier.sql`: `ALTER TABLE employees ADD COLUMN IF NOT EXISTS ot_multiplier_override NUMERIC(3,1) NULL` | ✅ PASS |
| P6-02 | `IF NOT EXISTS` — migration idempotent, an toàn khi chạy lại | ✅ PASS |
| P6-03 | `NULL` default — nhân viên cũ không bị ảnh hưởng, tự động dùng config chi nhánh | ✅ PASS |
| P6-04 | `NUMERIC(3,1)` — precision 3, scale 1 → max value 99.9, đủ cho mọi use case thực tế | ✅ PASS |

---

### 2.2 TypeScript type

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P6-05 | `database.ts`: `interface Employee` có `ot_multiplier_override: number \| null` | ✅ PASS |

---

### 2.3 Hook `useSetOTMultiplierOverride`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P6-06 | Hook định nghĩa trong `useEmployees.ts`, export đúng | ✅ PASS |
| P6-07 | Param: `{ id: string; value: number \| null }` — `null` = xóa override | ✅ PASS |
| P6-08 | Update `employees.ot_multiplier_override` qua Supabase | ✅ PASS |
| P6-09 | `onSuccess`: invalidate `['employee', id]` → card refresh tức thì | ✅ PASS |
| P6-10 | `value = null` → set về null trong DB → nhân viên dùng config chi nhánh | ✅ PASS |

---

### 2.4 UI trong EmployeeDetailPage — tab "Lương & phụ cấp"

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P6-11 | `useSetOTMultiplierOverride` được import và gán vào `setOTMultiplier` | ✅ PASS |
| P6-12 | State `editingOT`, `otInput` được khai báo | ✅ PASS |
| P6-13 | Card "Hệ số OT ngày thường" hiển thị trong tab "salary" | ✅ PASS |
| P6-14 | Khi `ot_multiplier_override == null`: hiển thị "Dùng mặc định hệ thống" | ✅ PASS |
| P6-15 | Khi `ot_multiplier_override != null`: hiển thị `{value}x (riêng nhân viên này)` + nút "Xóa override" | ✅ PASS |
| P6-16 | Nút "Chỉnh sửa" → mode edit, pre-fill `otInput` với giá trị hiện tại (hoặc rỗng nếu null) | ✅ PASS |
| P6-17 | Input `type="number" step="0.1" min="1.0" max="5.0"` | ✅ PASS |
| P6-18 | Validation: `otInput === ''` → `value = null` (xóa override) | ✅ PASS |
| P6-19 | Validation: `value !== null && (isNaN(value) \|\| value < 1.0)` → `return` (không lưu) | ✅ PASS |
| P6-20 | Save: gọi `setOTMultiplier.mutate({ id, value })`, `onSuccess` → `setEditingOT(false)` | ✅ PASS |
| P6-21 | Nút "Hủy" → `setEditingOT(false)` không lưu | ✅ PASS |
| P6-22 | Nút "Xóa override" (inline, không dialog): `setOTMultiplier.mutate({ id, value: null })` ngay lập tức | ⚠️ UX — không có ConfirmDialog, click nhầm xóa luôn. Nhất quán hơn nếu confirm trước. Không phải bug chức năng. |
| P6-23 | Text note: "Hệ số này chỉ áp dụng OT ngày thường. Cuối tuần và ngày lễ vẫn dùng cấu hình hệ thống." | ✅ PASS |

---

### 2.5 Validation gap — upper bound

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P6-24 | HTML `max="5.0"` trên Input field | ✅ UX hint có |
| P6-25 | Save logic chỉ validate `value < 1.0`, KHÔNG validate `value > 5.0` — user có thể gõ 10 hoặc 50 và save thành công | ⚠️ UX — không có upper bound validation trong code. DB `NUMERIC(3,1)` giới hạn tự nhiên ở 99.9, nhưng nhập 10x hay 50x có thể là lỗi data entry và không bị cảnh báo. |

---

### 2.6 `calculate-payroll` Edge Function — áp dụng override

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P6-26 | Employee select thêm `ot_multiplier_override` vào câu query | ✅ PASS |
| P6-27 | `weekdayMultiplier = emp.ot_multiplier_override ?? (config.ot_multiplier_weekday ?? 1.5)` | ✅ PASS |
| P6-28 | Logic ưu tiên: `isHoliday` → holiday multiplier (global); `isWeekend` → weekend multiplier (global); weekday → `weekdayMultiplier` (override hoặc global) | ✅ PASS |
| P6-29 | `lateCount` ordering (BUG-P5-CRITICAL-01) vẫn đúng sau khi thêm Phase 6 code | ✅ PASS |
| P6-30 | `specialBonus`, `hasBonusTable` guard vẫn còn nguyên | ✅ PASS |

---

### 2.7 `salary-preview` Edge Function — áp dụng override

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P6-31 | Employee select thêm `ot_multiplier_override` vào câu query | ✅ PASS |
| P6-32 | `weekdayMultiplier = emp.ot_multiplier_override ?? (config.ot_multiplier_weekday ?? 1.5)` | ✅ PASS |
| P6-33 | Logic ngày thường/cuối tuần/ngày lễ áp dụng đúng như `calculate-payroll` | ✅ PASS |
| P6-34 | `totalLateMinutes` đã bị xóa (DEBT-P5-03 fix) — không có dead code | ✅ PASS |

---

### 2.8 Logic consistency giữa calculate-payroll và salary-preview

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P6-35 | Cả hai function đều dùng cùng `weekdayMultiplier = emp.ot_multiplier_override ?? config.ot_multiplier_weekday` | ✅ PASS |
| P6-36 | Cả hai function đều fetch `ot_multiplier_override` từ `employees` table | ✅ PASS |
| P6-37 | Override scope nhất quán: chỉ weekday, weekend/holiday vẫn global | ✅ PASS |

---

## Phần 3 — Test cases cần live environment

| # | Feature | Cần test |
|---|---------|---------|
| L-01 | **Override không set** | Nhân viên không có override → tính lương dùng `config.ot_multiplier_weekday` |
| L-02 | **Override set = 1.8** | Nhân viên có OT ngày thường → `overtime_pay` dùng 1.8x thay vì 1.5x |
| L-03 | **Override ≠ ảnh hưởng weekend/holiday** | Nhân viên override 1.8x, có OT cuối tuần → weekend OT vẫn dùng 2.0x (global) |
| L-04 | **Xóa override** | Click "Xóa override" → card đổi về "Dùng mặc định hệ thống" ngay |
| L-05 | **Salary preview** | Nhân viên có override → dashboard salary preview phản ánh đúng OT pay |
| L-06 | **Trigger leave_balance** (từ Phase 5) | Tạo nhân viên → `leave_balances` có bản ghi tự động |
| L-07 | **Migration permissions** | `20260521000003_grant_table_permissions.sql` đã chạy → không có "permission denied" |

---

## Phần 4 — Tổng kết

### Kết quả test

| Hạng mục | Số lượng |
|----------|---------|
| Test cases | 37 |
| PASS | 33 |
| UX/warning | 2 (P6-22, P6-25) |
| NEEDS-LIVE | 7 |
| FAIL (bug mới) | 0 |

### Bugs mới phát hiện

**Không có bug mới.** Phase 6 là scope nhỏ, triển khai sạch.

### UX observations (không block ship)

| # | Mô tả | Mức độ |
|---|--------|--------|
| UX-01 | Nút "Xóa override" không có ConfirmDialog — click nhầm xóa ngay | Low |
| UX-02 | Upper bound validation (`value > 5.0`) không được enforce trong code, chỉ là HTML hint | Low |

### Carry-over từ phase trước

| Hạng mục | Trạng thái |
|----------|-----------|
| Tất cả bugs từ Phase 1–5 | ✅ Vẫn fixed |
| Accepted (BarcodeDetector iOS, filename date) | ⏸ Không đổi |
| L-06 (trigger live) | 🔍 Vẫn cần verify |

---

### Verdict

**✅ PASS — Sẵn sàng ship** sau khi hoàn tất deploy checklist.

**Deploy checklist bắt buộc:**
1. Chạy migration `20260521000004_employee_ot_multiplier.sql`
2. `supabase functions deploy calculate-payroll`
3. `supabase functions deploy salary-preview`
4. *(Nếu chưa)* Chạy migration `20260521000001_employee_bonuses.sql`
5. *(Nếu chưa)* Chạy migration `20260521000002_leave_balance_trigger_fix.sql`
6. *(Nếu chưa)* Chạy migration `20260521000003_grant_table_permissions.sql`

**Không có bugs cần fix trước khi ship.**
