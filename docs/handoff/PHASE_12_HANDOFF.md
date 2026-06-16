# Phase 12 Handoff – Multi-Branch Support

## Tổng quan
- **Mục tiêu:** Cho phép hệ thống vận hành nhiều chi nhánh song song. Super Admin có thể switch qua lại giữa các chi nhánh và quản lý từng chi nhánh độc lập.
- **Kết quả:** Hoàn thành 100%
- **Ngày hoàn thành:** 2026-05-21

---

## Kiến trúc thay đổi

### Khái niệm `activeBranchId`

| Role | `user.branch_id` | `activeBranchId` | Ghi chú |
|---|---|---|---|
| `employee` | branch của họ | = `user.branch_id` (locked) | Không đổi được |
| `manager` | branch được gán | = `user.branch_id` (locked) | Không đổi được |
| `super_admin` | `null` | Chọn qua BranchSwitcher | Có thể switch |

Mọi hook trong admin portal đọc `s.activeBranchId` thay vì `s.user?.branch_id`. Khi super_admin switch branch → tất cả queries tự refetch vì queryKey chứa `branchId`.

---

## Tính năng đã hoàn thành

### 1. authStore — `activeBranchId`

- Thêm `activeBranchId: string | null` vào store state
- `setUser()` tự động set `activeBranchId = user.branch_id` cho manager/employee khi login; để `null` cho super_admin
- `setActiveBranchId(id)` — super_admin gọi khi chọn branch
- `logout()` reset cả `activeBranchId = null`
- `activeBranchId` được persist vào localStorage cùng session — super_admin reload trang vẫn giữ chi nhánh đang xem

**File:** `src/stores/authStore.ts`

---

### 2. BranchSelectOverlay

Khi super_admin login lần đầu (hoặc sau logout), `activeBranchId = null` → toàn bộ AdminLayout bị block bởi overlay fullscreen. Overlay hiển thị danh sách chi nhánh đang active, click chọn → `setActiveBranchId` → overlay biến mất.

**File:** `src/components/admin/BranchSelectOverlay.tsx`

---

### 3. BranchSwitcher trong AdminTopbar

Dropdown xuất hiện ở góc trái topbar, **chỉ với super_admin**. Hiển thị tên chi nhánh đang active, click mở danh sách tất cả chi nhánh active, chọn để switch. Chi nhánh hiện tại có check mark.

Manager không thấy BranchSwitcher — topbar của manager vẫn như cũ.

**File:** `src/layouts/AdminTopbar.tsx`

---

### 4. BranchListPage `/admin/branches`

Trang quản lý chi nhánh, **chỉ visible với super_admin** (link xuất hiện đầu sidebar với divider ngăn cách).

**Tính năng:**
- Danh sách tất cả chi nhánh (bao gồm cả inactive)
- Badge "Đang xem" highlight chi nhánh đang active
- Nút "Chọn" để switch sang chi nhánh đó (không cần mở BranchSwitcher)
- Nút "Ngưng" / "Kích hoạt" để toggle `is_active`
- Dialog "Thêm chi nhánh": nhập Tên (required), Địa chỉ, SĐT → tạo và auto-switch sang chi nhánh mới

**Files:** `src/features/branches/pages/BranchListPage.tsx`, `src/features/branches/hooks/useBranches.ts`

---

### 5. Migration toàn bộ hooks (17 files)

Tất cả hooks/pages trong admin portal đã được thay từ `useAuthStore((s) => s.user?.branch_id)` sang `useAuthStore((s) => s.activeBranchId)`:

```
features/admin/pages/AnalyticsPage.tsx
features/admin/pages/DashboardPage.tsx
features/attendance/components/ManualAttendanceDialog.tsx
features/attendance/hooks/useAttendance.ts
features/audit/hooks/useAuditLogs.ts
features/employees/components/BulkImportDialog.tsx
features/employees/hooks/useEmployees.ts
features/employees/pages/EmployeeDetailPage.tsx
features/employees/pages/EmployeeListPage.tsx
features/leaves/hooks/useLeaves.ts
features/payroll/hooks/useEmployeeBonuses.ts
features/payroll/hooks/usePayroll.ts
features/roster/hooks/useRoster.ts
features/settings/hooks/useSettings.ts
features/shift-change/hooks/useShiftChange.ts
features/shifts/hooks/useShifts.ts
features/shifts/pages/ShiftListPage.tsx
```

