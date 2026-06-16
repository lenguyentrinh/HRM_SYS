# Testing Phase 9 – Employee Portal UX

**QC:** Senior QC (static code review)  
**Ngày test:** 2026-05-21  
**Phạm vi:** Verify fix BUG-P8-01 + carry-over bugs từ Phase 8 + tính năng mới Phase 9  
**Phương pháp:** Đọc source code, trace logic, không có môi trường Supabase live

---

## Phần 1 — Verify BUG-P8-01 đã fix chưa

### BUG-P8-01 — Filename CSV không nhất quán

**Kỳ vọng sau fix:** `STATUS_FILE_LABELS` map với 4 keys (all, pending, approved, rejected) → tất cả filenames dùng tiếng Việt không dấu.

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| FIX-P8-01-a | `STATUS_FILE_LABELS` map được thêm vào `LeavePage.tsx` (lines 31–36) với đủ 4 keys | ✅ FIXED |
| FIX-P8-01-b | `all: 'tat_ca'`, `pending: 'cho_duyet'`, `approved: 'da_duyet'`, `rejected: 'tu_choi'` | ✅ FIXED |
| FIX-P8-01-c | Line 52: `const label = STATUS_FILE_LABELS[statusFilter] ?? statusFilter` — dùng map thay ternary cũ | ✅ FIXED |
| FIX-P8-01-d | Fallback `?? statusFilter` an toàn nếu có status mới ngoài map | ✅ FIXED |

**Kết quả filename sau fix:**

| Filter | Trước fix | Sau fix |
|--------|-----------|---------|
| Tất cả | `don_nghi_phep_tat_ca.csv` | `don_nghi_phep_tat_ca.csv` (giữ nguyên) |
| Chờ duyệt | `don_nghi_phep_pending.csv` | `don_nghi_phep_cho_duyet.csv` ✅ |
| Đã duyệt | `don_nghi_phep_approved.csv` | `don_nghi_phep_da_duyet.csv` ✅ |
| Từ chối | `don_nghi_phep_rejected.csv` | `don_nghi_phep_tu_choi.csv` ✅ |

**→ BUG-P8-01 đã được fix đúng. ✅**

---

## Phần 2 — Verify carry-over bugs từ các phase trước

Phase 9 chỉ thay đổi 2 file: `useMyEmployee.ts` và `EmployeeDashboardPage.tsx`. Không có migration, không có Edge Function mới.

| Bug ID | Mô tả | Trạng thái |
|--------|--------|-----------|
| BUG-P8-01 | Filename CSV không nhất quán | ✅ FIXED trong FIX_BUGS_PHASE_8.md |
| BUG-P5-CRITICAL-01 | `lateCount` ordering trong `calculate-payroll` | ✅ VẪN FIXED — Phase 9 không chạm file này |
| BUG-P5-NEW-01 | `.replace(/ /g, '_')` regex trong AnalyticsPage | ✅ VẪN FIXED |
| BUG-P5-NEW-02 | `special_bonus` trong PayrollPage | ✅ VẪN FIXED |
| BUG-P4-NEW-01 | Audit log wiring | ✅ VẪN FIXED |
| BUG-P3-NEW-01 | Password verify trong ProfilePage | ✅ VẪN FIXED |
| DEBT-P5-01/02/03 | AuditLog type, useInsertAuditLog, totalLateMinutes | ✅ VẪN FIXED |
| DEBT-P7-01 | `usePayrollTrend` 6 queries | ⏸ ACCEPTED |
| DEBT-P9-01 | `useMyTodayShift` 2 queries riêng biệt | ⏸ ACCEPTED (ghi nhận từ handoff) |
| UX-01 (P6) | "Xóa override" không có ConfirmDialog | ⏸ ACCEPTED |
| UX-02 (P6) | Upper bound OT multiplier không validate | ⏸ ACCEPTED |
| OBS-P8-01/02 | AllowanceTab null state, no upper bound allowance | ⏸ ACCEPTED |
| L-09 (trigger leave_balance) | Cần live DB | 🔍 VẪN NEEDS-LIVE |
| L-10 (migration permissions) | Cần live DB | 🔍 VẪN NEEDS-LIVE |

