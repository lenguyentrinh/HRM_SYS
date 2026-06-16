# PHASE 2 HANDOFF

**Ngày hoàn thành:** 2026-05-18  
**Build status:** ✅ Clean (0 TypeScript errors, 0 ESLint blocking errors)

---

## Tổng quan

Phase 2 triển khai toàn bộ hệ thống chấm công (QR + thủ công), lịch sử chấm công, yêu cầu đổi ca, và cổng QR cho tablet. Đồng thời fix toàn bộ 8 bugs được phát hiện trong Phase 1 QC report.

---

## Fixes từ Phase 1

| Bug | Fix |
|---|---|
| [BUG-01] No debounce search | `useEffect` + `setTimeout(300ms)` trong `EmployeeListPage` |
| [BUG-03] Session TTL reset on state change | `partialize` đọc `expiresAt` hiện tại nếu cùng userId, không tạo mới |
| [BUG-04] FK error check fragile | Đổi sang `(err as {code?}).code === '23503'` |
| [BUG-06] Topbar không hiện user info | Hiện `phone · roleLabel` thay vì chỉ roleLabel |
| [BUG-07] No 404 route | Thêm `{ path: '*', element: <NotFoundPage /> }` |
| [BUG-08] Dashboard hiện role thay vì tên | Dùng `useMyEmployee` để lấy `full_name` |
| [TYPE-01] User interface thiếu phone | Thêm `phone: string` vào interface User |
| [DEBT-NEW-01] phoneToEmail dead code | Xóa khỏi `utils.ts` |

---

## Tính năng đã hoàn thành

### Admin: Bảng chấm công (`/admin/attendance`)

**Luồng hoạt động:**
1. Admin chọn ngày (date picker, default hôm nay)
2. Lọc theo ca, trạng thái
3. Bảng hiển thị: Nhân viên, Ca, Check-in, Check-out, Tổng giờ, Trạng thái, Ghi chú
4. Stat cards: Có mặt / Đi trễ / Vắng mặt
5. Nút "Chấm thủ công" → dialog chọn NV, ca, giờ, lý do

**Chấm công thủ công:**
- Form: nhân viên, ca, ngày, giờ check-in, giờ check-out (tùy chọn), lý do (bắt buộc)
- Tự tính status (present/late) dựa trên `grace_period_minutes` của ca
- Lưu với `check_in_source: 'manual'`, `created_by: adminUserId`
- Upsert nên có thể override bản ghi đã có

**Files:**
- `src/features/attendance/hooks/useAttendance.ts`
- `src/features/attendance/pages/AttendancePage.tsx`
- `src/features/attendance/components/ManualAttendanceDialog.tsx`

**Cách test:**
1. Vào `/admin/attendance` → kiểm tra date picker, filter hoạt động
2. Click "Chấm thủ công" → chọn NV + ca + giờ + lý do → Submit
3. Bản ghi xuất hiện trong bảng với trạng thái đúng

---

### Employee: Lịch sử chấm công (`/attendance`)

**Luồng hoạt động:**
1. Nhân viên vào tab "Chấm công" trong bottom nav
2. Dropdown chọn tháng (6 tháng gần nhất)
3. Stat cards: Ngày công / Đi trễ
4. Bảng: Ngày, Ca, Giờ làm, Trạng thái

**Files:**
- `src/features/employee-portal/pages/AttendanceHistoryPage.tsx`
- `src/features/employee-portal/hooks/useMyEmployee.ts`

---

### QR Check-in System

#### Tablet QR Page (`/tablet/:branch_id`) — Public route

**Luồng hoạt động:**
1. Tablet mở `/tablet/<branch_id>` (không cần đăng nhập)
2. Hiển thị đồng hồ digital, ngày tháng
3. Tự detect ca đang diễn ra (so sánh giờ hiện tại với start/end_time của các ca)
4. Query `qr_tokens` cho ca đó + ngày hôm nay
5. Hiển thị QR code (encode URL: `${origin}/checkin?token=UUID`)
6. Auto-refresh mỗi 60 giây
7. Khi không có ca đang diễn ra: hiển thị ca sắp tới (trong 60 phút)

