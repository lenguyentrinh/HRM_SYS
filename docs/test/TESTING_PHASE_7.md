# Testing Phase 7 – Analytics Quỹ Lương Đa Tháng

**QC:** Senior QC (static code review)  
**Ngày test:** 2026-05-21  
**Phạm vi:** Carry-over bugs từ Phase 6 + tính năng mới Phase 7  
**Phương pháp:** Đọc source code, trace logic, không có môi trường Supabase live

---

## Phần 1 — Verify carry-over bugs từ các phase trước

Tất cả bugs từ Phase 1–6 đã được xác nhận fixed hoặc accepted trong các vòng test trước. Phần này chỉ xác nhận các bugs quan trọng vẫn còn hiệu lực sau khi codebase thay đổi trong Phase 7.

| Bug ID | Mô tả | Trạng thái |
|--------|--------|-----------|
| BUG-P5-CRITICAL-01 | `lateCount` ordering trong `calculate-payroll` | ✅ VẪN FIXED — Phase 7 không chạm file này |
| BUG-P5-NEW-01 | `.replace(/ /g, '_')` regex trong AnalyticsPage | ✅ VẪN FIXED — line 246: `label.replace(/ /g, '_')` dùng regex |
| BUG-P5-NEW-02 | `special_bonus` trong PayrollPage display | ✅ VẪN FIXED — Phase 7 không chạm PayrollPage |
| BUG-P4-NEW-01 | Audit log wiring | ✅ VẪN FIXED — Phase 7 không thêm/sửa hooks |
| BUG-P3-NEW-01 | Password verify trong ProfilePage | ✅ VẪN FIXED — Phase 7 không chạm ProfilePage |
| DEBT-P5-01 | `AuditLog` type thiếu `table_name` | ✅ VẪN FIXED |
| DEBT-P5-02 | `useInsertAuditLog` thiếu `table_name` | ✅ VẪN FIXED |
| DEBT-P5-03 | Dead variable `totalLateMinutes` trong salary-preview | ✅ VẪN FIXED — Phase 7 không chạm file này |
| UX-01 (P6) | Nút "Xóa override" không có ConfirmDialog | ⏸ ACCEPTED — không thay đổi |
| UX-02 (P6) | Upper bound validation OT multiplier | ⏸ ACCEPTED — không thay đổi |
| Accepted (BarcodeDetector iOS) | Out of scope | ⏸ ACCEPTED |
| Accepted (nhanvien.csv filename) | Minor UX | ⏸ ACCEPTED |
| L-06 (trigger leave_balance) | Cần live DB | 🔍 VẪN NEEDS-LIVE |

**Phạm vi thay đổi Phase 7:** Chỉ có 1 file thay đổi — `src/features/admin/pages/AnalyticsPage.tsx`. Không có migration mới, không có Edge Function mới. Mọi carry-over từ Phase 1–6 đều không bị ảnh hưởng.

---

## Phần 2 — Test tính năng Phase 7: Biểu đồ xu hướng quỹ lương 6 tháng

### 2.1 Interface & data types

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P7-01 | `TrendPoint` interface định nghĩa: `{ label: string; month: number; year: number; total: number }` | ✅ PASS |
| P7-02 | `label` format: `'${month}/${year}'` — đúng theo yêu cầu hiển thị MM/YYYY | ✅ PASS |

---

### 2.2 Hook `usePayrollTrend`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P7-03 | Hook nhận `branchId: string \| undefined`, return early nếu không có | ✅ PASS |
| P7-04 | Bước 1: query `employees` lấy `id` theo `branch_id` | ✅ PASS |
| P7-05 | Bước 2: vòng lặp `i = 5 downto 0` → tháng hiện tại là i=0, 5 tháng trước là i=5 | ✅ PASS — thứ tự thời gian đúng |
| P7-06 | Mỗi tháng: query `payroll_records` filter `employee_id IN (ids)`, `month`, `year`, `status = 'confirmed'` | ✅ PASS |
| P7-07 | Cộng tổng `net_salary` của tất cả bảng lương đã confirmed trong tháng | ✅ PASS |
| P7-08 | Tháng không có bảng lương confirmed → `total = 0` (không throw error, không undefined) | ✅ PASS — `reduce` với initial `0` |
| P7-09 | `hasTrend = trend.some((p) => p.total > 0)` — guard hiển thị biểu đồ | ✅ PASS |
| P7-10 | `enabled: !!branchId && employeeIds.length > 0` — không query khi chưa có dữ liệu | ✅ PASS |
| P7-11 | DEBT-P7-01 confirm: 6 query riêng biệt (1 per tháng) thay vì 1 query GROUP BY month/year | ⚠️ DEBT — nhất quán với DEBT-P7-01 đã ghi nhận trong handoff. Scale nhỏ (~50 NV) không ảnh hưởng, nhưng cần refactor nếu scale |

---

