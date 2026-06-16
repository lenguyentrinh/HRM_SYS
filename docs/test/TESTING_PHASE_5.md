# Testing Phase 5 – Hoàn thiện & Nâng cao

**QC:** Senior QC (static code review)  
**Ngày test:** 2026-05-19  
**Phạm vi:** Tất cả bugs từ FIX_BUGS_PHASE_3_4.md + tất cả tính năng mới trong PHASE_5_HANDOFF.md  
**Phương pháp:** Đọc source code, trace logic, không có môi trường Supabase live

---

## Phần 1 — Verify bugs từ FIX_BUGS_PHASE_3_4.md

### 1.1 Tablet link trong AdminSidebar

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| F-01 | `AdminSidebar.tsx`: có `<a href="/tablet/${branchId}" target="_blank">` ở cuối sidebar | ✅ PASS |
| F-02 | Guard `{branchId && (...)}` — link ẩn khi admin không có branch | ✅ PASS |

**Kết quả:** FIXED ✓

---

### 1.2 Phạt đi trễ — per-occurrence thay vì per-minute

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| F-03 | `SettingsPage.tsx`: label là `Phạt đi trễ (₫/lần)` | ✅ PASS |
| F-04 | `salary-preview/index.ts`: `latePenalty = lateCount * config.late_penalty_per_minute` (line 127) | ✅ PASS |
| F-05 | `calculate-payroll/index.ts`: `latePenalty = lateCount * config.late_penalty_per_minute` (line 156) | ⚠️ PASS (formula đúng) nhưng có lỗi nghiêm trọng khác — xem BUG-P5-CRITICAL-01 |

**Kết quả:** Formula được đổi đúng, nhưng calculate-payroll có ReferenceError tách biệt.

---

### 1.3 [BUG-P4-NEW-01] Audit log wiring

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| F-06 | `useLeaves.ts`: `leave_approved` insert với `table_name: 'leave_requests'` | ✅ PASS |
| F-07 | `useLeaves.ts`: `leave_rejected` insert với `table_name: 'leave_requests'` | ✅ PASS |
| F-08 | `usePayroll.ts`: `payroll_confirmed` insert với `table_name: 'payroll_records'` | ✅ PASS |
| F-09 | `useShiftChange.ts`: `shift_change_approved` insert với `table_name: 'shift_change_requests'` | ✅ PASS |
| F-10 | `useShiftChange.ts`: `shift_change_rejected` insert với `table_name: 'shift_change_requests'` | ✅ PASS |
| F-11 | `useEmployees.ts`: `employee_created` insert với `table_name: 'employees'` | ✅ PASS |
| F-12 | `useEmployees.ts`: `employee_updated` insert với `table_name: 'employees'` | ✅ PASS |
| F-13 | `useEmployees.ts`: `password_reset` insert với `table_name: 'users'` | ✅ PASS |
| F-14 | `useAttendance.ts`: `manual_attendance` insert với `table_name: 'attendance_records'` | ✅ PASS |
| F-15 | DB schema (initial_schema.sql line 317): `table_name TEXT NOT NULL` tồn tại trong `audit_logs` | ✅ PASS |

**Kết quả:** BUG-P4-NEW-01 FIXED ✓ — Tất cả audit log events đã được wired đúng cách.

---

### 1.4 [BUG-P4-NEW-03] Payroll CSV filename có space

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| F-16 | `PayrollPage.tsx` line 131: `label.replace(/ /g, '_')` (regex, fix nhiều space) | ✅ PASS |

**Kết quả:** BUG-P4-NEW-03 FIXED ✓

---

### 1.5 [BUG-P4-NEW-04] Bulk import drag-and-drop

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| F-17 | `BulkImportDialog.tsx`: `onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}` | ✅ PASS |
| F-18 | `BulkImportDialog.tsx`: `onDrop` lấy `e.dataTransfer.files[0]`, set vào state | ✅ PASS |

**Kết quả:** BUG-P4-NEW-04 FIXED ✓

---

### 1.6 [BUG-P4-NEW-05] Tab "Yêu cầu" không active khi ở `/shift-change`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| F-19 | `EmployeeLayout.tsx`: `leaveGroupRoutes = ['/leave', '/shift-change']` | ✅ PASS |
| F-20 | Logic `isLeaveGroup = to === '/leave' && leaveGroupRoutes.includes(location.pathname)` | ✅ PASS |
| F-21 | `isActive || isLeaveGroup` → cả hai route đều highlight tab "Yêu cầu" | ✅ PASS |