**Lưu ý:** QR token phải được gen trước qua Edge Function `generate-qr`. Nếu chưa có token, tablet hiện màn hình "không có ca đang diễn ra".

**Files:**
- `src/features/tablet/pages/TabletQRPage.tsx`

#### Employee QR Check-in Page (`/checkin`)

**Luồng 1 — Quét qua URL (native camera):**
1. Nhân viên dùng camera phone quét QR trên tablet
2. URL `/checkin?token=UUID` mở trong browser
3. Page đọc `?token` từ URL, hiển thị xác nhận check-in/check-out
4. Nhân viên nhấn xác nhận → gọi Edge Function `checkin`
5. Hiển thị kết quả (thành công / lỗi)

**Luồng 2 — In-app scanner (BarcodeDetector API):**
1. Nhân viên mở `/checkin` trực tiếp
2. Chọn Check-in hoặc Check-out
3. Nhấn "Quét mã QR" → camera bật
4. BarcodeDetector API tự động detect QR
5. Khi detect được → hiển thị xác nhận → gọi Edge Function

**Luồng 3 — Nhập thủ công:**
1. Nhân viên nhập token UUID vào ô text
2. Nhấn xác nhận → gọi Edge Function

**Fallback:** Nếu browser không hỗ trợ BarcodeDetector (Safari), có thể dùng native camera scanner hoặc nhập thủ công.

**Files:**
- `src/features/employee-portal/pages/CheckinPage.tsx`

#### Edge Function: `generate-qr`

**Trigger:**
- pg_cron lúc 06:30 hàng ngày: `{"run_all": true}`
- Admin thủ công: `{"shift_id": "uuid", "date": "YYYY-MM-DD"}`

**Logic:**
1. Query tất cả ca active (nếu run_all) hoặc ca cụ thể
2. Tạo UUID token cho mỗi ca
3. Upsert vào `qr_tokens` (on conflict shift_id+date: update token)
4. `expires_at` = ngày đó + end_time của ca

**File:** `supabase/functions/generate-qr/index.ts`

**Setup pg_cron:** Chạy SQL sau trong Supabase SQL Editor (sau khi deploy Edge Function):
```sql
SELECT cron.schedule(
  'generate-qr-tokens-daily',
  '30 6 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/generate-qr',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <service_role_key>',
      'Content-Type', 'application/json'
    ),
    body    := jsonb_build_object('run_all', true)
  );
  $$
);
```

#### Edge Function: `checkin`

**Input:** `{ token: string, employee_id: string, type: "check_in" | "check_out" }`

**Validations (theo VALIDATIONS.md):**
- ATT-01: token tồn tại, is_active = true, chưa hết hạn
- ATT-02: NV được gán ca này (shift_schedules → employee_shift_assignments)
- ATT-03: chưa check-in ca này (nếu type = check_in)
- ATT-04: check_out > check_in
- ATT-05/06/07: tự tính late_minutes, early_leave_minutes, overtime_minutes

**File:** `supabase/functions/checkin/index.ts`

---

### Admin: Quản lý đổi ca (`/admin/shift-changes`)

**Luồng hoạt động:**
1. Bảng hiển thị tất cả yêu cầu đổi ca của branch (mới nhất trước)
2. Thông tin: NV, Ngày, Ca hiện tại → Ca muốn đổi, Lý do, Trạng thái
3. Các yêu cầu pending có nút "Duyệt" và "Từ chối"
4. Duyệt: confirm dialog → upsert `shift_schedules` → deactivate QR token cũ
5. Từ chối: dialog nhập lý do → update status

**Files:**
- `src/features/shift-change/hooks/useShiftChange.ts`
- `src/features/shift-change/pages/ShiftChangePage.tsx`

---