### 2.3 Observation — Employee filter trong `usePayrollTrend`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P7-12 | `usePayrollTrend` query `employees` không filter `status = 'active'` | ⚠️ OBSERVATION — nhân viên đã nghỉ việc (`status != 'active'`) vẫn được include trong danh sách employee_ids. Tuy nhiên vì query chỉ lấy `payroll_records` đã confirmed, lương lịch sử của nhân viên đã nghỉ vẫn là dữ liệu hợp lệ và nên được tính vào xu hướng quỹ lương. Behavior này là **đúng về mặt nghiệp vụ** — quỹ lương thực tế bao gồm cả nhân viên đã nghỉ trong tháng đó. Không phải bug. |
| P7-13 | `useAnalyticsData` filter `status = 'active'` khi query employees — nhất quán với mục đích: phân tích hiện tại vs xu hướng lịch sử | ✅ Hai hook có mục đích khác nhau, behavior nhất quán với mục đích tương ứng |

---

### 2.4 Component `SalaryTrendChart`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P7-14 | Component nhận `points: TrendPoint[]`, render SVG tùy chỉnh (không dùng thư viện ngoài) | ✅ PASS |
| P7-15 | SVG dimensions: `width=560, height=160`, padding left=72 (cho trục Y) | ✅ PASS |
| P7-16 | `maxVal = Math.max(...points.map(p => p.total), 1)` — guard chia cho 0 khi tất cả total=0 | ✅ PASS — `Math.max(..., 1)` đảm bảo `maxVal >= 1` |
| P7-17 | Trục Y: 3 mốc (0, `maxVal/2`, `maxVal`) được format bằng `formatCurrency` | ✅ PASS |
| P7-18 | Line path: `M x0,y0 L x1,y1 ... L xn,yn` — đúng thứ tự thời gian trái sang phải | ✅ PASS |
| P7-19 | Gradient fill: `defs > linearGradient id="trendGrad"` với stop colors | ✅ PASS |
| P7-20 | Điểm tròn (`<circle>`) tại mỗi data point | ✅ PASS |
| P7-21 | Nhãn tháng (`label`) dưới mỗi điểm | ✅ PASS |
| P7-22 | `id="trendGrad"` trong SVG — nếu có nhiều instance `SalaryTrendChart` trên cùng trang, ID conflict trong DOM. Hiện tại chỉ có 1 instance trên AnalyticsPage → không ảnh hưởng | ✅ PASS (scope hiện tại) |
| P7-23 | `SalaryTrendChart` chỉ render khi `hasTrend === true` — không hiển thị biểu đồ trống | ✅ PASS |

---

### 2.5 Điều kiện hiển thị section xu hướng

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P7-24 | Section "Xu hướng quỹ lương 6 tháng" chỉ render khi `hasTrend && trend.length > 0` | ✅ PASS |
| P7-25 | Tất cả 6 tháng đều không có payroll confirmed → `hasTrend = false` → section ẩn hoàn toàn | ✅ PASS |
| P7-26 | Ít nhất 1 tháng có payroll confirmed → `hasTrend = true` → section hiển thị | ✅ PASS |
| P7-27 | Tháng không có payroll confirmed → điểm tương ứng = 0 trên biểu đồ (không bị bỏ qua) | ✅ PASS |

---

## Phần 3 — Test tính năng Phase 7: Cơ cấu quỹ lương tháng

### 3.1 Mở rộng `useAnalyticsData` select

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P7-28 | Select thêm các trường: `salary_earned, overtime_pay, allowance, attendance_bonus, special_bonus, late_penalty, absent_penalty, bhxh_employee, tax_amount` | ✅ PASS |
| P7-29 | `special_bonus` cast: `(p.special_bonus as number \| null) ?? 0` — xử lý TypeScript infer `unknown` từ Supabase select | ✅ PASS — cast đúng, không unsafe |
| P7-30 | `payrollStats.breakdown` tổng cộng từ tất cả bảng lương `status = 'confirmed'` của tháng | ✅ PASS |
| P7-31 | `breakdown` chỉ được tính khi `payrollStats` không null (có payroll confirmed) | ✅ PASS |

---

### 3.2 Component `BreakdownRow`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P7-32 | `BreakdownRow` nhận `label: string, value: number, isDeduction?: boolean` | ✅ PASS |
| P7-33 | Return `null` khi `value === 0` — tự ẩn mà không cần conditional ở caller | ✅ PASS |
| P7-34 | `isDeduction = true` → format màu đỏ / dấu trừ | ✅ PASS |
| P7-35 | `isDeduction = false` (default) → format màu xanh / dấu cộng | ✅ PASS |

---

### 3.3 UI cơ cấu lương — Khoản cộng

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P7-36 | "Lương theo ngày công" → `breakdown.salary_earned` — luôn hiển thị khi > 0 | ✅ PASS |
| P7-37 | "OT" → `breakdown.overtime_pay` — ẩn khi = 0 | ✅ PASS |
| P7-38 | "Phụ cấp" → `breakdown.allowance` — ẩn khi = 0 | ✅ PASS |
| P7-39 | "Thưởng chuyên cần" → `breakdown.attendance_bonus` — ẩn khi = 0 | ✅ PASS |
| P7-40 | "Thưởng đặc biệt" → `breakdown.special_bonus` — có 2 lớp guard: `BreakdownRow` tự ẩn khi `value=0` VÀ caller có thêm `{data.payrollStats.breakdown.special_bonus > 0 && <BreakdownRow ... />}` | ✅ PASS — redundant guard, không sai |

