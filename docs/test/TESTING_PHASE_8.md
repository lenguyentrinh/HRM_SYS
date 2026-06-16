# Testing Phase 8 – Export Đơn Nghỉ Phép + Settings Phụ Cấp Tab

**QC:** Senior QC (static code review)  
**Ngày test:** 2026-05-21  
**Phạm vi:** Carry-over bugs từ Phase 7 + tính năng mới Phase 8  
**Phương pháp:** Đọc source code, trace logic, không có môi trường Supabase live

---

## Phần 1 — Verify carry-over bugs từ các phase trước

Phase 8 thay đổi 5 file: `LeavePage.tsx`, `useSettings.ts`, `SettingsPage.tsx`, `database.ts`, và migration mới. Không có file nào từng bị bug trong Phase 1–7 bị chạm đến.

| Bug ID | Mô tả | Trạng thái |
|--------|--------|-----------|
| BUG-P5-CRITICAL-01 | `lateCount` ordering trong `calculate-payroll` | ✅ VẪN FIXED — Phase 8 không chạm file này |
| BUG-P5-NEW-01 | `.replace(/ /g, '_')` regex trong AnalyticsPage | ✅ VẪN FIXED — Phase 8 không chạm AnalyticsPage |
| BUG-P5-NEW-02 | `special_bonus` trong PayrollPage display | ✅ VẪN FIXED — Phase 8 không chạm PayrollPage |
| BUG-P4-NEW-01 | Audit log wiring | ✅ VẪN FIXED — Phase 8 không chạm hooks này |
| BUG-P3-NEW-01 | Password verify trong ProfilePage | ✅ VẪN FIXED — Phase 8 không chạm ProfilePage |
| DEBT-P5-01 | `AuditLog` type thiếu `table_name` | ✅ VẪN FIXED |
| DEBT-P5-02 | `useInsertAuditLog` thiếu `table_name` | ✅ VẪN FIXED |
| DEBT-P5-03 | Dead variable `totalLateMinutes` trong salary-preview | ✅ VẪN FIXED |
| DEBT-P7-01 | `usePayrollTrend` 6 query riêng biệt | ⏸ ACCEPTED — không thay đổi |
| UX-01 (P6) | Nút "Xóa override" không có ConfirmDialog | ⏸ ACCEPTED — không thay đổi |
| UX-02 (P6) | Upper bound validation OT multiplier | ⏸ ACCEPTED — không thay đổi |
| Accepted (BarcodeDetector iOS) | Out of scope | ⏸ ACCEPTED |
| Accepted (nhanvien.csv filename) | Minor UX | ⏸ ACCEPTED |
| L-07 (trigger leave_balance) | Cần live DB | 🔍 VẪN NEEDS-LIVE |
| L-08 (migration permissions) | Cần live DB | 🔍 VẪN NEEDS-LIVE |

**Kết luận:** Tất cả bugs từ Phase 1–7 đều không bị ảnh hưởng bởi Phase 8.

---

## Phần 2 — Test tính năng Phase 8: Export CSV đơn nghỉ phép

### 2.1 Import và cấu trúc file

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P8-01 | `import { Download } from 'lucide-react'` có trong `LeavePage.tsx` (line 6) | ✅ PASS |
| P8-02 | `import { downloadCSV } from '@/lib/export'` đúng path (line 16) | ✅ PASS |
| P8-03 | `LEAVE_TYPE_LABELS` định nghĩa đầy đủ 4 loại: `paid`, `unpaid`, `sick`, `other` (lines 18–23) | ✅ PASS |
| P8-04 | `STATUS_LABELS` định nghĩa đầy đủ 3 trạng thái: `pending`, `approved`, `rejected` (lines 25–29) | ✅ PASS |

---

### 2.2 Logic `handleExportCSV`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P8-05 | Guard `if (!filtered.length) return` — không export khi list rỗng | ✅ PASS |
| P8-06 | `const label = statusFilter === 'all' ? 'tat_ca' : statusFilter` | ⚠️ BUG-P8-01 — xem ghi chú bên dưới |
| P8-07 | Headers đủ 9 cột theo spec: STT, Mã NV, Họ tên, Loại nghỉ, Từ ngày, Đến ngày, Số ngày, Lý do, Trạng thái | ✅ PASS |
| P8-08 | `LEAVE_TYPE_LABELS[r.leave_type] ?? r.leave_type` — fallback an toàn nếu loại không có trong map | ✅ PASS |
| P8-09 | `STATUS_LABELS[r.status] ?? r.status` — fallback an toàn nếu status không có trong map | ✅ PASS |
| P8-10 | `r.reason ?? ''` — xử lý null reason, không xuất `null` vào CSV | ✅ PASS |
| P8-11 | `String(i + 1)` — STT bắt đầu từ 1, không phải 0 | ✅ PASS |
| P8-12 | `downloadCSV(\`don_nghi_phep_${label}.csv\`, [headers, ...rows])` — gọi đúng signature | ✅ PASS |