**Kết quả:** BUG-P4-NEW-05 FIXED ✓

---

### 1.7 [BUG-P3-NEW-01] Đổi mật khẩu không verify mật khẩu cũ

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| F-22 | `ProfilePage.tsx`: Input "Mật khẩu hiện tại" bind vào `currentPw` (line 96-113) | ✅ PASS |
| F-23 | `handleChangePassword`: gọi `loginWithPhone(user.phone, currentPw)` trước khi đổi (line 49) | ✅ PASS |
| F-24 | Button disabled khi `!currentPw || !newPw || !confirmPw || loading` (line 149) | ✅ PASS |
| F-25 | Error mapping: `msg.includes('không đúng')` → "Mật khẩu hiện tại không đúng" | ✅ PASS |

**Kết quả:** BUG-P3-NEW-01 FIXED ✓

---

### 1.8 [BUG-P2-07] Unlinked employee — loading vô hạn

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| F-26 | FIX_BUGS file xác nhận đã fix trước đó — confirmed không cần sửa thêm | ✅ CONFIRMED FIXED |

---

### Tổng kết bugs từ FIX_BUGS_PHASE_3_4.md

| Bug | Trạng thái |
|-----|-----------|
| Tablet link | ✅ FIXED |
| Phạt ₫/lần | ✅ FIXED (formula đúng) |
| BUG-P4-NEW-01 (Audit log) | ✅ FIXED |
| BUG-P4-NEW-03 (CSV filename) | ✅ FIXED |
| BUG-P4-NEW-04 (Drag-and-drop) | ✅ FIXED |
| BUG-P4-NEW-05 (Tab active) | ✅ FIXED |
| BUG-P3-NEW-01 (Password verify) | ✅ FIXED |
| BUG-P2-07 (Loading vô hạn) | ✅ CONFIRMED FIXED |

---

## Phần 2 — Test tính năng mới Phase 5

### 2.1 Fix PayrollPage — Nút "Tính lương" bị disabled sai

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P5-01 | `PayrollPage.tsx` line 104: `const hasRecords = (records?.length ?? 0) > 0` | ✅ PASS |
| P5-02 | `allDraft = hasRecords && records?.every(r => r.status === 'draft')` — không còn vacuous truth | ✅ PASS |
| P5-03 | `allConfirmed = hasRecords && records?.every(r => r.status === 'confirmed')` | ✅ PASS |
| P5-04 | Button "Tính lương": `disabled={calculate.isPending \|\| allConfirmed}` — khi `!hasRecords`, `allConfirmed = false`, nút enabled | ✅ PASS |
| P5-05 | Nút "Xác nhận bảng lương" chỉ hiện khi `hasRecords && allDraft` | ✅ PASS |

**Kết quả:** PASS ✓ — Logic vacuous truth đã được fix đúng cách.

---

### 2.2 Thưởng/Phạt đặc biệt (employee_bonuses)

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P5-06 | Migration `20260521000001_employee_bonuses.sql`: bảng `employee_bonuses` đầy đủ columns | ✅ PASS |
| P5-07 | RLS: `allow_all` policy cho `employee_bonuses` | ✅ PASS |
| P5-08 | Migration thêm `special_bonus NUMERIC(12,0) NOT NULL DEFAULT 0` vào `payroll_records` | ✅ PASS |
| P5-09 | `useEmployeeBonuses.ts`: hooks list, add, delete đầy đủ | ✅ PASS |
| P5-10 | `useAddEmployeeBonus`: `amount` âm cho phạt, dương cho thưởng | ✅ PASS |
| P5-11 | `useDeleteEmployeeBonus`: invalidate đúng queryKey có `employeeId, month, year` | ✅ PASS |
| P5-12 | `EmployeeDetailPage.tsx`: tab "Thưởng/Phạt" với month selector, form thêm, danh sách, nút xóa, tổng | ✅ PASS |
| P5-13 | `bonusType === 'penalty'` → `amount = -Number(bonusAmount)` — phạt là số âm | ✅ PASS |
| P5-14 | `EmployeeBonus` interface trong `database.ts` đầy đủ | ✅ PASS |
| P5-15 | `calculate-payroll/index.ts`: tổng bonuses per employee qua `bonusMap`, cộng vào `grossSalary` | ✅ PASS |
| P5-16 | Guard `hasBonusTable`: nếu bảng chưa có, `special_bonus` không được thêm vào record (phòng migration chưa chạy) | ✅ PASS |

