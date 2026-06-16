# Phase 6 Handoff – OT Multiplier Per-Employee

## Tổng quan
- **Mục tiêu:** Cho phép cấu hình hệ số OT ngày thường riêng cho từng nhân viên, thay vì áp dụng đồng đều theo config chi nhánh
- **Kết quả:** Hoàn thành 100%
- **Ngày hoàn thành:** 2026-05-21

---

## Tính năng đã hoàn thành

### OT Multiplier Per-Employee

**Mô tả:**
Admin có thể set hệ số OT ngày thường riêng cho từng nhân viên (VD: nhân viên senior 1.8x thay vì mặc định 1.5x). Khi không set, nhân viên dùng hệ số toàn chi nhánh từ Settings.

**Phạm vi áp dụng:**
- Override chỉ áp dụng cho **OT ngày thường** (weekday)
- OT cuối tuần và ngày lễ vẫn dùng hệ số toàn chi nhánh — đây là legal minimum theo luật lao động

**Luồng:**
1. Admin vào `/admin/employees/:id` → tab "Lương & phụ cấp"
2. Card "Hệ số OT ngày thường" hiển thị giá trị hiện tại (hoặc "Dùng mặc định hệ thống")
3. Click "Chỉnh sửa" → input nhập hệ số (VD: 1.8), để trống = xóa override
4. Click "Lưu" → cập nhật DB, card refresh ngay
5. Click "Xóa override" → đặt lại về null (dùng hệ thống)
6. Khi tính lương (`calculate-payroll`) hoặc xem lương preview (`salary-preview`): nếu nhân viên có override → dùng override, không thì dùng config chi nhánh

**Files thay đổi:**
- `supabase/migrations/20260521000004_employee_ot_multiplier.sql` — thêm cột `ot_multiplier_override NUMERIC(3,1) NULL`
- `src/types/database.ts` — thêm `ot_multiplier_override: number | null` vào `Employee` interface
- `src/features/employees/hooks/useEmployees.ts` — thêm `useSetOTMultiplierOverride` hook
- `src/features/employees/pages/EmployeeDetailPage.tsx` — UI card trong tab "Lương & phụ cấp"
- `supabase/functions/calculate-payroll/index.ts` — fetch + apply override
- `supabase/functions/salary-preview/index.ts` — fetch + apply override

---

## Tính năng chưa hoàn chỉnh hoặc bị bỏ qua

Không có — scope Phase 6 đơn giản và đã hoàn thành 100%.

---

## Known Issues & Technical Debt

- **[DEBT-P6-01]** Override chỉ áp dụng cho weekday OT. Nếu nghiệp vụ thay đổi (VD: cần override cả weekend/holiday per-employee), cần thêm 2 cột nữa và cập nhật edge functions.

---

## Checklist QC Test

- [ ] Vào Employee Detail → tab "Lương & phụ cấp" → thấy card "Hệ số OT ngày thường"
- [ ] Nhân viên chưa set: hiển thị "Dùng mặc định hệ thống"
- [ ] Click "Chỉnh sửa" → nhập 1.8 → Lưu → card hiển thị "1.8x (riêng nhân viên này)"
- [ ] Click "Xóa override" → card trở về "Dùng mặc định hệ thống"
- [ ] Để trống input → Lưu → tương đương xóa override
- [ ] Input < 1.0 → không lưu (validation)
- [ ] Tính lương tháng: nhân viên có OT + override 1.8x → `overtime_pay` cao hơn nhân viên không có override (cùng số giờ OT ngày thường)
- [ ] Salary preview trên dashboard nhân viên cũng phản ánh đúng override

---

## Ghi chú cho Phase tiếp theo

- **Migration cần chạy trước:** `20260521000004_employee_ot_multiplier.sql`
- **Edge Functions cần deploy:**
  - `supabase functions deploy calculate-payroll`
  - `supabase functions deploy salary-preview`
- Các nhân viên hiện tại có `ot_multiplier_override = NULL` → dùng hệ số chi nhánh như cũ, không ảnh hưởng dữ liệu cũ