**Kết luận:** Tất cả bugs từ Phase 1–8 không bị ảnh hưởng bởi Phase 9.

---

## Phần 3 — Test tính năng Phase 9: Hook `useMyTodayShift`

### 3.1 `TodayShift` interface và cấu trúc hook

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P9-01 | `TodayShift` interface: `{ name: string; start_time: string; end_time: string }` | ✅ PASS |
| P9-02 | Hook export: `export function useMyTodayShift(employeeId: string \| undefined)` | ✅ PASS |
| P9-03 | Query key: `['my-today-shift', employeeId]` — scoped per employee | ✅ PASS |
| P9-04 | Return type annotation: `Promise<TodayShift \| null>` — explicit, type-safe | ✅ PASS |
| P9-05 | `enabled: !!employeeId` — không query khi chưa có employee | ✅ PASS |
| P9-06 | `if (!employeeId) return null` — early return an toàn | ✅ PASS |

---

### 3.2 Step 1 — Query `shift_schedules` (override)

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P9-07 | `format(new Date(), 'yyyy-MM-dd')` — lấy ngày hôm nay đúng format | ✅ PASS |
| P9-08 | Query `shift_schedules` filter `employee_id = employeeId` AND `date = today` | ✅ PASS |
| P9-09 | Select `shift_id, shifts(name, start_time, end_time)` — JOIN với bảng `shifts` | ✅ PASS |
| P9-10 | `.maybeSingle()` — trả về `null` nếu không có record, không throw | ✅ PASS |
| P9-11 | `if (schedule?.shifts)` — guard trước khi dùng, tránh null access | ✅ PASS |
| P9-12 | Type cast `schedule.shifts as { name, start_time, end_time }` — cần thiết vì Supabase infer kiểu nested join là `unknown` | ✅ PASS |
| P9-13 | Early return khi tìm thấy shift_schedules — Step 2 không chạy nếu Step 1 đã có kết quả | ✅ PASS |

---

### 3.3 Step 2 — Fallback `employee_shift_assignments`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P9-14 | Step 2 chỉ chạy khi Step 1 không có kết quả (`schedule?.shifts` falsy) | ✅ PASS |
| P9-15 | `const month = now.getMonth() + 1` — đúng (getMonth() 0-indexed, cần +1) | ✅ PASS |
| P9-16 | `const year = now.getFullYear()` | ✅ PASS |
| P9-17 | Query `employee_shift_assignments` filter `employee_id + month + year` | ✅ PASS |
| P9-18 | Select `shift_id, shifts(name, start_time, end_time)` — JOIN tương tự Step 1 | ✅ PASS |
| P9-19 | `.maybeSingle()` — không throw khi không có assignment | ✅ PASS |
| P9-20 | `if (assignment?.shifts)` — guard trước khi return | ✅ PASS |
| P9-21 | `return null` khi cả 2 query đều không có dữ liệu — UI hiển thị "Chưa có ca" | ✅ PASS |

---

### 3.4 Lookup priority — đúng theo spec CLAUDE.md

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P9-22 | `shift_schedules` (override ngày cụ thể) được ưu tiên hơn `employee_shift_assignments` (ca tháng) | ✅ PASS — đúng theo CLAUDE.md "Khi cần biết ca của nhân viên X vào ngày Y" |
| P9-23 | Nếu có cả 2 → dùng `shift_schedules` (trả về sớm trước khi query step 2) | ✅ PASS |
| P9-24 | Nếu không có `shift_schedules` cho hôm nay → fallback `employee_shift_assignments` | ✅ PASS |
| P9-25 | Nếu không có cả 2 → `null` → "Chưa có ca" | ✅ PASS |