**[BUG-P8-01] — Filename inconsistency**

Handoff checklist ghi: *"Filter 'Tất cả' → Xuất CSV → file tên `don_nghi_phep_all.csv`"*  
Thực tế code: `statusFilter === 'all' ? 'tat_ca' : statusFilter` → tạo ra `don_nghi_phep_tat_ca.csv`.

Thêm vào đó, các filter khác dùng giá trị tiếng Anh thô (`pending`, `approved`, `rejected`):
- `don_nghi_phep_pending.csv`
- `don_nghi_phep_approved.csv`  
- `don_nghi_phep_rejected.csv`

→ Filename không nhất quán: case 'all' dịch sang tiếng Việt (`tat_ca`), còn các case khác giữ nguyên tiếng Anh. Người dùng có thể thấy file tên lạ.  
**Mức độ:** Low (không ảnh hưởng chức năng, chỉ UX)  
**Đề xuất fix:** Dùng Vietnamese labels nhất quán, hoặc giữ nguyên `all` cho case đó.

---

### 2.3 Hàm `downloadCSV` trong `src/lib/export.ts`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P8-13 | UTF-8 BOM được thêm vào đầu blob: `const bom = '﻿'` (line 9) | ✅ PASS |
| P8-14 | `Blob` type đúng: `text/csv;charset=utf-8;` | ✅ PASS |
| P8-15 | Hàm `escape()` xử lý đúng: field có dấu phẩy/ngoặc kép/xuống dòng sẽ được bọc `"..."` | ✅ PASS |
| P8-16 | Double-quote trong value được escape thành `""`: `.replace(/"/g, '""')` | ✅ PASS |
| P8-17 | `URL.revokeObjectURL(url)` được gọi sau click — không leak memory | ✅ PASS |
| P8-18 | Hàm `downloadCSV` là pure utility, tách biệt với business logic — đúng separation of concerns | ✅ PASS |

---

### 2.4 Điều kiện hiển thị nút Xuất CSV

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P8-19 | `actions={filtered.length > 0 ? (...button...) : undefined}` — nút chỉ hiện khi có đơn | ✅ PASS |
| P8-20 | Khi list rỗng (không có đơn hoặc sau khi filter không khớp) → `undefined` → PageHeader không render nút | ✅ PASS |
| P8-21 | Nút có `variant="outline"` với `Download` icon và text "Xuất CSV" đúng theo mô tả handoff | ✅ PASS |
| P8-22 | Nút đặt trong `PageHeader actions` — vị trí góc trên phải đúng theo design pattern | ✅ PASS |

---

### 2.5 Tính toàn vẹn của data filter → export

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P8-23 | `filtered` được tính từ: `requests?.filter((r) => statusFilter === 'all' \|\| r.status === statusFilter) ?? []` | ✅ PASS |
| P8-24 | Khi filter 'pending': chỉ export đơn có `status === 'pending'` | ✅ PASS |
| P8-25 | Khi filter 'all': export tất cả đơn — `statusFilter === 'all'` condition luôn true | ✅ PASS |
| P8-26 | `handleExportCSV` dùng cùng `filtered` array đang hiển thị trên UI — data nhất quán | ✅ PASS |

---

## Phần 3 — Test tính năng Phase 8: Settings tab Phụ cấp

### 3.1 Migration `20260521000005_branch_default_allowance.sql`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P8-27 | `ADD COLUMN IF NOT EXISTS default_allowance_fulltime NUMERIC DEFAULT 0 NOT NULL` | ✅ PASS |
| P8-28 | `ADD COLUMN IF NOT EXISTS default_allowance_parttime NUMERIC DEFAULT 0 NOT NULL` | ✅ PASS |
| P8-29 | `IF NOT EXISTS` — migration idempotent, an toàn khi chạy lại | ✅ PASS |
| P8-30 | `DEFAULT 0` — existing rows trong `branches` sẽ nhận giá trị 0, không break | ✅ PASS |
| P8-31 | `NOT NULL` — đảm bảo field luôn có giá trị, không cần null check trong code | ✅ PASS |
| P8-32 | Type `NUMERIC` (không phải `INTEGER`) — cho phép lưu giá trị lẻ nếu cần trong tương lai | ✅ PASS |

---

### 3.2 TypeScript interface `Branch` trong `database.ts`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P8-33 | `default_allowance_fulltime: number` thêm vào `Branch` interface (line 18) | ✅ PASS |
| P8-34 | `default_allowance_parttime: number` thêm vào `Branch` interface (line 19) | ✅ PASS |
| P8-35 | Type `number` (không phải `number \| null`) — nhất quán với DB `NOT NULL DEFAULT 0` | ✅ PASS |
| P8-36 | Các interface khác dùng `Branch` (`useBranchSettings` select partial) không bị ảnh hưởng vì dùng `Pick<Branch, ...>` chỉ lấy field cần | ✅ PASS |