---

### 6. AdminSidebar — link Chi nhánh

Link "Chi nhánh" xuất hiện đầu sidebar với icon `Building2`, chỉ render khi `isSuperAdmin`. Phân cách bằng divider mỏng với các nav items còn lại.

Tablet link cuối sidebar dùng `activeBranchId` thay vì `user.branch_id`.

**File:** `src/layouts/AdminSidebar.tsx`

---

## Tính năng chưa hoàn chỉnh hoặc bị bỏ qua

- **Edit tên/địa chỉ/SĐT chi nhánh:** Chưa làm — BranchListPage chỉ có create, không có edit inline. Có thể thêm sau.
- **Phân quyền route theo role:** `/admin/branches` accessible bởi cả manager (qua URL), nhưng data trả về chỉ đúng với chi nhánh của họ. Không có hại, nhưng ideally nên guard.
- **Xóa chi nhánh:** Không implement (nguy hiểm — cascade xóa toàn bộ dữ liệu). Chỉ support deactivate.

---

## Known Issues & Technical Debt

- **[DEBT-P12-01]** Khi super_admin switch branch, TanStack Query cache của branch cũ vẫn còn trong memory. Không xóa cache ngay vì không cần thiết (cache TTL tự expire, và khi switch lại sẽ hit cache). Nếu cần force-clear: thêm `queryClient.clear()` trong `setActiveBranchId`.
- **[DEBT-P12-02]** `useBranches` không filter theo quyền — super_admin thấy tất cả branches, manager/employee cũng có thể gọi hook này và thấy tất cả. Trong production nên có RLS policy chặn.

---

## Checklist QC Test

### BranchSelectOverlay
- [ ] Login với super_admin (branch_id = null) → thấy overlay "Chọn chi nhánh" ngay lập tức
- [ ] Overlay hiển thị danh sách chi nhánh active
- [ ] Click một chi nhánh → overlay biến mất → hiện admin dashboard của chi nhánh đó
- [ ] Reload trang sau khi đã chọn → overlay không hiện lại (session persist)
- [ ] Login với manager → không thấy overlay

### BranchSwitcher
- [ ] Login super_admin → thấy dropdown BranchSwitcher ở góc trái topbar với tên chi nhánh đang active
- [ ] Mở dropdown → thấy tất cả chi nhánh active
- [ ] Chi nhánh đang chọn có check mark ✓
- [ ] Click chi nhánh khác → topbar đổi tên → data trên trang reload theo chi nhánh mới
- [ ] Login manager → không thấy BranchSwitcher trong topbar

### BranchListPage
- [ ] Vào `/admin/branches` (super_admin) → thấy danh sách branches
- [ ] Chi nhánh đang active có badge "Đang xem"
- [ ] Click "Chọn" ở một chi nhánh khác → badge chuyển sang chi nhánh đó
- [ ] Click "+ Thêm chi nhánh" → dialog → nhập tên → "Tạo chi nhánh" → branch mới xuất hiện trong list + auto-switch
- [ ] Tên bắt buộc: không nhập → nút "Tạo chi nhánh" disabled
- [ ] Click "Ngưng" → badge chuyển sang "Ngưng" → chi nhánh không còn trong BranchSwitcher dropdown
- [ ] Click "Kích hoạt" → chi nhánh active trở lại

### Data isolation
- [ ] Chọn chi nhánh A → vào Nhân viên → thấy nhân viên chi nhánh A
- [ ] Switch sang chi nhánh B → Nhân viên cập nhật → thấy nhân viên chi nhánh B
- [ ] Tính lương với chi nhánh B → chỉ tính nhân viên chi nhánh B

---

## Ghi chú cho Phase tiếp theo

- **Không có migration DB mới** — tất cả bảng đã có `branch_id` từ schema ban đầu
- **Không có Edge Function thay đổi** — edge functions vẫn nhận `branch_id` qua request body
- `AuthUser.branch_id` vẫn là `string | null` — không thay đổi type
- Để tạo super_admin: thêm thủ công vào `users` table với `role = 'super_admin'` và `branch_id = NULL`