---

### 3.5 Error handling trong hook

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P9-26 | Step 1 và Step 2 không destructure `error` — DB error bị swallow silently, hook trả về `null` thay vì throw | ⚠️ OBS-P9-01 — xem ghi chú |

**[OBS-P9-01]** Cả 2 query trong `useMyTodayShift` không kiểm tra `error`:
```ts
const { data: schedule } = await supabase...  // error bị bỏ qua
const { data: assignment } = await supabase... // error bị bỏ qua
```
Nếu DB lỗi (network, permissions), hook trả về `null` → UI hiển thị "Chưa có ca" thay vì error state. Trong môi trường production có thể gây nhầm lẫn (user không biết lỗi hay thật sự không có ca). Nhất quán với style của `useMyEmployee` (cũng không check error). **Không block ship — chỉ là thiếu sót UX nhỏ.**

---

## Phần 4 — Test tính năng Phase 9: Dashboard `EmployeeDashboardPage`

### 4.1 Import và dependencies

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P9-27 | `import { useMyEmployee, useMyTodayShift } from '../hooks/useMyEmployee'` — đúng path | ✅ PASS |
| P9-28 | Icons imported: `QrCode, TrendingUp, CalendarDays, FileText, ArrowLeftRight, Clock` — đủ cho tất cả UI | ✅ PASS |
| P9-29 | `useMyTodayShift(employee?.id)` — gọi đúng với optional chaining (`employee?.id = undefined` khi chưa load) | ✅ PASS |

---

### 4.2 Card ca hôm nay

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P9-30 | Card render unconditionally — luôn hiển thị dù có ca hay không | ✅ PASS |
| P9-31 | `todayShift ? (...)  : <p>Chưa có ca</p>` — conditional render đúng | ✅ PASS |
| P9-32 | Khi có ca: hiển thị `{todayShift.name}` + `{start_time.slice(0, 5)}–{end_time.slice(0, 5)}` | ✅ PASS |
| P9-33 | `.slice(0, 5)` trên time string `HH:MM:SS` → `HH:MM` — đúng | ✅ PASS |
| P9-34 | Check-in status bên phải: `todayRecord?.check_in_at` | ✅ PASS |
| P9-35 | Khi đã check-in: `format(new Date(check_in_at), 'HH:mm')` — đúng | ✅ PASS |
| P9-36 | Khi chưa check-in: `<span className="text-slate-400 text-xs">Chưa chấm</span>` | ✅ PASS |
| P9-37 | `todayStr = format(now, 'yyyy-MM-dd')` → `attendance?.find((r) => r.date === todayStr)` — lọc đúng bản ghi hôm nay | ✅ PASS |
| P9-38 | `Clock` icon container: `w-9 h-9 rounded-lg bg-orange-50` — kích thước container hợp lý | ✅ PASS |
| P9-39 | `Clock` icon class: `h-4.5 w-4.5 text-orange-500` | ⚠️ BUG-P9-01 — xem ghi chú |

**[BUG-P9-01] — Low — `EmployeeDashboardPage.tsx:47`**

`h-4.5` và `w-4.5` **không phải utility class hợp lệ** trong Tailwind CSS v3 mặc định. Scale mặc định nhảy từ `h-4` (1rem) thẳng lên `h-5` (1.25rem), không có `4.5`. File `tailwind.config.ts` không extend spacing để thêm `4.5`.

**Hậu quả:** Tailwind JIT sẽ không generate CSS cho `h-4.5`/`w-4.5`. Icon `Clock` render ở kích thước mặc định của Lucide React (24×24px) thay vì ~18×18px. Trong container `36×36px`, icon trông hơi lớn hơn dự kiến nhưng vẫn hiển thị và không vỡ layout.

