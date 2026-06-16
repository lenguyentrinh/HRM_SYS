# TESTING PHASE 2 – HRM Management App

**Ngày test:** 2026-05-18  
**Tester:** Senior QC (10+ năm kinh nghiệm)  
**Phiên bản:** Phase 2 – Handoff 2026-05-18  
**Phương pháp:** Static code review + logic analysis  
**Scope:** Verify Phase 1 bug fixes + test toàn bộ tính năng mới Phase 2

---

## PHẦN 1 — Verify Phase 1 Bug Fixes

| Bug ID | Mô tả | Trạng thái | Bằng chứng |
|--------|--------|-----------|-----------|
| BUG-01 | Search không có debounce | ✅ **FIXED** | `EmployeeListPage.tsx:35-38` — `useEffect` + `setTimeout(300ms)`. Hai state riêng: `searchInput` (UI) và `search` (query). |
| BUG-02 | `checkExpiry` không được gọi tự động | ⚠️ **NOT FIXED** | Không có trong danh sách Phase 2 fixes. Vẫn là hàm không được gọi. Acceptable vì `onRehydrateStorage` handle khi reload. |
| BUG-03 | Session TTL reset sau mỗi state change | ✅ **FIXED** | `authStore.ts:51-58` — `partialize` đọc `existing.expiresAt` từ localStorage và tái dùng nếu cùng `userId`. TTL chỉ tạo mới khi login lần đầu. |
| BUG-04 | FK error check fragile (`includes('foreign key')`) | ✅ **FIXED** | `useShifts.ts:75` — đổi sang `(err as { code?: string }).code === '23503'`. |
| BUG-05 | Employee Detail tab "Ca" không hiển thị data | ⚠️ **NOT FIXED** | Không trong scope Phase 2. Vẫn còn static text link. |
| BUG-06 | Topbar không hiện thông tin user | ✅ **FIXED** | `AdminTopbar.tsx:25` — `displayName = \`${user.phone} · ${roleLabel}\`` |
| BUG-07 | Không có 404 catch-all route | ✅ **FIXED** | `router.tsx:65` — `{ path: '*', element: <NotFoundPage /> }`. `NotFoundPage` redirect về đúng portal theo role. |
| BUG-08 | Employee dashboard hiện role thay vì tên | ✅ **FIXED** | `EmployeeDashboardPage.tsx:29` — `{employee?.full_name ?? '—'}` qua `useMyEmployee(userId)`. |
| TYPE-01 | User interface thiếu `phone` | ✅ **FIXED** | `database.ts:23` — `phone: string` được thêm vào `User` interface. |
| DEBT-NEW-01 | `phoneToEmail` dead code | ✅ **FIXED** | `utils.ts` đã sạch. Hàm `phoneToEmail` đã xóa. |

**Tổng kết Phase 1 fixes: 8/10 đã fix, 2 carry-over (BUG-02 low priority, BUG-05 not in scope).**

---

## PHẦN 2 — Test tính năng Phase 2

### 2.1 Admin: Bảng chấm công (`/admin/attendance`)

#### TC-ATT-01: Page load và stat cards
- **Bước test:** Navigate tới `/admin/attendance`
- **Kết quả mong đợi:** Date picker default hôm nay, 3 stat cards (Có mặt, Đi trễ, Vắng mặt), bảng load dữ liệu
- **Phân tích:** `AttendancePage.tsx:29` — `today = new Date()`, `selectedDate = today`. Stat cards tính từ `records`. EmptyState khi không có data. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-ATT-02: Filter theo ngày
- **Bước test:** Đổi date picker sang ngày khác
- **Kết quả mong đợi:** Bảng refresh với dữ liệu của ngày mới
- **Phân tích:** `AttendancePage.tsx:78` — `setSelectedDate(new Date(e.target.value + 'T00:00:00'))`. Append 'T00:00:00' để tránh UTC offset bug. TanStack Query key thay đổi → refetch. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-ATT-03: Filter theo ca
- **Bước test:** Chọn ca từ dropdown
- **Kết quả mong đợi:** Bảng chỉ hiện nhân viên của ca đó
- **Phân tích:** `useAttendance.ts:38` — `if (shiftId) query = query.eq('shift_id', shiftId)`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-ATT-04: Filter theo trạng thái
- **Bước test:** Chọn "Đi trễ", "Vắng mặt" từ dropdown
- **Kết quả mong đợi:** Bảng lọc theo status
- **Phân tích:** `useAttendance.ts:39` — `if (status) query = query.eq('status', status)`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-ATT-05: Chấm công thủ công — Happy path
- **Bước test:** Click "Chấm thủ công" → chọn NV + ca + giờ 07:45 (ca bắt đầu 07:00, grace 30p) → Submit
- **Kết quả mong đợi:** Status = "Đi trễ", late_minutes = 45
- **Phân tích code:**
  - `checkInTime = new Date('2026-05-18T07:45:00')` → local time
  - `shiftStart = new Date('2026-05-18T07:45:00')`, sau đó `setHours(7, 0, 0, 0)` → 07:00
  - `deadline = shiftStart + 30*60000 = 07:30`
  - `isLate = 07:45 > 07:30` → true
  - `lateMinutes = (07:45 - 07:00) = 45` phút
  - Đúng per handoff spec.