**Kết quả:** PASS ✓ — Feature Thưởng/Phạt hoàn chỉnh.

---

### 2.3 Lịch sử lương trong Employee Detail

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P5-17 | `EmployeeDetailPage.tsx`: tab "Lịch sử lương" (`value="payroll-history"`) | ✅ PASS |
| P5-18 | Dùng `useMyPayrollRecords(id)` — xem lương của employee cụ thể | ✅ PASS |
| P5-19 | Bảng gồm: Tháng, Ngày công, Lương CB, OT, Thưởng/Phạt, Gross, Thực nhận, Trạng thái | ✅ PASS |
| P5-20 | Tính `bonusPenalty = attendance_bonus + special_bonus - late_penalty - absent_penalty` (line 265) — bao gồm `special_bonus` | ✅ PASS |
| P5-21 | EmptyState khi chưa có lịch sử lương | ✅ PASS |

**Kết quả:** PASS ✓

---

### 2.4 Audit log mở rộng (employee_created, employee_updated, password_reset, manual_attendance)

*Đã verify đầy đủ ở Phần 1 (F-11 đến F-14).*

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P5-22 | `manual_attendance` audit log + notification chạy song song với `Promise.all(tasks)` | ✅ PASS |
| P5-23 | Notification gửi cho employee khi có `user_id` (không gửi nếu chưa liên kết tài khoản) | ✅ PASS |

**Kết quả:** PASS ✓

---

### 2.5 Export CSV danh sách nhân viên

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P5-24 | `EmployeeListPage.tsx`: nút "Xuất CSV" có `onClick={handleExportCSV}` — BUG-P4-NEW-02 FIXED | ✅ PASS |
| P5-25 | `handleExportCSV`: query Supabase với filters hiện tại (search, status, type) không phân trang | ✅ PASS |
| P5-26 | Columns: Mã NV, Họ tên, Phòng ban, Chức vụ, Loại, Lương CB, Phụ cấp, Ngày vào làm, Trạng thái | ✅ PASS |
| P5-27 | `downloadCSV('nhanvien.csv', ...)` — không có ngày trong filename (spec nói `nhan_vien_YYYYMMDD.csv`) | ⚠️ UX — spec mismatch nhẹ, không phải bug chức năng |
| P5-28 | Guard `if (!data?.length) return` — không tải file khi không có data | ✅ PASS |

**Kết quả:** PASS ✓ (minor spec mismatch ở tên file)

---

### 2.6 Export CSV Analytics

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P5-29 | `AnalyticsPage.tsx`: nút "Xuất CSV" có `onClick={handleExportCSV}`, chỉ hiện khi có `data.rankings` | ✅ PASS |
| P5-30 | Columns: Xếp hạng, Mã NV, Họ tên, Ngày công, Vắng, Trễ (lần), Tỷ lệ (%), Thực nhận | ✅ PASS |
| P5-31 | `downloadCSV(\`baocao_${label.replace(' ', '_')}.csv\`)` — `replace(' ', '_')` chỉ replace lần đầu | ❌ FAIL — **BUG-P5-NEW-01** |

**Kết quả:** FAIL — xem BUG-P5-NEW-01

---

### 2.7 OT multiplier đúng loại ngày trong salary-preview

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P5-32 | `salary-preview/index.ts`: fetch `holidays` trong date range | ✅ PASS |
| P5-33 | Với mỗi attendance record có OT, kiểm tra `isHoliday` → `isWeekend` → weekday | ✅ PASS |
| P5-34 | Multiplier: holiday=3.0, weekend=2.0, weekday=1.5 từ `payroll_config` | ✅ PASS |
| P5-35 | `totalLateMinutes` vẫn được khai báo nhưng không dùng (line 102) | ⚠️ DEBT — dead variable |

**Kết quả:** PASS ✓ — LIMIT-P4-01 FIXED

---