### Employee: Yêu cầu đổi ca (`/shift-change`)

**Luồng hoạt động:**
1. Danh sách yêu cầu cũ (status, ngày, ca cũ → ca mới)
2. Nút "+ Gửi yêu cầu" → dialog form
3. Form: chọn ngày (chỉ tương lai), ca hiện tại, ca muốn đổi, lý do
4. Validation: không trùng với pending request cùng ngày (SHI-03)

**Files:**
- `src/features/employee-portal/pages/ShiftChangeRequestPage.tsx`

---

### Employee Dashboard cải tiến

- Hiển thị `employee.full_name` thay vì phone/role
- Salary preview card với gradient orange
- Quick action "Chấm công QR" → `/checkin`
- Stat card "Hôm nay": giờ check-in hoặc "Chưa chấm công"
- Stat card "Ngày công tháng này": số ngày thực tế

---

## Tính năng chưa hoàn chỉnh (Phase 3)

- `/admin/leaves` — Quản lý nghỉ phép (Admin duyệt)
- `/leave` — Nhân viên xin nghỉ phép
- `/admin/payroll` — Tính lương + xác nhận bảng lương
- `/salary` — Nhân viên xem lương chi tiết
- `/admin/analytics` — Báo cáo thống kê
- `/admin/settings` — Cấu hình hệ thống
- Salary preview Edge Function (`salary-preview`)
- Realtime notifications (bell icon, subscription)
- Admin Dashboard với real data (stat cards, biểu đồ)
- Roster scheduling (calendar grid)
- Bulk import Edge Function
- Code splitting với React.lazy()

---

## Known Issues

### [DEBT-01] Bundle size warning (từ Phase 1, chưa fix)
- Bundle 856KB gzip 249KB — vượt ngưỡng 500KB
- Fix Phase 3: React.lazy() cho từng feature route

### [LIMIT-03] Tablet QR — cần gen token trước
- Tablet page chỉ hiển thị QR nếu đã có token trong `qr_tokens`
- Cần chạy `generate-qr` Edge Function ít nhất 1 lần trước khi test

### [LIMIT-04] BarcodeDetector API không hỗ trợ Safari
- iOS Safari không hỗ trợ BarcodeDetector
- Nhân viên dùng iPhone phải dùng native camera app (quét → mở URL) hoặc nhập thủ công

### [LIMIT-05] Edge Functions chưa deploy
- Cần deploy lên Supabase: `supabase functions deploy generate-qr` và `supabase functions deploy checkin`
- Sau khi deploy, setup pg_cron job (xem hướng dẫn trong handoff này)

### [DEBT-04] Không có roster scheduling
- Trang `/admin/roster` (xếp lịch theo tuần) chưa implement
- Ảnh hưởng: admin phải dùng Employee Detail page để gán ca tháng

### [DEBT-05] Shift change không gửi notification
✅ **FIXED in Phase 3** — Notification triggers đã được wire vào tất cả mutation (approve/reject leave, approve/reject shift change, confirm payroll).

---

## Bugs Fixed (Post-Phase 2 — Applied Pre-Phase 3)

Tất cả bugs và debts từ TESTING_PHASE_2.md đã được fix. Xem chi tiết trong PHASE_3_HANDOFF.md.