---

### 3.3 Hook `useAllowanceDefaults`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P8-37 | Query key: `['allowance-defaults', branchId]` — scoped theo branch | ✅ PASS |
| P8-38 | `enabled: !!branchId` — không query khi chưa login | ✅ PASS |
| P8-39 | Return early `null` khi `!branchId` — không throw | ✅ PASS |
| P8-40 | Select đúng 3 field: `id, default_allowance_fulltime, default_allowance_parttime` | ✅ PASS |
| P8-41 | Cast sang `Pick<Branch, 'id' \| 'default_allowance_fulltime' \| 'default_allowance_parttime'>` — type-safe | ✅ PASS |

---

### 3.4 Hook `useUpdateAllowanceDefaults`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P8-42 | `mutationFn` nhận `{ default_allowance_fulltime: number; default_allowance_parttime: number }` — đúng type | ✅ PASS |
| P8-43 | Update `branches` table filter `eq('id', branchId)` — đúng row | ✅ PASS |
| P8-44 | `onSuccess`: invalidate `{ queryKey: ['allowance-defaults'] }` — partial key invalidate đúng cách trong TanStack Query | ✅ PASS |
| P8-45 | Toast `'Đã lưu mức phụ cấp mặc định'` — đúng theo spec | ✅ PASS |
| P8-46 | `onError`: toast error message — error handling đầy đủ | ✅ PASS |

---

### 3.5 Component `AllowanceTab` trong `SettingsPage.tsx`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P8-47 | `isLoading` → render `<CardSkeleton />` — loading state đúng | ✅ PASS |
| P8-48 | `useEffect([defaults, reset])`: khi `defaults` load xong → `reset()` đúng với giá trị từ DB | ✅ PASS |
| P8-49 | Form field "Toàn thời gian (₫/tháng)": `type="number" min={0} step={10000}` | ✅ PASS |
| P8-50 | Form field "Bán thời gian (₫/tháng)": `type="number" min={0} step={10000}` | ✅ PASS |
| P8-51 | `{ valueAsNumber: true }` trong `register()` — parse string → number trước khi submit | ✅ PASS |
| P8-52 | Nút Lưu: `disabled={!isDirty \|\| update.isPending}` — disable khi form chưa thay đổi hoặc đang save | ✅ PASS |
| P8-53 | Nút text đổi: "Đang lưu..." khi `update.isPending` | ✅ PASS |
| P8-54 | Note text giải thích ở cuối form — đúng nội dung spec | ✅ PASS |
| P8-55 | `onSubmit={handleSubmit((v) => update.mutate(v))}` — submit đúng | ✅ PASS |
| P8-56 | `<CardHeader>` có `CardTitle` và `CardDescription` đúng | ✅ PASS |
| P8-57 | Khi `defaults` là `null` (không có branchId hoặc lỗi), `useEffect` không gọi `reset()` → form fields undefined → `isDirty = false` → nút Lưu bị disabled | ⚠️ OBS-P8-01 — xem ghi chú |

---

### 3.6 Tab order và routing trong `SettingsPage`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P8-58 | Tab "Phụ cấp" (`value="allowance"`) nằm sau "Cấu hình lương" và trước "Chính sách nghỉ phép" — đúng theo spec | ✅ PASS |
| P8-59 | `<TabsContent value="allowance">` render `<AllowanceTab />` | ✅ PASS |
| P8-60 | `defaultValue="payroll"` — trang Settings mở vào tab "Cấu hình lương" trước, không đổi | ✅ PASS |
| P8-61 | 5 tabs hiển thị đúng thứ tự: Cấu hình lương → Phụ cấp → Chính sách nghỉ phép → Ngày lễ → Tài khoản nhân viên | ✅ PASS |
| P8-62 | Các tab cũ (Payroll, Leave, Holidays, Account) không bị ảnh hưởng — component không thay đổi | ✅ PASS |

---

## Phần 4 — Test cases cần live environment