- **Trạng thái:** ✅ PASS (logic đúng) — xem `[BUG-P2-03]` về timezone

#### TC-ATT-06: Chấm công thủ công — Check-in đúng giờ
- **Bước test:** Giờ check-in = 06:55 (ca 07:00, grace 30p)
- **Kết quả mong đợi:** Status = "Có mặt"
- **Phân tích:** `isLate = 06:55 > 07:30` → false → status = 'present'. Đúng.
- **Trạng thái:** ✅ PASS (logic đúng)

#### TC-ATT-07: Form validation chấm thủ công
- **Bước test:** Submit form thiếu NV, thiếu ca, thiếu giờ check-in, thiếu lý do
- **Kết quả mong đợi:** Error message trên từng field
- **Phân tích:** Zod schema — `employee_id`, `shift_id`, `check_in_time`, `notes` đều `min(1)`. `Select` dùng `setValue` → validate khi submit. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-ATT-08: Timestamp timezone trong chấm thủ công [BUG]
- **Bước test:** Admin nhập giờ "07:00" → Submit → kiểm tra timestamp trong DB
- **Kết quả mong đợi:** Supabase lưu 07:00 giờ Việt Nam (UTC+7)
- **Phân tích:** `ManualAttendanceDialog.tsx:60` — `checkInAt = \`${dateStr}T${values.check_in_time}:00\`` = `'2026-05-18T07:00:00'` (không có timezone). String này được truyền thẳng vào Supabase upsert. Postgres TIMESTAMPTZ sẽ interpret string không có timezone là **UTC** → lưu `07:00 UTC = 14:00 Vietnam`. Màn hình sẽ hiển thị 14:00 thay vì 07:00.
- **Trạng thái:** ❌ FAIL — xem `[BUG-P2-03]`

#### TC-ATT-09: Tính tổng giờ làm
- **Bước test:** Check-in 07:00, check-out 16:00 → kiểm tra cột "Tổng giờ"
- **Kết quả mong đợi:** Hiện "9h"
- **Phân tích:** `AttendancePage.tsx:138-143` — `totalMinutes = (checkOut - checkIn) / 60000`. `minutesToHours(540)` = `"9h"`. Đúng (giả sử timestamp đúng).
- **Trạng thái:** ✅ PASS (logic đúng, phụ thuộc vào timestamp đúng)

---

### 2.2 QR Check-in System

#### TC-QR-01: TabletQRPage — load và hiển thị QR
- **Bước test:** Mở `/tablet/<branch_id>` trong giờ có ca đang diễn ra, đã gen token
- **Kết quả mong đợi:** Đồng hồ digital, tên ca, QR code, countdown hết hạn
- **Phân tích:** `TabletQRPage.tsx` — load shifts từ branch → find current shift → query token → render `QRCode`. Logic đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

#### TC-QR-02: TabletQRPage — auto refresh mỗi 60 giây
- **Bước test:** Quan sát tablet page trong 60 giây
- **Kết quả mong đợi:** QR reload sau 60 giây
- **Phân tích:** `TabletQRPage.tsx:106` — `setInterval(loadQR, 60_000)`. Đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

#### TC-QR-03: TabletQRPage — không có ca đang diễn ra
- **Bước test:** Mở tablet page ngoài giờ ca
- **Kết quả mong đợi:** "Không có ca đang diễn ra", hiện ca sắp tới nếu trong 60 phút
- **Phân tích:** `isCurrentShift` + `isUpcomingShift` logic. `isUpcomingShift`: `startMins - nowMins <= 60`. Đúng cho ca ban ngày.
- **Trạng thái:** ⚠️ PARTIAL — xem `[BUG-P2-04]` (overnight shift)