| Bug ID | Mô tả | Fix |
|---|---|---|
| BUG-P2-02 | Stale closure trong BarcodeDetector scan loop — scanner không hoạt động | `stepRef = useRef(step)` + `useEffect(() => { stepRef.current = step }, [step])` — dùng ref thay vì closure value |
| BUG-P2-03 | Manual attendance timezone sai 7 giờ | `new Date(\`${dateStr}T${time}:00\`).toISOString()` để parse local time → UTC |
| BUG-P2-04 | Overnight shift không detect sau nửa đêm trên tablet | `isCurrentShift` dùng `||` thay `&&` cho overnight: `return nowMins >= startMins \|\| nowMins < endMins` |
| BUG-P2-05 | generate-qr: `expires_at` sai cho overnight shift | Thêm `is_overnight` vào query, cộng +1 ngày khi `endH < 12` |
| BUG-P2-06 | Dead `isNaN` check trong generate-qr | Xóa đoạn code `if (isNaN(expiresAt.getTime()))` vô nghĩa |
| BUG-P2-07 | Unlinked employee → loading vô hạn ở CheckinPage | Tách `isLoading` và `!employee` thành 2 state riêng: loading spinner vs. thông báo lỗi rõ ràng |
| BUG-P2-08 | Reject shift-change ghi đè `reason` của nhân viên | Thêm cột `rejection_reason TEXT` (migration `20260518000002`), update hook dùng field mới |
| BUG-P2-09 | Zod cho phép ngày hôm nay, HTML min là ngày mai | Đồng bộ Zod: `> today` (strictly greater) |
| DEBT-P2-01 | Unused `[sh, sm]` và `[eh, em]` trong checkin Edge Function | Xóa 2 dòng destructuring thừa |
| DEBT-P2-02 | `AdminTopbar` dùng raw phone thay vì `formatPhone()` | Import và dùng `formatPhone(user.phone)` |
| BUG-NOTIF | Supabase realtime crash "cannot add postgres_changes callbacks after subscribe()" | Tách `useNotificationsSubscription()` ra khỏi `useNotifications()` — subscription chỉ setup 1 lần ở layout level |

---

## Checklist QC Test

### Setup trước khi test
- [ ] Deploy Edge Functions: `generate-qr` và `checkin`
- [ ] Gọi `generate-qr` với `{"run_all": true}` để tạo QR token cho hôm nay
- [ ] Tạo nhân viên employee test, gán ca
- [ ] Tạo user với role = employee, liên kết với employee record

### Admin Attendance
- [ ] Vào `/admin/attendance` → kiểm tra bảng load đúng
- [ ] Chọn ngày khác → dữ liệu refresh
- [ ] Lọc theo ca, trạng thái
- [ ] Chấm thủ công: chọn NV + ca + giờ 07:45 (ca bắt đầu 07:00, grace 30p) → status phải là "Đi trễ 45p"
- [ ] Chấm thủ công: giờ 06:55 (trước grace deadline) → status "Có mặt"

### QR Check-in Flow
- [ ] Mở `/tablet/<branch_id>` → QR hiển thị đúng ca hiện tại
- [ ] QR refresh sau 60 giây
- [ ] Nhân viên quét QR bằng camera native → `/checkin?token=X` mở ra
- [ ] Confirm check-in → thành công, hiển thị giờ và trạng thái
- [ ] Check-in lần 2 → hiện lỗi "đã check-in"
- [ ] Token sai → hiện lỗi "không hợp lệ"

### Employee Portal
- [ ] Dashboard hiện tên NV, stat check-in hôm nay
- [ ] Trang `/attendance` hiện lịch sử, đổi tháng hoạt động
- [ ] Trang `/shift-change` hiện danh sách, gửi yêu cầu thành công

### Admin Shift Change
- [ ] Vào `/admin/shift-changes` → bảng hiển thị
- [ ] Duyệt: shift_schedules được update, QR token cũ deactivated
- [ ] Từ chối: status = rejected, lý do lưu vào trường reason

---

## Ghi chú cho Phase 3

1. **Ưu tiên cao nhất:** Leave management + Payroll (chức năng cốt lõi còn thiếu)
2. **Realtime notifications:** Phase 3 phải implement để UX hoàn chỉnh
3. **Salary preview Edge Function:** Cần implement sau khi có payroll config
4. **Admin Dashboard:** Thay placeholder bằng real data khi đủ dữ liệu từ attendance
5. **Code splitting:** Nên làm ở đầu Phase 3 vì bundle đã > 850KB
6. **pg_cron setup:** Thực hiện sau khi deploy generate-qr Edge Function