**Fix đề xuất (1 trong 2):**
```tsx
// Option 1: dùng class hợp lệ gần nhất
<Clock className="h-4 w-4 text-orange-500" />   // 16px — nhỏ hơn 1 chút
<Clock className="h-5 w-5 text-orange-500" />   // 20px — lớn hơn 1 chút

// Option 2: arbitrary value
<Clock className="h-[18px] w-[18px] text-orange-500" />
```

---

### 4.3 Grid 4 thao tác nhanh — cấu trúc

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P9-40 | `quickActions` array có đúng 4 phần tử | ✅ PASS |
| P9-41 | Phần tử 1: `{ label: 'Chấm công', icon: QrCode, path: '/checkin', color: 'text-orange-500', bg: 'bg-orange-50' }` | ✅ PASS |
| P9-42 | Phần tử 2: `{ label: 'Lịch sử', icon: CalendarDays, path: '/attendance', color: 'text-blue-500', bg: 'bg-blue-50' }` | ✅ PASS |
| P9-43 | Phần tử 3: `{ label: 'Xin nghỉ', icon: FileText, path: '/leave', color: 'text-green-500', bg: 'bg-green-50' }` | ✅ PASS |
| P9-44 | Phần tử 4: `{ label: 'Đổi ca', icon: ArrowLeftRight, path: '/shift-change', color: 'text-purple-500', bg: 'bg-purple-50' }` | ✅ PASS |

---

### 4.4 Grid 4 thao tác nhanh — routes

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P9-45 | Route `/checkin` có trong `router.tsx` (line 121) | ✅ PASS |
| P9-46 | Route `/attendance` có trong `router.tsx` (line 122) | ✅ PASS |
| P9-47 | Route `/leave` có trong `router.tsx` (line 123) | ✅ PASS |
| P9-48 | Route `/shift-change` có trong `router.tsx` (line 124) | ✅ PASS |

---

### 4.5 Grid 4 thao tác nhanh — UI và behavior

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P9-49 | Container: `grid grid-cols-4 gap-3 mb-5` — 4 cột đều nhau | ✅ PASS |
| P9-50 | Mỗi button: `onClick={() => navigate(path)}` — navigate đúng | ✅ PASS |
| P9-51 | Button style: `rounded-xl border bg-white hover:bg-slate-50 active:scale-95 transition-transform` — có animation press | ✅ PASS |
| P9-52 | Icon container: `w-10 h-10 rounded-lg ${bg}` — màu nền đúng theo từng action | ✅ PASS |
| P9-53 | Icon: `h-5 w-5 ${color}` — valid Tailwind class (h-5 = 1.25rem) | ✅ PASS |
| P9-54 | Label: `text-xs font-medium text-slate-600` | ✅ PASS |
| P9-55 | `key={path}` trong map — unique key dùng path (không phải index) | ✅ PASS |
| P9-56 | Không còn nút "Chấm công QR" standalone full-width trong code | ✅ PASS |

---

### 4.6 Tính nhất quán với handoff spec

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P9-57 | Icon màu cam cho "Chấm công": `text-orange-500` ✅, spec ghi "Cam" | ✅ PASS |
| P9-58 | Icon màu xanh dương cho "Lịch sử": `text-blue-500` ✅, spec ghi "Xanh dương" | ✅ PASS |
| P9-59 | Icon màu xanh lá cho "Xin nghỉ": `text-green-500` ✅, spec ghi "Xanh lá" | ✅ PASS |
| P9-60 | Icon màu tím cho "Đổi ca": `text-purple-500` ✅, spec ghi "Tím" | ✅ PASS |

---

## Phần 5 — Test cases cần live environment