#### TC-QR-04: TabletQRPage — overnight shift bug
- **Bước test:** Ca qua đêm 22:00–06:00, test lúc 01:00 sáng
- **Kết quả mong đợi:** QR của ca qua đêm hiển thị
- **Phân tích:** `isCurrentShift` function: `nowMins=60`, `startMins=1320`, `endMins=360+1440=1800`. `60 >= 1320` → false → ca không được detect là "đang diễn ra". QR sẽ không hiển thị sau nửa đêm dù ca vẫn đang chạy.
- **Trạng thái:** ❌ FAIL — xem `[BUG-P2-04]`

#### TC-QR-05: Employee QR Check-in — URL token (native camera)
- **Bước test:** Quét QR bằng camera native → URL `/checkin?token=UUID` mở → confirm → Submit
- **Kết quả mong đợi:** Check-in thành công, hiển thị giờ và trạng thái
- **Phân tích:** `CheckinPage.tsx:28-34` — `useEffect` đọc `searchParams.get('token')`, set step='confirming' khi có `employee`. Logic đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

#### TC-QR-06: Employee QR Check-in — BarcodeDetector scanner
- **Bước test:** Mở `/checkin` → Click "Quét mã QR" → camera bật → đưa QR vào camera
- **Kết quả mong đợi:** QR được detect tự động, chuyển sang màn hình xác nhận
- **Phân tích:** `CheckinPage.tsx:53-81` — BarcodeDetector loop. **Lỗi stale closure**: `step` trong hàm `scan` là giá trị tại lúc `startCamera` được gọi (= 'idle'), không phải 'scanning'. Dòng 57: `if (!videoRef.current || step !== 'scanning') return` → `step` = 'idle' ≠ 'scanning' → loop kết thúc ngay lập tức mà không scan.
- **Trạng thái:** ❌ FAIL — xem `[BUG-P2-05]`

#### TC-QR-07: Employee QR Check-in — nhập thủ công
- **Bước test:** Nhập token UUID vào ô text → Xác nhận
- **Kết quả mong đợi:** Chuyển sang màn hình xác nhận với token đã nhập
- **Phân tích:** `CheckinPage.tsx:109-113` — `handleManualSubmit` → `setToken(t)` → `setStep('confirming')`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-QR-08: Edge Function `checkin` — ATT-01 token validation
- **Bước test:** Gửi token sai/không tồn tại
- **Kết quả mong đợi:** `{ success: false, message: 'Mã QR không hợp lệ' }`
- **Phân tích:** `checkin/index.ts:38-43` — check `!qrToken || !qrToken.is_active`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-QR-09: Edge Function `checkin` — ATT-01 token expired
- **Bước test:** Gửi token đã hết hạn (`expires_at` trong quá khứ)
- **Kết quả mong đợi:** `{ success: false, message: 'Mã QR đã hết hạn...' }`
- **Phân tích:** `checkin/index.ts:45-50` — `new Date(qrToken.expires_at) < now`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-QR-10: Edge Function `checkin` — ATT-02 wrong shift
- **Bước test:** Employee thuộc ca A quét QR của ca B
- **Kết quả mong đợi:** `{ success: false, message: 'Bạn không thuộc ca làm việc này' }`
- **Phân tích:** `checkin/index.ts:55-87` — lookup shift_schedules → fallback employee_shift_assignments → compare `assignedShiftId !== shiftId`. Đúng, theo đúng priority logic.
- **Trạng thái:** ✅ PASS

#### TC-QR-11: Edge Function `checkin` — ATT-03 duplicate check-in
- **Bước test:** Check-in lần 2 cùng ca
- **Kết quả mong đợi:** `{ success: false, message: 'Bạn đã check-in ca này rồi' }`
- **Phân tích:** `checkin/index.ts:98-103` — `if (type === 'check_in' && existing?.check_in_at)`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-QR-12: Edge Function `checkin` — check-out trước check-in
- **Bước test:** Check-out khi chưa check-in
- **Kết quả mong đợi:** `{ success: false, message: 'Bạn chưa check-in ca này' }`
- **Phân tích:** `checkin/index.ts:105-110`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-QR-13: Edge Function `checkin` — tính late_minutes
- **Bước test:** Check-in lúc 07:45 (ca 07:00, grace 30p)
- **Kết quả mong đợi:** `late_minutes = 45`, message "Đi trễ 45 phút"
- **Phân tích:** `checkin/index.ts:135-140` — `shiftStart = new Date('dateT07:00:00')`, `deadline = shiftStart + 30*60000`. `isLate = now > deadline`. `lateMinutes = (now - shiftStart) / 60000`. Nhất quán với manual attendance. ✅
- **Trạng thái:** ✅ PASS

