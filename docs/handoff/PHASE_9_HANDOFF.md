# Phase 9 Handoff – Employee Portal UX

## Tổng quan
- **Mục tiêu:** Cải thiện UX Employee Portal: hiển thị ca hôm nay trên dashboard, thay thế nút QR đơn lẻ bằng grid 4 thao tác nhanh
- **Kết quả:** Hoàn thành 100%
- **Ngày hoàn thành:** 2026-05-21

---

## Tính năng đã hoàn thành

### 1. Card ca làm việc hôm nay

**Mô tả:**
Card hiển thị tên ca và giờ bắt đầu–kết thúc ca hôm nay của nhân viên. Nếu nhân viên đã check-in, hiển thị giờ check-in bên phải. Nếu chưa có ca được gán, hiển thị "Chưa có ca".

**Luồng lookup ca (theo CLAUDE.md):**
1. Query `shift_schedules` (override theo ngày) — ưu tiên cao hơn
2. Nếu không có → fallback về `employee_shift_assignments` (ca tháng mặc định)

**Files thay đổi:**
- `src/features/employee-portal/hooks/useMyEmployee.ts` — thêm `useMyTodayShift` hook + `TodayShift` interface

---

### 2. Grid 4 thao tác nhanh

**Mô tả:**
Thay thế nút "Chấm công QR" đơn lẻ bằng grid 2×2 gồm 4 thao tác nhanh, mỗi button có icon màu riêng:

| Icon | Nhãn | Route | Màu |
|---|---|---|---|
| QrCode | Chấm công | `/checkin` | Cam |
| CalendarDays | Lịch sử | `/attendance` | Xanh dương |
| FileText | Xin nghỉ | `/leave` | Xanh lá |
| ArrowLeftRight | Đổi ca | `/shift-change` | Tím |

**Files thay đổi:**
- `src/features/employee-portal/pages/EmployeeDashboardPage.tsx` — thêm `useMyTodayShift`, card ca hôm nay, grid quick actions, xóa nút QR đơn lẻ

---

## Tính năng chưa hoàn chỉnh hoặc bị bỏ qua

Không có — scope Phase 9 đã hoàn thành 100%.

---

## Known Issues & Technical Debt

- **[DEBT-P9-01]** `useMyTodayShift` thực hiện 2 query riêng biệt (shift_schedules → shift_assignments). Có thể gộp thành 1 query JOIN nhưng Supabase JS client không hỗ trợ OR fallback tốt trong 1 call — 2 query là acceptable.

---

## Checklist QC Test

### Card ca hôm nay
- [ ] Nhân viên đã được gán ca tháng → thấy card "Ca hôm nay: [Tên ca] HH:MM–HH:MM"
- [ ] Nhân viên có `shift_schedules` override hôm nay → hiển thị ca override (không phải ca tháng)
- [ ] Nhân viên chưa được gán ca → thấy "Chưa có ca"
- [ ] Nhân viên đã check-in → bên phải hiển thị "Check-in HH:MM"
- [ ] Nhân viên chưa check-in → bên phải hiển thị "Chưa chấm"

### Grid thao tác nhanh
- [ ] Dashboard hiển thị 4 buttons hàng ngang: Chấm công, Lịch sử, Xin nghỉ, Đổi ca
- [ ] Click "Chấm công" → navigate `/checkin`
- [ ] Click "Lịch sử" → navigate `/attendance`
- [ ] Click "Xin nghỉ" → navigate `/leave`
- [ ] Click "Đổi ca" → navigate `/shift-change`
- [ ] Không còn nút "Chấm công QR" đơn lẻ chiếm full width

---

## Ghi chú cho Phase tiếp theo

- Không có migration hay Edge Function mới trong phase này
- `useMyTodayShift` export từ `useMyEmployee.ts` — nếu cần dùng ở màn hình khác chỉ cần import thêm
