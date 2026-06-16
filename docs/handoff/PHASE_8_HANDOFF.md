# Phase 8 Handoff – Export Đơn Nghỉ Phép + Settings Phụ Cấp Tab

## Tổng quan
- **Mục tiêu:** Thêm xuất CSV cho đơn nghỉ phép và tab cấu hình phụ cấp mặc định trong Settings
- **Kết quả:** Hoàn thành 100%
- **Ngày hoàn thành:** 2026-05-21

---

## Tính năng đã hoàn thành

### 1. Export CSV đơn nghỉ phép

**Mô tả:**
Admin có thể xuất danh sách đơn nghỉ phép ra file CSV, áp dụng đúng filter trạng thái đang chọn.

**Luồng:**
1. Vào `/admin/leaves`
2. Chọn filter trạng thái (Tất cả / Chờ duyệt / Đã duyệt / Từ chối)
3. Khi có ít nhất 1 đơn trong danh sách → nút "Xuất CSV" xuất hiện ở PageHeader
4. Click → tải về file `don_nghi_phep_<trang_thai>.csv`
5. File có UTF-8 BOM để Excel đọc đúng tiếng Việt
6. Cột: STT, Mã NV, Họ tên, Loại nghỉ, Từ ngày, Đến ngày, Số ngày, Lý do, Trạng thái

**Files thay đổi:**
- `src/features/leaves/pages/LeavePage.tsx` — thêm `Download` icon, `STATUS_LABELS`, `handleExportCSV`, nút xuất trong PageHeader `actions`

---

### 2. Settings tab Phụ cấp

**Mô tả:**
Super Admin có thể cấu hình mức phụ cấp mặc định theo loại nhân viên (fulltime / parttime). Đây là mức tham khảo — không tự động áp dụng cho nhân viên hiện tại. Phụ cấp thực tế của từng nhân viên vẫn được set riêng trong hồ sơ.

**Luồng:**
1. Vào `/admin/settings` → tab "Phụ cấp"
2. Thấy form 2 field: Toàn thời gian (₫/tháng) và Bán thời gian (₫/tháng)
3. Nhập giá trị → "Lưu" → cập nhật `branches.default_allowance_fulltime` / `default_allowance_parttime`
4. Note giải thích rõ đây chỉ là mặc định tham khảo, không tự apply

**Files thay đổi:**
- `supabase/migrations/20260521000005_branch_default_allowance.sql` — thêm 2 cột vào `branches`
- `src/types/database.ts` — thêm `default_allowance_fulltime: number` và `default_allowance_parttime: number` vào `Branch` interface
- `src/features/settings/hooks/useSettings.ts` — thêm `useAllowanceDefaults` và `useUpdateAllowanceDefaults`
- `src/features/settings/pages/SettingsPage.tsx` — thêm `AllowanceTab` component và TabsTrigger/TabsContent "allowance"

---

## Tính năng chưa hoàn chỉnh hoặc bị bỏ qua

- **Auto-apply khi tạo nhân viên mới:** Khi admin thêm nhân viên mới, allowance không tự pre-fill từ default. Đây là scope chưa làm — admin vẫn phải nhập tay trong form tạo nhân viên.

---

## Known Issues & Technical Debt

- **[LIMIT-P8-01]** `default_allowance_fulltime/parttime` chỉ lưu giá trị mặc định tham khảo, không tự động áp dụng cho nhân viên hiện tại hay nhân viên mới. Nếu cần auto-fill, phải cập nhật `useUpsertEmployee` để query `branches` khi tạo mới.

---

## Checklist QC Test

### Export CSV
- [ ] Vào `/admin/leaves` → khi có đơn trong danh sách → thấy nút "Xuất CSV" ở góc trên phải
- [ ] Filter "Chờ duyệt" → chỉ thấy đơn pending → Xuất CSV → file chỉ chứa đơn pending
- [ ] Filter "Tất cả" → Xuất CSV → file tên `don_nghi_phep_all.csv`
- [ ] Không có đơn nào (list rỗng) → không hiện nút Xuất CSV
- [ ] Mở file bằng Excel → tiếng Việt hiển thị đúng (UTF-8 BOM)
- [ ] Cột "Loại nghỉ" hiển thị tiếng Việt (VD: "Có lương", không phải "paid")
- [ ] Cột "Trạng thái" hiển thị tiếng Việt (VD: "Chờ duyệt", không phải "pending")

### Settings Phụ cấp Tab
- [ ] Vào `/admin/settings` → thấy tab "Phụ cấp" giữa "Cấu hình lương" và "Chính sách nghỉ phép"
- [ ] Tab hiển thị form 2 field: Toàn thời gian + Bán thời gian
- [ ] Nhập 500000 cho fulltime → Lưu → toast "Đã lưu mức phụ cấp mặc định"
- [ ] Reload trang → giá trị vẫn giữ nguyên
- [ ] Nút Lưu disabled khi form chưa thay đổi (isDirty = false)
- [ ] Note giải thích hiển thị bên dưới form

---

## Ghi chú cho Phase tiếp theo

- **Migration cần chạy:** `20260521000005_branch_default_allowance.sql`
- Không có Edge Function mới
- `Branch` interface đã cập nhật — nếu có query `branches` ở nơi khác cần chọn thêm 2 cột mới nếu cần dùng