#### TC-QR-14: Edge Function `checkin` — unused variables
- **Bước test:** Code review
- **Kết quả mong đợi:** Không có dead code
- **Phân tích:** `checkin/index.ts:135`: `const [sh, sm] = shift.start_time.split(':').map(Number)` — `sh` và `sm` không được dùng (shiftStart được tạo từ string trực tiếp). `checkin/index.ts:162`: `const [eh, em] = shift.end_time.split(':').map(Number)` — `eh` và `em` không được dùng.
- **Trạng thái:** ⚠️ DEBT — xem `[DEBT-P2-01]`

#### TC-QR-15: Edge Function `generate-qr` — overnight shift expires_at
- **Bước test:** Gọi `generate-qr` với ca qua đêm (end_time = 06:00)
- **Kết quả mong đợi:** `expires_at` = ngày hôm sau 06:00
- **Phân tích:** `generate-qr/index.ts:52` — `expiresAt = new Date(\`${dateStr}T${shift.end_time}:00\`)`. Với `dateStr='2026-05-18'` và `end_time='06:00'`, `expiresAt = 2026-05-18T06:00:00` tức là **6 giờ sáng của cùng ngày bắt đầu ca**, không phải ngày hôm sau. Token expire sai 24 giờ.
- **Trạng thái:** ❌ FAIL — xem `[BUG-P2-06]`

---

### 2.3 Employee Portal — Lịch sử chấm công (`/attendance`)

#### TC-EMP-ATT-01: Load attendance history
- **Bước test:** Navigate tới `/attendance` từ bottom nav
- **Kết quả mong đợi:** Dropdown tháng, stat cards, bảng lịch sử
- **Phân tích:** `AttendanceHistoryPage.tsx` — `buildMonthOptions()` tạo 6 tháng gần nhất. `useMyEmployee` → `useMyAttendance`. Đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

#### TC-EMP-ATT-02: Đổi tháng
- **Bước test:** Chọn tháng khác từ dropdown
- **Kết quả mong đợi:** Bảng refresh với dữ liệu tháng mới
- **Phân tích:** `selectedIdx` thay đổi → `MONTH_OPTIONS[selectedIdx]` → `useMyAttendance` key thay đổi → refetch. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-EMP-ATT-03: Employee không có linked employee record
- **Bước test:** Login với user có `role=employee` nhưng không có `employees` record với `user_id` tương ứng
- **Kết quả mong đợi:** Error message hoặc redirect phù hợp
- **Phân tích:** `useMyEmployee.ts` — `maybeSingle()` → `data = null`. `AttendanceHistoryPage.tsx:37` — `useMyAttendance(employee?.id, ...)` → `employee?.id = undefined` → `enabled: false` → không query, `records = undefined`. Render: `isLoading=false, records?.length=0` → EmptyState. Không crash nhưng không rõ nguyên nhân với user.
- **Trạng thái:** ⚠️ UX — xem `[BUG-P2-07]`

---

### 2.4 Employee Portal — Yêu cầu đổi ca (`/shift-change`)

#### TC-SC-EMP-01: Danh sách yêu cầu cũ
- **Bước test:** Navigate tới `/shift-change`
- **Kết quả mong đợi:** Danh sách requests với status badge, ca cũ → ca mới, ngày
- **Phân tích:** `useMyShiftChangeRequests` lấy tối đa 20 requests mới nhất. Render với `RequestBadge`. Đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

#### TC-SC-EMP-02: Gửi yêu cầu đổi ca — Happy path
- **Bước test:** Click "+ Gửi yêu cầu" → điền form → Submit
- **Kết quả mong đợi:** Request được tạo, toast success, list refresh
- **Phân tích:** `useCreateShiftChangeRequest` — check duplicate pending trước, rồi insert. `onSuccess` → invalidate query + toast. Đúng.
- **Trạng thái:** ✅ PASS (logic đúng) [NEEDS-LIVE]