### 2.8 Trigger seed leave_balance khi tạo nhân viên

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P5-36 | Migration `20260521000002_leave_balance_trigger_fix.sql`: `CREATE OR REPLACE FUNCTION seed_leave_balance()` | ✅ PASS |
| P5-37 | Function query `leave_policies` theo `branch_id + employee_type` | ✅ PASS |
| P5-38 | Fallback `v_total_days := 12` nếu không có policy | ✅ PASS |
| P5-39 | `ON CONFLICT (employee_id, year) DO NOTHING` — an toàn nếu đã có record | ✅ PASS |
| P5-40 | Migration chỉ `CREATE OR REPLACE FUNCTION`, không tạo trigger mới — trigger phải đã có từ trước | 🔍 NEEDS-LIVE — cần verify trigger tồn tại trong DB |

**Kết quả:** PASS logic ✓ — cần verify trigger registration trên live DB.

---

### 2.9 Clear roster button

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P5-41 | `RosterPage.tsx`: icon Trash2 ở mỗi hàng nhân viên, `onClick={() => setClearEmpId(emp.id)}` | ✅ PASS |
| P5-42 | `ConfirmDialog` open khi `!!clearEmpId` | ✅ PASS |
| P5-43 | `clearRoster.mutate({ employeeId: clearEmpId, month, year })` | ✅ PASS |
| P5-44 | `useClearEmployeeRoster.ts`: xóa `shift_schedules` theo `employee_id + date range` của tháng | ✅ PASS |
| P5-45 | Sau xóa: `qc.invalidateQueries(['roster-schedules'])` — grid cập nhật, hiển thị ca mặc định | ✅ PASS |
| P5-46 | `onOpenChange={(o) => { if (!o) setClearEmpId(null) }}` — reset state khi đóng dialog | ✅ PASS |

**Kết quả:** PASS ✓ — LIMIT-P4-03 FIXED

---

## Phần 3 — Bugs mới phát hiện trong Phase 5

---

### 🔴 BUG-P5-CRITICAL-01 — `calculate-payroll`: `lateCount` dùng trước khi khai báo

**Mức độ:** CRITICAL  
**File:** `supabase/functions/calculate-payroll/index.ts`

**Mô tả:**  
Trong vòng lặp `for (const emp of employees)`, biến `lateCount` được dùng trên **line 156** nhưng chỉ được khai báo bằng `const` trên **line 160**. Trong JavaScript/TypeScript, `const` không được hoisted — truy cập trước khai báo gây `ReferenceError: Cannot access 'lateCount' before initialization`.

```ts
// Line 156 — DÙNG lateCount (chưa khai báo → ReferenceError!)
const latePenalty = lateCount * (config.late_penalty_per_minute ?? 0)
const absentPenalty = absentDays * (config.absent_penalty_per_day ?? 0)

// Line 160 — KHAI BÁO lateCount (quá muộn)
const lateCount = empAtt.filter((a) => a.status === 'late').length
```

**Ảnh hưởng:**  
Mọi lần bấm "Tính lương" → Edge Function throw `ReferenceError` → trả về HTTP 500 → `toast.error('Lỗi tính lương')`. Tính năng tính lương **hoàn toàn không hoạt động**.

**Root cause:**  
Khi refactor từ `totalLateMinutes × rate` sang `lateCount × rate`, dev đổi formula ở line 156 nhưng quên move khai báo `lateCount` lên trước.

**Fix:**  
Chuyển `const lateCount = empAtt.filter((a) => a.status === 'late').length` lên trước `const latePenalty = ...` (có thể đặt ngay sau `const absentDays = ...` ở line 132).

---

### 🟡 BUG-P5-NEW-01 — AnalyticsPage CSV filename vẫn có space

**Mức độ:** Low  
**File:** `src/features/admin/pages/AnalyticsPage.tsx` (line 118)

**Mô tả:**  
```ts
downloadCSV(`baocao_${label.replace(' ', '_')}.csv`, ...)
```
`String.replace(string, string)` chỉ thay thế lần xuất hiện đầu tiên. Label "tháng 5 2026" → `"baocao_tháng_5 2026.csv"` (còn space trước năm). Cùng bug với BUG-P4-NEW-03 đã fix ở PayrollPage nhưng không fix ở AnalyticsPage.

**Fix:** `.replace(' ', '_')` → `.replace(/ /g, '_')`

---

### 🟡 BUG-P5-NEW-02 — PayrollPage "Thưởng/Phạt" column không gồm `special_bonus`

**Mức độ:** Medium  
**File:** `src/features/payroll/pages/PayrollPage.tsx` (line 215)

