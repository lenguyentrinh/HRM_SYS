# Fix Bugs – Phase 5 Testing

**Ngày fix:** 2026-05-19  
**Scope:** Tất cả bugs được QC log trong `docs/test/TESTING_PHASE_5.md`

---

## 1. [BUG-P5-CRITICAL-01] `calculate-payroll`: `lateCount` dùng trước khi khai báo

**Mức độ:** CRITICAL  
**File:** `supabase/functions/calculate-payroll/index.ts`

**Root cause:** Khi refactor từ `totalLateMinutes × rate` sang `lateCount × rate`, formula ở line 156 được đổi nhưng `const lateCount = ...` vẫn nằm ở line 160 (sau khi dùng). `const` không được hoisted → `ReferenceError` mỗi lần gọi Edge Function → tính lương hoàn toàn không hoạt động.

**Fix:** Chuyển `const lateCount = empAtt.filter((a) => a.status === 'late').length` lên trước `const salaryEarned = ...`, ngay đầu block "Salary calculation".

**Deploy cần thiết:** `supabase functions deploy calculate-payroll`

---

## 2. [BUG-P5-NEW-01] AnalyticsPage CSV filename vẫn có space

**Mức độ:** Low  
**File:** `src/features/admin/pages/AnalyticsPage.tsx` (line 118)

**Root cause:** Cùng bug với BUG-P4-NEW-03 đã fix ở PayrollPage nhưng bị bỏ sót tại AnalyticsPage. `String.replace(string, string)` chỉ replace lần đầu tiên.

**Fix:** `.replace(' ', '_')` → `.replace(/ /g, '_')`

---

## 3. [BUG-P5-NEW-02] PayrollPage "Thưởng/Phạt" column bỏ qua `special_bonus`

**Mức độ:** Medium  
**File:** `src/features/payroll/pages/PayrollPage.tsx` (line 215)

**Root cause:** `bonusPenalty` chỉ tính `attendance_bonus - late_penalty - absent_penalty`, bỏ qua `special_bonus`. Kết quả cột "Thưởng/Phạt" không khớp với gross salary thực tế khi có thưởng/phạt đặc biệt.

**Fix:**
```ts
// Trước
const bonusPenalty = rec.attendance_bonus - rec.late_penalty - rec.absent_penalty
// Sau
const bonusPenalty = rec.attendance_bonus + rec.special_bonus - rec.late_penalty - rec.absent_penalty
```

---

## 4. [DEBT-P5-01] `AuditLog` TypeScript type thiếu `table_name`

**Mức độ:** Low/Technical Debt  
**File:** `src/types/database.ts`

**Fix:** Thêm `table_name: string` vào `interface AuditLog` để khớp với DB schema (`table_name TEXT NOT NULL`).

---

## 5. [DEBT-P5-02] `useInsertAuditLog()` hook không có `table_name` trong param type

**Mức độ:** Low/Technical Debt  
**File:** `src/features/audit/hooks/useAuditLogs.ts`

**Root cause:** Hook nhận param object không có `table_name`, insert sẽ fail NOT NULL constraint nếu được gọi.

**Fix:** Thêm `table_name: string` (required) vào kiểu tham số của `mutationFn`.

---

## 6. [DEBT-P5-03] Unused `totalLateMinutes` trong `salary-preview`

**Mức độ:** Info/Dead code  
**File:** `supabase/functions/salary-preview/index.ts` (line 102)

**Root cause:** Dead code từ khi refactor per-minute → per-occurrence. Biến được khai báo nhưng không dùng.

**Fix:** Xóa dòng `const totalLateMinutes = records.reduce(...)`.

**Deploy cần thiết:** `supabase functions deploy salary-preview`

---

## Tổng kết

| Hạng mục | Số lượng |
|----------|---------|
| Bugs đã fix | 3 (1 CRITICAL, 1 Medium, 1 Low) |
| Technical debts đã fix | 3 |
| Files thay đổi (frontend) | 3 (`PayrollPage.tsx`, `AnalyticsPage.tsx`, `database.ts`, `useAuditLogs.ts`) |
| Edge functions cần redeploy | 2 (`calculate-payroll`, `salary-preview`) |

## Deploy checklist

- [ ] `supabase functions deploy calculate-payroll`
- [ ] `supabase functions deploy salary-preview`
- [ ] Chạy migration `20260521000001_employee_bonuses.sql` (nếu chưa)
- [ ] Chạy migration `20260521000002_leave_balance_trigger_fix.sql` (nếu chưa)
- [ ] Chạy migration `20260521000003_grant_table_permissions.sql` (nếu chưa)