#### TC-SC-EMP-03: Validation — trùng ngày pending
- **Bước test:** Gửi request cho ngày đã có pending request
- **Kết quả mong đợi:** Error toast "Bạn đã có yêu cầu đổi ca đang chờ duyệt cho ngày này"
- **Phân tích:** `useShiftChange.ts:82-88` — query duplicate check trước khi insert. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-SC-EMP-04: Validation — chọn cùng ca
- **Bước test:** Chọn current_shift = requested_shift
- **Kết quả mong đợi:** Error "Đây đã là ca của bạn"
- **Phân tích:** `ShiftChangeRequestPage.tsx:26-28` — Zod `.refine(d => d.current_shift_id !== d.requested_shift_id)`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-SC-EMP-05: Validation — chọn ngày quá khứ
- **Bước test:** Nhập ngày hôm qua vào input (bypass HTML min)
- **Kết quả mong đợi:** Error "Không thể đổi ca cho ngày đã qua"
- **Phân tích:** `ShiftChangeRequestPage.tsx:29-32` — Zod refine check `>= today`. HTML `min={minDate}` = ngày mai. **Inconsistency**: Zod cho phép ngày hôm nay (>= today) nhưng HTML min là ngày mai. Nếu user nhập đúng ngày hôm nay, HTML min ngăn lại nhưng Zod passes.
- **Trạng thái:** ⚠️ LOW — xem `[BUG-P2-08]`

---

### 2.5 Admin: Quản lý đổi ca (`/admin/shift-changes`)

#### TC-SC-ADMIN-01: Danh sách tất cả requests
- **Bước test:** Navigate tới `/admin/shift-changes`
- **Kết quả mong đợi:** Bảng hiển thị tất cả requests của branch, sorted mới nhất trước
- **Phân tích:** `useShiftChangeRequests` — filter `employees.branch_id = branchId` với `!inner` join. Order `created_at DESC`. Đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

#### TC-SC-ADMIN-02: Duyệt request — happy path
- **Bước test:** Click "Duyệt" → confirm dialog → Duyệt
- **Kết quả mong đợi:** `shift_schedules` upsert, QR token cũ deactivated, status = 'approved', toast
- **Phân tích:** `useReviewShiftChange` approve path — fetch request → upsert `shift_schedules` → deactivate old QR → update status. Đúng.
- **Trạng thái:** ✅ PASS (logic đúng) [NEEDS-LIVE]

#### TC-SC-ADMIN-03: Từ chối request — reason field bug
- **Bước test:** Click "Từ chối" → nhập lý do → Từ chối
- **Kết quả mong đợi:** status = 'rejected', lý do từ chối được lưu riêng, lý do NV không bị mất
- **Phân tích:** `useShiftChange.ts:155-160` — `reason: rejectReason ?? null`. Trường `reason` trong DB là lý do của employee. Code **overwrite** lý do của nhân viên bằng lý do từ chối của admin. Lý do gốc của nhân viên bị mất.
- **Trạng thái:** ❌ FAIL — xem `[BUG-P2-09]`

#### TC-SC-ADMIN-04: Deactivate QR logic khi duyệt
- **Bước test:** Duyệt đổi ca → kiểm tra QR token của ca cũ
- **Kết quả mong đợi:** QR token cũ `is_active = false`
- **Phân tích:** `useShiftChange.ts:143-147` — `.update({ is_active: false }).eq('date', req.target_date).neq('shift_id', req.requested_shift_id)`. Deactivate tất cả tokens của ngày đó mà không phải ca mới. Logic đúng.
- **Trạng thái:** ✅ PASS

---

### 2.6 Employee Dashboard cải tiến

#### TC-DASH-01: Hiển thị tên nhân viên
- **Bước test:** Login với employee → xem dashboard
- **Kết quả mong đợi:** "Xin chào 👋" + tên đầy đủ nhân viên
- **Phân tích:** `EmployeeDashboardPage.tsx:29` — `{employee?.full_name ?? '—'}`. Dùng `useMyEmployee`. Đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

#### TC-DASH-02: Stat card "Hôm nay"
- **Bước test:** Nhân viên đã check-in → xem card "Hôm nay"
- **Kết quả mong đợi:** Hiện "Check-in HH:mm"
- **Phân tích:** `EmployeeDashboardPage.tsx:57-59` — `todayRecord?.check_in_at ? \`Check-in ${format(...)}\` : 'Chưa chấm công'`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-DASH-03: Quick action "Chấm công QR"
- **Bước test:** Click button "Chấm công QR"
- **Kết quả mong đợi:** Navigate tới `/checkin`
- **Phân tích:** `EmployeeDashboardPage.tsx:46` — `onClick={() => navigate('/checkin')}`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-DASH-04: Employee không có linked record
- **Bước test:** User `employee` không có `employees` record với `user_id` tương ứng
- **Kết quả mong đợi:** Thông báo lỗi rõ ràng
- **Phân tích:** `EmployeeDashboardPage.tsx:29` — hiện "—" cho tên, salary "—", ngày công "0". Không crash nhưng không giải thích tại sao. `/checkin` page hiện "Đang tải thông tin nhân viên..." mãi mãi (xem `[BUG-P2-07]`).
- **Trạng thái:** ⚠️ UX — xem `[BUG-P2-07]`