| # | Feature | Cần test |
|---|---------|---------|
| L-01 | **Export CSV đơn nghỉ phép** | Vào `/admin/leaves` với dữ liệu → nút "Xuất CSV" hiển thị → click → file tải về |
| L-02 | **Export filter pending** | Chọn filter "Chờ duyệt" → Xuất CSV → file `don_nghi_phep_pending.csv` chỉ chứa đơn pending |
| L-03 | **Export khi list rỗng** | Filter không có đơn nào → nút "Xuất CSV" ẩn hoàn toàn |
| L-04 | **Mở file bằng Excel** | File có UTF-8 BOM → tiếng Việt đọc đúng, không bị mojibake |
| L-05 | **Settings Phụ cấp load** | Vào `/admin/settings` → click tab "Phụ cấp" → thấy form 2 fields với giá trị từ DB |
| L-06 | **Lưu Phụ cấp** | Nhập 500000 → Lưu → toast "Đã lưu mức phụ cấp mặc định" → reload → giá trị vẫn 500000 |
| L-07 | **Nút Lưu isDirty** | Load xong → nút disabled → đổi giá trị → nút enabled → Lưu → nút disabled lại |
| L-08 | **Migration** | Chạy `20260521000005_branch_default_allowance.sql` → không có lỗi → `branches` có 2 cột mới |
| L-09 | **Trigger leave_balance** (từ Phase 5) | Tạo nhân viên mới → `leave_balances` có bản ghi tự động |
| L-10 | **Migration permissions** | `20260521000003_grant_table_permissions.sql` đã chạy → không có "permission denied" |

---

## Phần 5 — Tổng kết

### Kết quả test

| Hạng mục | Số lượng |
|----------|---------|
| Test cases | 62 |
| PASS | 59 |
| BUG (mới phát hiện) | 1 (P8-06) |
| OBSERVATION (không block ship) | 1 (P8-57) |
| NEEDS-LIVE | 10 |

---

### Bugs mới phát hiện

| ID | Mô tả | Mức độ | File |
|----|--------|--------|------|
| BUG-P8-01 | **Filename không nhất quán:** filter 'all' → `don_nghi_phep_tat_ca.csv` (Vietnamese), các filter khác → English raw value (`don_nghi_phep_pending.csv`, `don_nghi_phep_approved.csv`, `don_nghi_phep_rejected.csv`). Handoff checklist kỳ vọng `don_nghi_phep_all.csv` cho case 'all'. | Low | `LeavePage.tsx:45` |

**Root cause:** `const label = statusFilter === 'all' ? 'tat_ca' : statusFilter` — case 'all' được translate sang tiếng Việt nhưng các case còn lại dùng giá trị tiếng Anh thô.

**Đề xuất fix (1 trong 2 hướng):**
```ts
// Hướng 1: nhất quán tiếng Anh
const label = statusFilter  // 'all', 'pending', 'approved', 'rejected'

// Hướng 2: nhất quán tiếng Việt
const STATUS_FILE_LABELS: Record<string, string> = {
  all: 'tat_ca',
  pending: 'cho_duyet',
  approved: 'da_duyet',
  rejected: 'tu_choi',
}
const label = STATUS_FILE_LABELS[statusFilter] ?? statusFilter
```

---

### Observations (không block ship)

| # | Mô tả | Mức độ |
|---|--------|--------|
| OBS-P8-01 | Khi `defaults` là `null` (không load được hoặc không có branchId), `AllowanceTab` render form với fields `undefined` và nút Lưu disabled — user không thể save. Trong production, `branchId` luôn có (user đã login), nên trường hợp này hầu như không xảy ra. Không phải bug, nhưng không có empty state hoặc error message | Info |
| OBS-P8-02 | Không có upper bound validation cho input phụ cấp (chỉ `min={0}`). DB type `NUMERIC` không giới hạn. Nhất quán với `UX-02` từ Phase 6 (đã accepted) | Info |

---

### Carry-over từ phase trước

| Hạng mục | Trạng thái |
|----------|-----------|
| Tất cả bugs từ Phase 1–7 | ✅ Vẫn fixed |
| UX-01, UX-02 từ Phase 6 | ⏸ Accepted, không thay đổi |
| DEBT-P7-01 từ Phase 7 | ⏸ Accepted, không thay đổi |
| OBS-01, OBS-02, OBS-03 từ Phase 7 | ⏸ Không thay đổi |
| L-09 (trigger leave_balance live) | 🔍 Vẫn cần verify |
| L-10 (migration permissions) | 🔍 Vẫn cần verify |

---

### Verdict

**⚠️ PASS với 1 bug Low cần xem xét**

- **BUG-P8-01** là Low severity, không ảnh hưởng chức năng core — có thể ship và fix trong iteration tiếp theo, hoặc fix ngay trước khi ship tùy quyết định team.
- Không có bug Critical hoặc Medium nào cần fix bắt buộc.

**Deploy checklist Phase 8:**
1. Chạy migration `20260521000005_branch_default_allowance.sql` (**BẮT BUỘC** trước khi deploy)
2. Không có Edge Function mới cần deploy
3. *(Nếu chưa từ Phase 5–7)* Chạy các migration trước: `20260521000001`, `20260521000002`, `20260521000003`, `20260521000004`
4. *(Nếu chưa từ Phase 6)* Deploy Edge Functions: `calculate-payroll`, `salary-preview`

**Không có bugs bắt buộc fix trước khi ship. BUG-P8-01 là Low và có thể defer.**