**Mô tả:**  
```ts
const bonusPenalty = rec.attendance_bonus - rec.late_penalty - rec.absent_penalty
```
`special_bonus` bị bỏ qua. Kết quả: cột "Thưởng/Phạt" trong bảng lương hiển thị không đúng khi có thưởng/phạt đặc biệt. Gross = salary_earned + allowance + OT + `bonusPenalty` + `special_bonus` nhưng cột hiển thị chỉ tính `bonusPenalty` mà không có `special_bonus` → tổng hiển thị ≠ gross_salary.

So sánh: `EmployeeDetailPage.tsx` line 265 tính đúng: `attendance_bonus + special_bonus - late_penalty - absent_penalty`.

**Fix:**  
```ts
const bonusPenalty = rec.attendance_bonus + rec.special_bonus - rec.late_penalty - rec.absent_penalty
```

---

### 🔵 DEBT-P5-01 — `AuditLog` TypeScript type thiếu `table_name`

**Mức độ:** Low/Technical Debt  
**File:** `src/types/database.ts`

**Mô tả:**  
`interface AuditLog` không có field `table_name`, dù DB schema từ Phase 1 có `table_name TEXT NOT NULL`. Khi đọc `audit_logs` và cast sang `AuditLog`, field `table_name` không được typed. Không gây lỗi runtime nhưng sai về type safety.

---

### 🔵 DEBT-P5-02 — `useInsertAuditLog()` hook không có `table_name`

**Mức độ:** Low/Technical Debt  
**File:** `src/features/audit/hooks/useAuditLogs.ts`

**Mô tả:**  
Hook `useInsertAuditLog()` (thiết kế cho external use) thực hiện insert mà không có `table_name`:
```ts
await supabase.from('audit_logs').insert({
  branch_id: branchId,
  user_id: userId,
  ...log,  // log không có table_name
})
```
Nếu ai gọi hook này, insert sẽ fail với NOT NULL constraint violation. Hiện tại không có file nào import hook này (xác nhận từ Phase 4), nhưng hook được export public, có thể được dùng trong tương lai.

---

### 🔵 DEBT-P5-03 — Unused `totalLateMinutes` trong `salary-preview`

**Mức độ:** Info  
**File:** `supabase/functions/salary-preview/index.ts` (line 102)

**Mô tả:**  
```ts
const totalLateMinutes = records.reduce((sum, a) => sum + (a.late_minutes ?? 0), 0)
```
Biến này được khai báo nhưng không được dùng (bị thay bởi `lateCount`). Dead code từ khi refactor per-minute → per-occurrence.

---

## Phần 4 — Test cases cần live environment

| # | Feature | Cần test |
|---|---------|---------|
| L-01 | **Tính lương** | Sau fix BUG-P5-CRITICAL-01: deploy function mới, bấm "Tính lương", verify kết quả đúng |
| L-02 | **Thưởng/Phạt + Tính lương** | Thêm thưởng 500K → tính lương → cột `special_bonus` khớp |
| L-03 | **Audit log** | Duyệt đơn nghỉ → `/admin/audit` thấy `leave_approved` |
| L-04 | **Audit log** | Tạo nhân viên → `/admin/audit` thấy `employee_created` |
| L-05 | **Leave balance trigger** | Tạo nhân viên mới → `leave_balances` có bản ghi năm hiện tại đúng policy |
| L-06 | **Clear roster** | Click Trash, confirm → grid xóa override, hiện ca mặc định |
| L-07 | **OT multiplier** | Nhân viên có OT ngày lễ → salary-preview OT pay cao hơn ngày thường |

---

## Phần 5 — Tổng kết

### Bugs fix verify (từ FIX_BUGS_PHASE_3_4.md)

| Bug | Kết quả |
|-----|---------|
| Tablet link | ✅ FIXED |
| Phạt ₫/lần (Settings + salary-preview) | ✅ FIXED |
| calculate-payroll phạt ₫/lần | ⚠️ Formula đúng nhưng có CRITICAL bug khác |
| BUG-P4-NEW-01 (audit log wiring) | ✅ FIXED |
| BUG-P4-NEW-02 (dead Export button) | ✅ FIXED |
| BUG-P4-NEW-03 (CSV filename) | ✅ FIXED |
| BUG-P4-NEW-04 (drag-and-drop) | ✅ FIXED |
| BUG-P4-NEW-05 (tab active) | ✅ FIXED |
| BUG-P3-NEW-01 (password verify) | ✅ FIXED |
| BUG-P2-07 (loading vô hạn) | ✅ CONFIRMED FIXED |