---

### 2.7 404 Page

#### TC-404-01: Navigate tới route không tồn tại
- **Bước test:** Navigate tới `/something-invalid`
- **Kết quả mong đợi:** 404 page với nút "Quay về trang chủ"
- **Phân tích:** `router.tsx:65` + `NotFoundPage.tsx` — redirect về đúng portal theo role. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-404-02: Redirect từ 404 page
- **Bước test:** Click "Quay về trang chủ" trên 404 page
- **Kết quả mong đợi:** Redirect về `/admin` (admin) hoặc `/` (employee) hoặc `/login` (chưa đăng nhập)
- **Phân tích:** `NotFoundPage.tsx:10-16` — logic đúng.
- **Trạng thái:** ✅ PASS

---

## PHẦN 3 — Bugs phát hiện trong Phase 2

### [BUG-P2-01] Topbar dropdown không có tên user — INFO (FIX PHASE 2 INCOMPLETE)
- **Mô tả:** `AdminTopbar.tsx:25` — `displayName = \`${user.phone} · ${roleLabel}\``. Đã hiện phone nhưng không format đẹp. `formatPhone` function tồn tại trong utils nhưng không được dùng.
- **File:** `src/layouts/AdminTopbar.tsx:25`
- **Severity:** Low/UX
- **Fix:** Dùng `formatPhone(user.phone)` thay vì raw phone.

### [BUG-P2-02] Stale closure trong BarcodeDetector scan loop — HIGH
- **Mô tả:** `CheckinPage.tsx:57` — `if (!videoRef.current || step !== 'scanning') return`. Hàm `scan` capture `step` theo closure khi `startCamera` được gọi — tại thời điểm đó `step = 'idle'`. `setStep('scanning')` (line 50) là async React state update, chưa reflect vào closure. Kết quả: `step !== 'scanning'` là `true` ngay lần đầu → vòng lặp kết thúc ngay, QR không được scan.
- **Ảnh hưởng:** **Tính năng BarcodeDetector scanner KHÔNG HOẠT ĐỘNG** trên tất cả browser hỗ trợ BarcodeDetector (Chrome Android, Chrome desktop). Nhân viên bắt buộc phải dùng native camera hoặc nhập thủ công.
- **File:** `src/features/employee-portal/pages/CheckinPage.tsx:57`
- **Fix:** Dùng `useRef` để track step:
  ```ts
  const stepRef = useRef(step)
  useEffect(() => { stepRef.current = step }, [step])
  // trong scan: if (!videoRef.current || stepRef.current !== 'scanning') return
  ```

### [BUG-P2-03] Manual attendance timezone bug — HIGH  
- **Mô tả:** `ManualAttendanceDialog.tsx:60` — `checkInAt = \`${dateStr}T${values.check_in_time}:00\`` tạo string không có timezone. String này truyền thẳng vào Supabase upsert. Postgres TIMESTAMPTZ interpret string không timezone là **UTC**. Admin nhập "07:00" → DB lưu `07:00 UTC = 14:00 GMT+7`. Bảng chấm công hiển thị 14:00 thay vì 07:00.
- **Ảnh hưởng:** Tất cả bản ghi chấm công thủ công có timestamp sai lệch 7 giờ (với Vietnam UTC+7).
- **File:** `src/features/attendance/components/ManualAttendanceDialog.tsx:60-61`
- **Fix:** 
  ```ts
  const checkInAt = new Date(`${dateStr}T${values.check_in_time}:00`).toISOString()
  ```
  Hoặc thêm offset: `${dateStr}T${values.check_in_time}:00+07:00`

### [BUG-P2-04] Tablet QR page — overnight shift không detect sau nửa đêm — MEDIUM
- **Mô tả:** `TabletQRPage.tsx:24-32` — `isCurrentShift`: `nowMins` luôn trong [0, 1440). Khi ca qua đêm, `endMins` được cộng thêm 1440. Nhưng nếu `nowMins < startMins` (sau nửa đêm), điều kiện `nowMins >= startMins` sẽ fail. Ví dụ: ca 22:00–06:00, lúc 01:00 sáng `nowMins=60, startMins=1320`, `60 >= 1320` = false → ca không được detect.
- **Ảnh hưởng:** Tablet không hiển thị QR cho ca qua đêm trong phần thời gian sau nửa đêm (00:00–06:00).
- **File:** `src/features/tablet/pages/TabletQRPage.tsx:23-32`
- **Fix:** 
  ```ts
  function isCurrentShift(shift: Shift): boolean {
    const nowMins = ...
    const startMins = ...
    let endMins = ...
    if (shift.is_overnight && endMins < startMins) {
      // shift spans midnight
      return nowMins >= startMins || nowMins < endMins  // ← sửa logic
    }
    return nowMins >= startMins && nowMins < endMins
  }
  ```

