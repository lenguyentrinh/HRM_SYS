# Phase 7 Handoff – Analytics Quỹ Lương Đa Tháng

## Tổng quan
- **Mục tiêu:** Thêm biểu đồ xu hướng quỹ lương 6 tháng và phân tích cơ cấu quỹ lương tháng vào trang Analytics
- **Kết quả:** Hoàn thành 100%
- **Ngày hoàn thành:** 2026-05-21

---

## Tính năng đã hoàn thành

### 1. Biểu đồ xu hướng quỹ lương 6 tháng

**Mô tả:**
Biểu đồ đường hiển thị tổng quỹ lương thực nhận (net_salary) của 6 tháng gần nhất, chỉ tính bảng lương đã xác nhận (`status = 'confirmed'`). Mỗi điểm trên biểu đồ hiển thị nhãn tháng và giá trị tổng.

**Luồng:**
1. Hook `usePayrollTrend` lấy danh sách `employee_id` của chi nhánh
2. Với mỗi trong 6 tháng (từ 5 tháng trước đến hiện tại): query `payroll_records` lọc theo `employee_id IN (...)`, `month`, `year`, `status = 'confirmed'`
3. Cộng tổng `net_salary` → tạo array `TrendPoint[]` theo thứ tự thời gian
4. Component `SalaryTrendChart` render SVG tùy chỉnh (không dùng thư viện ngoài): gradient fill, line path, điểm tròn, nhãn tháng, trục Y với 3 mốc (0, max/2, max)
5. Biểu đồ chỉ hiển thị khi có ít nhất 1 tháng có dữ liệu (`hasTrend`)

**Files thay đổi:**
- `src/features/admin/pages/AnalyticsPage.tsx` — thêm `TrendPoint` interface, `usePayrollTrend` hook, `SalaryTrendChart` component

### 2. Cơ cấu quỹ lương tháng

**Mô tả:**
Card hiển thị phân tích chi tiết quỹ lương tháng đang chọn: tách thành 2 cột "Khoản cộng" và "Khoản trừ". Chỉ hiển thị khi có bảng lương xác nhận.

**Các khoản hiển thị:**
- Khoản cộng: Lương theo ngày công, OT, Phụ cấp, Thưởng chuyên cần, Thưởng đặc biệt (chỉ hiện khi > 0)
- Khoản trừ: Phạt đi trễ, Phạt vắng, BHXH nhân viên đóng

**Luồng:**
1. `useAnalyticsData` mở rộng select từ `payroll_records` để lấy thêm: `salary_earned`, `overtime_pay`, `allowance`, `attendance_bonus`, `special_bonus`, `late_penalty`, `absent_penalty`, `bhxh_employee`, `tax_amount`
2. `payrollStats.breakdown` là tổng cộng của các trường trên từ tất cả bảng lương đã xác nhận
3. Component `BreakdownRow` render từng dòng — tự ẩn nếu `value === 0`

**Files thay đổi:**
- `src/features/admin/pages/AnalyticsPage.tsx` — mở rộng select, thêm `breakdown` vào `payrollStats`, thêm UI cơ cấu lương

---

## Tính năng chưa hoàn chỉnh hoặc bị bỏ qua

Không có — scope Phase 7 đã hoàn thành 100%.

---

## Known Issues & Technical Debt

- **[DEBT-P7-01]** `usePayrollTrend` thực hiện 6 query riêng biệt (1 per tháng) thay vì 1 query duy nhất group by month/year. Với dữ liệu nhỏ (~50 NV) không ảnh hưởng performance, nhưng nếu scale lên cần refactor thành 1 query.

---

## Checklist QC Test

- [ ] Vào `/admin/analytics` → thấy section "Xu hướng quỹ lương 6 tháng" (nếu có bảng lương đã confirmed)
- [ ] Biểu đồ hiển thị đúng 6 tháng theo thứ tự thời gian từ trái sang phải (MM/yyyy)
- [ ] Các tháng chưa có bảng lương confirmed → điểm = 0 trên biểu đồ
- [ ] Chọn tháng có bảng lương confirmed → thấy section "Cơ cấu quỹ lương tháng X/YYYY"
- [ ] Cơ cấu hiển thị đúng 2 cột: Khoản cộng / Khoản trừ
- [ ] "Thưởng đặc biệt" chỉ hiện khi tổng > 0
- [ ] Chọn tháng chưa có bảng lương confirmed → không hiện cơ cấu (null)
- [ ] Biểu đồ ẩn hoàn toàn khi tất cả 6 tháng đều chưa có bảng lương confirmed

---

## Ghi chú cho Phase tiếp theo

- Không có migration hay Edge Function mới trong phase này
- `special_bonus` được cast sang `number | null` trong breakdown vì TypeScript infer type là `unknown` từ Supabase select — xem `src/features/admin/pages/AnalyticsPage.tsx:131`