### Phase 5 tính năng mới

| Tính năng | Kết quả |
|-----------|---------|
| PayrollPage vacuous truth fix | ✅ PASS |
| Thưởng/Phạt đặc biệt (UI + migration + hooks) | ✅ PASS |
| Lịch sử lương trong Employee Detail | ✅ PASS |
| Audit log mở rộng (employee, attendance) | ✅ PASS |
| Export CSV nhân viên | ✅ PASS |
| Export CSV analytics | ❌ FAIL (BUG-P5-NEW-01) |
| OT multiplier đúng trong salary-preview | ✅ PASS |
| Leave balance trigger update | ✅ PASS |
| Clear roster button | ✅ PASS |
| Late penalty per-occurrence (salary-preview) | ✅ PASS |
| Late penalty per-occurrence (calculate-payroll formula) | ⚠️ Formula đúng, nhưng có lỗi ReferenceError riêng biệt |

### Bugs mới phát hiện

| ID | Mức độ | Mô tả |
|----|--------|-------|
| BUG-P5-CRITICAL-01 | **CRITICAL** | `calculate-payroll`: `lateCount` dùng trước khai báo → `ReferenceError` mỗi lần "Tính lương" |
| BUG-P5-NEW-01 | Low | Analytics CSV filename: `replace(' ', '_')` → còn space trước năm |
| BUG-P5-NEW-02 | Medium | PayrollPage "Thưởng/Phạt" column bỏ qua `special_bonus` |
| DEBT-P5-01 | Low | `AuditLog` TypeScript type thiếu `table_name` field |
| DEBT-P5-02 | Low | `useInsertAuditLog()` hook sẽ fail NOT NULL nếu ai dùng |
| DEBT-P5-03 | Info | Unused `totalLateMinutes` trong `salary-preview` |

---

### Verdict (vòng test đầu)

**🔴 KHÔNG ship được** cho đến khi fix **BUG-P5-CRITICAL-01** — tính năng "Tính lương" hoàn toàn bị vỡ.

**Ưu tiên fix trước khi ship:**
1. **[CRITICAL]** Fix `lateCount` ordering trong `calculate-payroll/index.ts` → redeploy function
2. **[Medium]** Fix `special_bonus` trong PayrollPage display column (line 215)
3. **[Low]** Fix Analytics CSV filename (regex replace)

**Deploy checklist sau khi fix:**
- `supabase functions deploy calculate-payroll` (fix BUG-P5-CRITICAL-01 + special_bonus)
- `supabase functions deploy salary-preview` (OT multiplier + ₫/lần đã fix)
- Chạy migration `20260521000001_employee_bonuses.sql`
- Chạy migration `20260521000002_leave_balance_trigger_fix.sql`
- Verify trigger `seed_leave_balance` tồn tại trong DB (L-05)

---

## Phần 6 — Verify FIX_BUGS_PHASE_5.md (vòng test thứ 2, 2026-05-19)

### 6.1 [BUG-P5-CRITICAL-01] `calculate-payroll`: `lateCount` dùng trước khi khai báo

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| R-01 | `calculate-payroll/index.ts` line 155: `const lateCount = empAtt.filter((a) => a.status === 'late').length` — nằm TRƯỚC `latePenalty` | ✅ FIXED |
| R-02 | Line 157: `const latePenalty = lateCount * (config.late_penalty_per_minute ?? 0)` — dùng `lateCount` SAU khai báo | ✅ FIXED |
| R-03 | Thứ tự: `lateCount` (155) → `salaryEarned` (156) → `latePenalty` (157) — không còn temporal dead zone | ✅ FIXED |

**Kết quả:** BUG-P5-CRITICAL-01 FIXED ✓

---

### 6.2 [BUG-P5-NEW-01] AnalyticsPage CSV filename có space

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| R-04 | `AnalyticsPage.tsx` line 118: `label.replace(/ /g, '_')` — đã dùng regex | ✅ FIXED |

**Kết quả:** BUG-P5-NEW-01 FIXED ✓

---

### 6.3 [BUG-P5-NEW-02] PayrollPage "Thưởng/Phạt" column bỏ qua `special_bonus`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| R-05 | `PayrollPage.tsx` line 215: `bonusPenalty = rec.attendance_bonus + rec.special_bonus - rec.late_penalty - rec.absent_penalty` | ✅ FIXED |