---

### 3.4 UI cơ cấu lương — Khoản trừ

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P7-41 | "Phạt đi trễ" → `breakdown.late_penalty`, `isDeduction=true` | ✅ PASS |
| P7-42 | "Phạt vắng" → `breakdown.absent_penalty`, `isDeduction=true` | ✅ PASS |
| P7-43 | "BHXH nhân viên đóng" → `breakdown.bhxh_employee`, `isDeduction=true` | ✅ PASS |

---

### 3.5 Điều kiện hiển thị section cơ cấu

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P7-44 | Section "Cơ cấu quỹ lương" chỉ hiển thị khi `payrollStats != null` (có payroll confirmed tháng đó) | ✅ PASS |
| P7-45 | Chọn tháng không có payroll confirmed → `payrollStats = null` → section ẩn hoàn toàn | ✅ PASS |
| P7-46 | Tiêu đề section format đúng: "Cơ cấu quỹ lương tháng X/YYYY" theo tháng đang chọn | ✅ PASS |

---

## Phần 4 — Test cases cần live environment

| # | Feature | Cần test |
|---|---------|---------|
| L-01 | **Trend chart hiển thị** | Vào `/admin/analytics` với chi nhánh có payroll confirmed → thấy section xu hướng |
| L-02 | **Trend chart ẩn** | Branch không có payroll confirmed nào trong 6 tháng → section ẩn hoàn toàn |
| L-03 | **Điểm = 0 trên chart** | Tháng không có payroll confirmed → điểm tương ứng nằm ở đáy biểu đồ (y=0) |
| L-04 | **Cơ cấu hiển thị đúng** | Chọn tháng có payroll confirmed → thấy cơ cấu với 2 cột |
| L-05 | **Thưởng đặc biệt ẩn/hiện** | Tháng không có special_bonus → dòng không hiện; tháng có → hiện |
| L-06 | **Cơ cấu ẩn** | Chọn tháng chưa có payroll confirmed → không hiện cơ cấu |
| L-07 | **Trigger leave_balance** (từ Phase 5) | Tạo nhân viên mới → `leave_balances` có bản ghi tự động |
| L-08 | **Migration permissions** | Đảm bảo `20260521000003_grant_table_permissions.sql` đã chạy — không có "permission denied" |

---

## Phần 5 — Tổng kết

### Kết quả test

| Hạng mục | Số lượng |
|----------|---------|
| Test cases | 46 |
| PASS | 42 |
| DEBT (xác nhận từ handoff) | 1 (P7-11) |
| OBSERVATION (không phải bug) | 2 (P7-12, P7-22) |
| NEEDS-LIVE | 8 |
| FAIL (bug mới) | 0 |

### Bugs mới phát hiện

**Không có bug mới.** Phase 7 là scope nhỏ (1 file thay đổi, không có migration/Edge Function), triển khai sạch.

### Observations (không block ship)

| # | Mô tả | Mức độ |
|---|--------|--------|
| OBS-01 | `usePayrollTrend` không filter `status='active'` trên employees — behavior đúng về nghiệp vụ (quỹ lương lịch sử tính cả NV đã nghỉ), nhưng khác với `useAnalyticsData`. Không phải bug | Info |
| OBS-02 | `id="trendGrad"` trong SVG — nếu render nhiều instance `SalaryTrendChart` trong tương lai, ID bị conflict. Hiện tại chỉ 1 instance → safe | Low |
| OBS-03 | "Thưởng đặc biệt" có 2 lớp guard redundant (trong `BreakdownRow` và trong caller) — không sai, chỉ hơi thừa | Info |

### Carry-over từ phase trước

| Hạng mục | Trạng thái |
|----------|-----------|
| Tất cả bugs từ Phase 1–6 | ✅ Vẫn fixed |
| UX-01, UX-02 từ Phase 6 | ⏸ Accepted, không thay đổi |
| Accepted (BarcodeDetector iOS, filename date) | ⏸ Không đổi |
| L-07 (trigger leave_balance live) | 🔍 Vẫn cần verify |

---

### Verdict

**✅ PASS — Sẵn sàng ship**

**Deploy checklist Phase 7:**
1. Không có migration mới cần chạy
2. Không có Edge Function mới cần deploy
3. *(Nếu chưa từ Phase 5–6)* Chạy các migration: `20260521000001_employee_bonuses.sql`, `20260521000002_leave_balance_trigger_fix.sql`, `20260521000003_grant_table_permissions.sql`, `20260521000004_employee_ot_multiplier.sql`
4. *(Nếu chưa từ Phase 6)* Deploy Edge Functions: `calculate-payroll`, `salary-preview`

**Không có bugs cần fix trước khi ship.**