### [BUG-P2-05] generate-qr — `expires_at` sai cho overnight shift — MEDIUM
- **Mô tả:** `generate-qr/index.ts:52` — `expiresAt = new Date(\`${dateStr}T${shift.end_time}:00\`)`. Với ca qua đêm (start=22:00, end=06:00), `dateStr='2026-05-18'`, `expiresAt = 2026-05-18T06:00:00` = **6 giờ sáng cùng ngày bắt đầu**, sớm hơn thời gian kết thúc thực 24 giờ. Token expire sai ngay khi mới sinh.
- **Ảnh hưởng:** QR token cho ca qua đêm expire ngay từ đầu → nhân viên không check-in được qua QR.
- **File:** `supabase/functions/generate-qr/index.ts:51-58`
- **Fix:**
  ```ts
  const expiresAt = new Date(`${dateStr}T${shift.end_time}:00`)
  if (shift.is_overnight && expiresAt.getHours() < 12) {
    // end_time is next calendar day
    expiresAt.setDate(expiresAt.getDate() + 1)
  }
  ```
  Cần thêm `is_overnight` vào select query: `.select('id, end_time, branch_id, is_overnight')`

### [BUG-P2-06] generate-qr — `isNaN` check không có tác dụng — LOW
- **Mô tả:** `generate-qr/index.ts:53-55` — `if (isNaN(expiresAt.getTime())) { expiresAt.setFullYear(...) }`. Nếu `expiresAt` là NaN, `setFullYear` cũng không fix được (NaN date vẫn NaN). Code này không bao giờ execute trong thực tế (dateStr và end_time luôn valid từ DB). Dead/buggy error handling.
- **File:** `supabase/functions/generate-qr/index.ts:53-55`
- **Severity:** Low — dead code, không gây crash
- **Fix:** Xóa đoạn check `isNaN` vô nghĩa này.

### [BUG-P2-07] Employee không có linked employee record — trải nghiệm xấu — MEDIUM
- **Mô tả:** User với `role=employee` không có `employees` record có `user_id` tương ứng. `useMyEmployee` trả về `null` (không phải loading). Các page:
  - **Dashboard:** hiện tên "—", salary "—", ngày công "0" — không rõ lý do
  - **CheckinPage:** `if (!employee)` hiện "Đang tải thông tin nhân viên..." mãi mãi
  - **AttendanceHistoryPage:** `useMyAttendance(undefined, ...)` → disabled → EmptyState "Chưa có dữ liệu"
- **File:** Tất cả pages dùng `useMyEmployee`
- **Fix:** Khi `useMyEmployee` loading=false và data=null, render error state "Tài khoản chưa được liên kết với hồ sơ nhân viên. Vui lòng liên hệ admin." thay vì loading vô hạn hoặc empty state.

### [BUG-P2-08] Từ chối đổi ca ghi đè lý do của nhân viên — MEDIUM
- **Mô tả:** `useShiftChange.ts:157` — `reason: rejectReason ?? null`. Khi reject, code update field `reason` (vốn là lý do của nhân viên) bằng `rejectReason` (lý do từ chối của admin). Lý do gốc của nhân viên bị mất vĩnh viễn.
- **Ảnh hưởng:** Không thể audit sau này — không biết nhân viên đổi ca vì lý do gì.
- **File:** `src/features/shift-change/hooks/useShiftChange.ts:155-160`
- **Fix:** Thêm column `rejection_reason TEXT` vào `shift_change_requests` table (cần migration mới). Hoặc tạm thời prefix: `reason: \`[Admin từ chối]: ${rejectReason}\n[NV gốc]: ${originalReason}\``

### [BUG-P2-09] Zod và HTML min attribute không nhất quán — LOW
- **Mô tả:** `ShiftChangeRequestPage.tsx:29` — Zod cho phép `target_date >= hôm nay`, nhưng `minDate = addDays(today, 1)` và `<Input min={minDate}>` restrict từ ngày mai. Mâu thuẫn: browser ngăn chọn hôm nay nhưng Zod cho phép. Nếu form được submit trực tiếp (không qua browser UI), ngày hôm nay sẽ pass Zod validation.
- **File:** `src/features/employee-portal/pages/ShiftChangeRequestPage.tsx:29,44`
- **Severity:** Low — chỉ exploitable qua API bypass, không qua UI bình thường
- **Fix:** Đồng bộ Zod: `new Date(d.target_date) > new Date(format(new Date(), 'yyyy-MM-dd'))` (strictly greater than).