| # | Feature | Cần test |
|---|---------|---------|
| L-01 | **Card ca hôm nay — có ca tháng** | Nhân viên có `employee_shift_assignments` → thấy tên ca và giờ |
| L-02 | **Card ca hôm nay — có override** | Nhân viên có `shift_schedules` override hôm nay → thấy ca override (không phải ca tháng) |
| L-03 | **Card ca hôm nay — không có ca** | Nhân viên không được assign ca → "Chưa có ca" |
| L-04 | **Check-in status** | Nhân viên đã chấm công → bên phải card hiển thị "Check-in HH:MM" |
| L-05 | **Chưa check-in** | Nhân viên chưa chấm → "Chưa chấm" |
| L-06 | **Quick actions navigation** | Click từng button → navigate đúng route |
| L-07 | **Grid layout mobile** | 4 buttons hiển thị đều trên màn hình điện thoại nhỏ (320–375px width) |
| L-08 | **Clock icon size** | Verify BUG-P9-01: icon `Clock` có render đúng kích thước không? (`h-4.5` invalid Tailwind class) |
| L-09 | **Trigger leave_balance** (từ Phase 5) | Tạo nhân viên mới → `leave_balances` có bản ghi tự động |
| L-10 | **Migration permissions** (từ Phase 5) | Không có "permission denied" khi query |

---

## Phần 6 — Tổng kết

### Kết quả test

| Hạng mục | Số lượng |
|----------|---------|
| Test cases tổng | 60 |
| PASS | 57 |
| BUG (mới phát hiện) | 1 (P9-39 — Low) |
| OBSERVATION (không block ship) | 1 (P9-26) |
| NEEDS-LIVE | 10 |

---

### BUG-P8-01 — Verified FIXED ✅

`STATUS_FILE_LABELS` map đã được thêm đúng. Tất cả filenames CSV giờ nhất quán tiếng Việt không dấu.

---

### Bug mới phát hiện

| ID | Mô tả | Mức độ | File |
|----|--------|--------|------|
| BUG-P9-01 | `Clock` icon dùng `h-4.5 w-4.5` — **không phải Tailwind class hợp lệ** trong config hiện tại. Icon render ở 24px (default Lucide) thay vì ~18px. Layout không vỡ nhưng icon to hơn thiết kế. | Low | `EmployeeDashboardPage.tsx:47` |

---

### Observations (không block ship)

| # | Mô tả | Mức độ |
|---|--------|--------|
| OBS-P9-01 | `useMyTodayShift` không check `error` từ cả 2 Supabase queries. DB error → hook trả `null` → UI hiển thị "Chưa có ca" thay vì error state. Không phải bug, chỉ thiếu defensive UX. Nhất quán với style của hook `useMyEmployee`. | Info |

---

### Carry-over từ phase trước

| Hạng mục | Trạng thái |
|----------|-----------|
| BUG-P8-01 | ✅ FIXED — Verified |
| Tất cả bugs từ Phase 1–7 | ✅ Vẫn fixed |
| UX-01, UX-02 (P6) | ⏸ Accepted |
| DEBT-P7-01, DEBT-P9-01 | ⏸ Accepted |
| OBS-P8-01, OBS-P8-02 | ⏸ Accepted |
| L-09, L-10 (live verify) | 🔍 Vẫn cần verify |

---

### Verdict

**⚠️ PASS với 1 bug Low**

**BUG-P9-01** là styling issue nhỏ — layout không vỡ, chức năng vẫn hoạt động đúng. Có thể ship và fix trong iteration tiếp, hoặc fix ngay bằng cách đổi `h-4.5 w-4.5` thành `h-4 w-4` hoặc `h-5 w-5`.

**Deploy checklist Phase 9:**
1. Không có migration mới cần chạy
2. Không có Edge Function mới cần deploy
3. *(Nếu chưa từ Phase 8)* Chạy migration `20260521000005_branch_default_allowance.sql`
4. *(Nếu chưa từ Phase 5–7)* Chạy các migration: `000001` → `000002` → `000003` → `000004`
5. *(Nếu chưa từ Phase 6)* Deploy Edge Functions: `calculate-payroll`, `salary-preview`

**Không có bugs bắt buộc fix trước khi ship. BUG-P9-01 là Low và có thể defer.**
