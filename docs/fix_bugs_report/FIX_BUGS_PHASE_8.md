# Fix Bugs Phase 8

**Nguồn:** `docs/test/TESTING_PHASE_8.md`  
**Ngày fix:** 2026-05-21  
**Số bugs fix:** 1

---

## BUG-P8-01 — Filename CSV không nhất quán

**Mô tả:**  
Tên file CSV khi export đơn nghỉ phép không nhất quán giữa các filter: filter `all` được dịch sang tiếng Việt (`don_nghi_phep_tat_ca.csv`), nhưng các filter còn lại dùng giá trị tiếng Anh thô (`don_nghi_phep_pending.csv`, `don_nghi_phep_approved.csv`, `don_nghi_phep_rejected.csv`).

**Root cause:**  
`const label = statusFilter === 'all' ? 'tat_ca' : statusFilter` — chỉ xử lý riêng case `'all'`, các case khác pass thẳng giá trị DB enum (`pending`/`approved`/`rejected`) vào filename.

**Fix:**  
Thêm map `STATUS_FILE_LABELS` chứa nhãn tiếng Việt không dấu cho tất cả status, thay thế logic ternary:

```ts
const STATUS_FILE_LABELS: Record<string, string> = {
  all: 'tat_ca',
  pending: 'cho_duyet',
  approved: 'da_duyet',
  rejected: 'tu_choi',
}
const label = STATUS_FILE_LABELS[statusFilter] ?? statusFilter
```

**Kết quả sau fix:**

| Filter | Tên file trước | Tên file sau |
|--------|----------------|--------------|
| Tất cả | `don_nghi_phep_tat_ca.csv` | `don_nghi_phep_tat_ca.csv` (giữ nguyên) |
| Chờ duyệt | `don_nghi_phep_pending.csv` | `don_nghi_phep_cho_duyet.csv` |
| Đã duyệt | `don_nghi_phep_approved.csv` | `don_nghi_phep_da_duyet.csv` |
| Từ chối | `don_nghi_phep_rejected.csv` | `don_nghi_phep_tu_choi.csv` |

**File thay đổi:** `src/features/leaves/pages/LeavePage.tsx` — thêm `STATUS_FILE_LABELS` map (sau `STATUS_LABELS`), sửa dòng `const label = ...` trong `handleExportCSV`

**Cách verify:**  
1. Vào `/admin/leaves`  
2. Chọn filter "Chờ duyệt" → click "Xuất CSV" → file tải về tên `don_nghi_phep_cho_duyet.csv`  
3. Chọn filter "Đã duyệt" → click "Xuất CSV" → file tên `don_nghi_phep_da_duyet.csv`  
4. Chọn filter "Từ chối" → file tên `don_nghi_phep_tu_choi.csv`  
5. Chọn "Tất cả" → file tên `don_nghi_phep_tat_ca.csv`

---

## Observations không fix (accepted)

| ID | Mô tả | Quyết định |
|----|--------|-----------|
| OBS-P8-01 | `AllowanceTab` khi `defaults = null` không có error state — trong production luôn có branchId nên không xảy ra | Accepted |
| OBS-P8-02 | Không có upper bound validation cho input phụ cấp — nhất quán với UX-02 từ Phase 6 đã accepted | Accepted |