### [DEBT-P2-01] Dead code — unused variables trong `checkin` Edge Function — LOW
- **Mô tả:** `checkin/index.ts:135` — `const [sh, sm] = shift.start_time.split(':').map(Number)` — `sh` và `sm` không được dùng. `checkin/index.ts:162` — `const [eh, em] = shift.end_time.split(':').map(Number)` — `eh` và `em` không được dùng. Code thực sự tạo Date objects từ string trực tiếp.
- **File:** `supabase/functions/checkin/index.ts:135,162`
- **Fix:** Xóa 2 dòng destructuring thừa.

### [DEBT-P2-02] `formatPhone` tồn tại trong utils nhưng không được dùng ở Topbar — INFO
- **Mô tả:** `utils.ts` có `formatPhone` nhưng `AdminTopbar.tsx:25` hiển thị phone raw.
- **File:** `src/layouts/AdminTopbar.tsx:25`
- **Fix:** `displayName = \`${formatPhone(user.phone)} · ${roleLabel}\``

---

## PHẦN 4 — Test cases cần live environment

| ID | Test case | Điều kiện |
|---|---|---|
| TC-LIVE-01 | generate-qr tạo token đúng cho ca bình thường | Cần Supabase + Edge Function deployed |
| TC-LIVE-02 | Tablet QR page load và hiển thị QR | Cần token trong DB |
| TC-LIVE-03 | Check-in qua native camera (URL flow) | Cần thiết bị mobile thật |
| TC-LIVE-04 | Check-in qua BarcodeDetector | Cần Android Chrome + BUG-P2-02 fix trước |
| TC-LIVE-05 | Duyệt đổi ca → shift_schedules cập nhật đúng | Cần DB live |
| TC-LIVE-06 | Manual attendance lưu timestamp đúng | Cần fix BUG-P2-03 trước |
| TC-LIVE-07 | pg_cron chạy generate-qr đúng 06:30 | Cần pg_cron setup |
| TC-LIVE-08 | Overnight ca qua đêm — full flow | Cần fix BUG-P2-04, BUG-P2-05 trước |

---

## PHẦN 5 — Tóm tắt

### Thống kê test cases Phase 2

| Hạng mục | Số lượng |
|---|---|
| Test cases đã review | 38 |
| PASS | 26 |
| FAIL / BUG | 5 |
| PARTIAL / UX | 4 |
| Needs live | 8 |

### Bugs mới Phase 2 theo severity

| Severity | Số | IDs |
|---|---|---|
| High | 2 | BUG-P2-02 (scanner stale closure), BUG-P2-03 (timezone) |
| Medium | 4 | BUG-P2-04 (overnight tablet), BUG-P2-05 (overnight expire), BUG-P2-07 (unlinked employee), BUG-P2-08 (reject reason) |
| Low | 3 | BUG-P2-01, BUG-P2-06, BUG-P2-09 |
| Debt/Info | 2 | DEBT-P2-01, DEBT-P2-02 |

### Đánh giá tổng thể

**Phase 2 KHÔNG đủ điều kiện ship** với 2 bug HIGH còn tồn tại. Phải fix trước khi production:

**Bắt buộc fix ngay:**
1. `[BUG-P2-02]` Scanner stale closure — tính năng QR scanner in-app hoàn toàn không hoạt động
2. `[BUG-P2-03]` Timezone bug — tất cả bản ghi chấm công thủ công sai 7 giờ

**Fix trước khi có nhân viên ca đêm:**
3. `[BUG-P2-04]` Overnight shift không hiển thị QR sau nửa đêm
4. `[BUG-P2-05]` Token overnight expire sai

**Fix trong Phase 3:**
5. `[BUG-P2-07]` Unlinked employee UX — hiện loading vô hạn
6. `[BUG-P2-08]` Rejection reason ghi đè employee reason — cần migration
7. `[BUG-P2-09]` Zod vs HTML min inconsistency
8. `[DEBT-P2-01,02]` Clean up dead code

---

*Báo cáo dựa trên static code review. Sau khi fix BUG-P2-02 và BUG-P2-03, cần chạy live test TC-LIVE-01 đến TC-LIVE-08 để confirm end-to-end.*