**Kết quả:** BUG-P5-NEW-02 FIXED ✓

---

### 6.4 [DEBT-P5-01] `AuditLog` TypeScript type thiếu `table_name`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| R-06 | `database.ts`: `interface AuditLog` có `table_name: string` | ✅ FIXED |

**Kết quả:** DEBT-P5-01 FIXED ✓

---

### 6.5 [DEBT-P5-02] `useInsertAuditLog()` hook không có `table_name` trong param

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| R-07 | `useAuditLogs.ts`: `mutationFn` nhận `{ action, table_name: string, target_type?, target_id?, details? }` — `table_name` required | ✅ FIXED |

**Kết quả:** DEBT-P5-02 FIXED ✓

---

### 6.6 [DEBT-P5-03] Unused `totalLateMinutes` trong `salary-preview`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| R-08 | `salary-preview/index.ts`: dòng `const totalLateMinutes = records.reduce(...)` đã bị xóa | ✅ FIXED |
| R-09 | Từ line 102: `absentDays` → `lateCount` → `salaryEarned` — sạch, không còn dead variable | ✅ FIXED |

**Kết quả:** DEBT-P5-03 FIXED ✓

---

### 6.7 Migration mới — `20260521000003_grant_table_permissions.sql`

Migration này không có trong PHASE_5_HANDOFF nhưng xuất hiện trong deploy checklist của FIX_BUGS_PHASE_5.md.

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| R-10 | `GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role` | ✅ PASS |
| R-11 | `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role` | ✅ PASS |
| R-12 | `GRANT ALL ON ALL SEQUENCES / ROUTINES IN SCHEMA public` | ✅ PASS |
| R-13 | `ALTER DEFAULT PRIVILEGES` — các bảng tạo mới trong tương lai cũng được grant tự động | ✅ PASS |
| R-14 | Comment giải thích: fix "permission denied for table X" xảy ra trước khi RLS được evaluate | ✅ PASS — lý do hợp lý |

**Nhận xét:** Migration này giải quyết một lớp lỗi quan trọng trên production — PostgreSQL từ chối quyền truy cập trước khi RLS được kiểm tra, gây ra `permission denied for table X` trong Edge Functions. Tất cả migration trước đều chỉ dùng `ENABLE ROW LEVEL SECURITY` + policy nhưng thiếu `GRANT` cơ bản. Đây là fix đúng và cần thiết.

---

### 6.8 Tổng kết FIX_BUGS_PHASE_5.md

| Bug/Debt | Kết quả |
|----------|---------|
| BUG-P5-CRITICAL-01 (lateCount ordering) | ✅ FIXED |
| BUG-P5-NEW-01 (Analytics CSV filename) | ✅ FIXED |
| BUG-P5-NEW-02 (PayrollPage special_bonus display) | ✅ FIXED |
| DEBT-P5-01 (AuditLog type) | ✅ FIXED |
| DEBT-P5-02 (useInsertAuditLog table_name) | ✅ FIXED |
| DEBT-P5-03 (unused totalLateMinutes) | ✅ FIXED |
| Migration 20260521000003 (grant permissions) | ✅ VALID |

**6/6 bugs và debts đã được fix. 0 vấn đề mới phát hiện trong vòng test thứ 2.**

---

### Verdict (vòng test thứ 2 — FINAL)

**✅ PASS — Sẵn sàng ship** sau khi hoàn tất deploy checklist.

**Deploy checklist bắt buộc:**
1. `supabase functions deploy calculate-payroll` (BUG-P5-CRITICAL-01 + special_bonus + ₫/lần)
2. `supabase functions deploy salary-preview` (OT multiplier + ₫/lần + dead code cleanup)
3. Chạy migration `20260521000001_employee_bonuses.sql`
4. Chạy migration `20260521000002_leave_balance_trigger_fix.sql`
5. Chạy migration `20260521000003_grant_table_permissions.sql`
6. Verify trigger `seed_leave_balance` tồn tại trong DB (live check — L-05)

**Known issues còn lại (accepted / low priority):**
- `nhanvien.csv` không có ngày trong tên file (minor spec mismatch — UX)
- BarcodeDetector không hỗ trợ iOS Safari (LIMIT từ Phase 2, out of scope)
- Trigger `seed_leave_balance` cần verify tồn tại trên production DB (L-05)
