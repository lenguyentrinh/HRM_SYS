# Testing Phase 12 – Multi-Branch Support

**QC:** Senior QC (static code review)  
**Ngày test:** 2026-05-21  
**Phạm vi:** Verify fix BUG-P9-01 + carry-over bugs từ Phase 9 + tính năng mới Phase 12  
**Phương pháp:** Đọc source code, trace logic, không có môi trường Supabase live

---

## Phần 1 — Verify BUG-P9-01 đã fix chưa

**Kỳ vọng sau fix:** `Clock` icon trong card "Ca hôm nay" dùng `h-5 w-5` thay vì `h-4.5 w-4.5` (invalid Tailwind class).

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| FIX-P9-01-a | `EmployeeDashboardPage.tsx` line 47: `Clock className="h-5 w-5 text-orange-500"` | ✅ FIXED |
| FIX-P9-01-b | Không còn `h-4.5` hay `w-4.5` trong component này | ✅ FIXED |
| FIX-P9-01-c | `h-5 w-5` = 1.25rem — hợp lệ trong Tailwind v3 default scale | ✅ FIXED |

**→ BUG-P9-01 đã được fix đúng. ✅**

OBS-P9-01 (error silently swallowed trong `useMyTodayShift`): **⏸ Accepted, không fix** — đúng theo FIX_BUGS_PHASE_9.md.

---

## Phần 2 — Verify carry-over bugs từ các phase trước

Phase 12 thay đổi nhiều file (17 hooks + 5 component/store mới) nhưng không chạm vào các file từng có bugs.

| Bug ID | Mô tả | Trạng thái |
|--------|--------|-----------|
| BUG-P9-01 | `h-4.5 w-4.5` invalid Tailwind class | ✅ FIXED — verified ở Phần 1 |
| BUG-P8-01 | Filename CSV không nhất quán | ✅ VẪN FIXED — Phase 12 không chạm LeavePage |
| BUG-P5-CRITICAL-01 | `lateCount` ordering trong `calculate-payroll` | ✅ VẪN FIXED — không thay đổi |
| BUG-P5-NEW-01 | regex CSV filename AnalyticsPage | ✅ VẪN FIXED |
| BUG-P5-NEW-02 | `special_bonus` trong PayrollPage | ✅ VẪN FIXED |
| BUG-P4-NEW-01 | Audit log wiring | ✅ VẪN FIXED |
| BUG-P3-NEW-01 | Password verify ProfilePage | ✅ VẪN FIXED |
| DEBT-P5-01/02/03 | AuditLog type, hook, dead variable | ✅ VẪN FIXED |
| UX-01, UX-02 (P6) | Confirm dialog OT, upper bound | ⏸ ACCEPTED |
| DEBT-P7-01, DEBT-P9-01 | Query counts | ⏸ ACCEPTED |
| OBS-P8-01/02, OBS-P9-01 | Minor observations | ⏸ ACCEPTED |
| L-09, L-10 (live verify) | trigger leave_balance, permissions | 🔍 VẪN NEEDS-LIVE |

**Migration hoàn tất:** Grep `s.user?.branch_id` trong toàn bộ `src/` → 0 kết quả. Tất cả 17 files đã dùng `activeBranchId`. ✅

---

## Phần 3 — Test tính năng Phase 12: `authStore` — `activeBranchId`

### 3.1 State và actions

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P12-01 | `activeBranchId: string \| null` có trong `AuthState` interface | ✅ PASS |
| P12-02 | `StoredSession` interface có `activeBranchId: string \| null` — persist đúng field | ✅ PASS |
| P12-03 | `setActiveBranchId: (id: string \| null) => void` export đúng | ✅ PASS |
| P12-04 | Initial state: `activeBranchId: null` | ✅ PASS |

### 3.2 Logic `setUser`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P12-05 | `setUser` với manager/employee: `activeBranchId = user.branch_id` (locked) | ✅ PASS |
| P12-06 | `setUser` với super_admin: `activeBranchId = null` — phải chọn branch sau | ✅ PASS |
| P12-07 | `setUser(null)`: `user?.role` là `undefined`, condition `undefined !== 'super_admin'` = `true` → `activeBranchId = null` ✅ | ✅ PASS |
| P12-08 | `logout()`: reset cả `user: null, activeBranchId: null` | ✅ PASS |

### 3.3 Persistence — `partialize`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P12-09 | `!state.user` → `{ session: null }` — không persist khi chưa login | ✅ PASS |
| P12-10 | User đã login: persist `{ session: { user, activeBranchId, expiresAt } }` | ✅ PASS |
| P12-11 | Logic giữ nguyên `expiresAt` cũ khi cùng user và session chưa hết hạn — TTL không refresh liên tục | ✅ PASS |
| P12-12 | Khi user khác hoặc session hết hạn: tạo `expiresAt = Date.now() + 12h` mới | ✅ PASS |
| P12-13 | `super_admin` switch branch → `partialize` persist `activeBranchId` mới vào session ✅ | ✅ PASS |

### 3.4 Restore — `onRehydrateStorage`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P12-14 | Không có session hoặc session hết hạn: `state.user = null, state.activeBranchId = null` | ✅ PASS |
| P12-15 | Session hợp lệ: restore `user` và `activeBranchId` từ session | ✅ PASS |
| P12-16 | `session.activeBranchId ?? null` — guard null-safety | ✅ PASS |
| P12-17 | Super_admin reload trang → `activeBranchId` được khôi phục → overlay không hiện lại | ✅ PASS |

---

## Phần 4 — Test tính năng Phase 12: `AdminLayout` — Overlay wiring

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P12-18 | `needsBranchSelect = user?.role === 'super_admin' && !activeBranchId` — logic đúng | ✅ PASS |
| P12-19 | Manager login: `user?.role !== 'super_admin'` → `needsBranchSelect = false` → không overlay | ✅ PASS |
| P12-20 | Employee login: tương tự manager, không overlay | ✅ PASS |
| P12-21 | Super_admin đã chọn branch: `!activeBranchId = false` → overlay biến mất | ✅ PASS |
| P12-22 | `{needsBranchSelect && <BranchSelectOverlay />}` — render cuối JSX, dùng `fixed z-50` để phủ | ✅ PASS |
| P12-23 | Khi overlay hiển thị, hooks phía sau (`<Outlet />`) vẫn mount nhưng trả về empty vì `activeBranchId = null` — không crash | ✅ PASS |

---

## Phần 5 — Test tính năng Phase 12: `BranchSelectOverlay`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P12-24 | `fixed inset-0 bg-slate-50 z-50` — phủ toàn màn hình, nằm trên tất cả | ✅ PASS |
| P12-25 | `useBranches()` lấy danh sách branches | ✅ PASS |
| P12-26 | `activeBranches = branches.filter((b) => b.is_active)` — chỉ hiển thị chi nhánh active | ✅ PASS |
| P12-27 | Loading state: 3 skeleton rows | ✅ PASS |
| P12-28 | Click branch: `onClick={() => setActiveBranchId(branch.id)}` → overlay tự ẩn | ✅ PASS |
| P12-29 | Empty state khi `activeBranches.length === 0`: hiển thị thông báo nhưng **không có link/nút thoát ra** | ⚠️ BUG-P12-01 — xem ghi chú |
| P12-30 | Overlay blocking: dùng `z-50 fixed inset-0`, không set `pointer-events-none` → tất cả click trên trang bị chặn | ⚠️ Liên quan BUG-P12-01 |

**[BUG-P12-01] — Medium — `BranchSelectOverlay.tsx`**

Khi `activeBranches.length === 0` (hệ thống mới chưa có chi nhánh, hoặc tất cả chi nhánh bị deactivate), overlay hiển thị:
> *"Chưa có chi nhánh nào. Vui lòng tạo chi nhánh trong trang quản lý."*

Tuy nhiên, overlay dùng `fixed inset-0 z-50` và không có `pointer-events-none` → **chặn toàn bộ click trên trang**, kể cả sidebar NavLink "Chi nhánh" (`/admin/branches`). Super_admin không thể navigate đến trang tạo chi nhánh, bị kẹt ở overlay.

**Escape duy nhất:** Gõ thủ công URL `/admin/branches` vào address bar của browser (không click vào sidebar).

**Ảnh hưởng:** Blocks initial setup khi deploy hệ thống lần đầu với không có branches, hoặc khi toàn bộ branches bị deactivate.

**Fix đề xuất:**
```tsx
// Option 1: Thêm link trong empty state
<a href="/admin/branches" className="text-orange-600 underline text-sm">
  Đến trang quản lý chi nhánh
</a>

// Option 2: Dùng useNavigate để navigate programmatically từ overlay
```

---

## Phần 6 — Test tính năng Phase 12: `BranchSwitcher` trong AdminTopbar

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P12-31 | `isSuperAdmin = user?.role === 'super_admin'` | ✅ PASS |
| P12-32 | Chỉ render `<BranchSwitcher />` khi `isSuperAdmin`, manager thấy `<div className="flex-1" />` thay thế | ✅ PASS |
| P12-33 | `activeBranch = branches.find((b) => b.id === activeBranchId)` — hiển thị tên chi nhánh đang xem | ✅ PASS |
| P12-34 | `activeBranch?.name ?? 'Chọn chi nhánh'` — fallback khi chưa chọn | ✅ PASS |
| P12-35 | Dropdown chỉ hiển thị `activeBranches = branches.filter((b) => b.is_active)` | ✅ PASS |
| P12-36 | Check mark `<Check />` khi `branch.id === activeBranchId` | ✅ PASS |
| P12-37 | Click branch: `setActiveBranchId(branch.id)` → tất cả queries với key chứa `branchId` tự refetch | ✅ PASS |

---

## Phần 7 — Test tính năng Phase 12: `BranchListPage`

### 7.1 Hiển thị danh sách

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P12-38 | `activeBranchId` và `setActiveBranchId` đọc từ store đúng | ✅ PASS |
| P12-39 | Row highlight `bg-orange-50` cho chi nhánh `branch.id === activeBranchId` | ✅ PASS |
| P12-40 | Badge "Đang xem" hiển thị trong cell tên khi `branch.id === activeBranchId` | ✅ PASS |
| P12-41 | Nút "Chọn" ẩn cho chi nhánh đang active (`branch.id !== activeBranchId`) | ✅ PASS |
| P12-42 | Hiển thị cả chi nhánh inactive trong bảng (không filter) | ✅ PASS |
| P12-43 | Loading skeleton 3 rows | ✅ PASS |
| P12-44 | Empty state khi `!branches.length` | ✅ PASS |

### 7.2 Thao tác

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P12-45 | Click "Chọn": `setActiveBranchId(branch.id)` — switch branch | ✅ PASS |
| P12-46 | Toggle "Ngưng"/"Kích hoạt": `toggleActive.mutate({ id, is_active: !branch.is_active })` | ✅ PASS |
| P12-47 | Toggle disabled khi `toggleActive.isPending` | ✅ PASS |
| P12-48 | Toggle `onSuccess`: invalidate `['branches']` + toast | ✅ PASS |
| P12-49 | Deactivate chi nhánh đang là `activeBranchId`: không có guard, store không reset `activeBranchId` | ⚠️ OBS-P12-02 — xem ghi chú |

### 7.3 Dialog tạo chi nhánh

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P12-50 | Nút "Tạo chi nhánh" `disabled={!name.trim() \|\| createBranch.isPending}` — required validation | ✅ PASS |
| P12-51 | Địa chỉ và SĐT không bắt buộc — `address \|\| undefined` / `phone \|\| undefined` | ✅ PASS |
| P12-52 | `name: payload.name.trim()` — loại bỏ khoảng trắng | ✅ PASS |
| P12-53 | Auto-switch sau khi tạo: component-level `onSuccess(newBranch) → setActiveBranchId(newBranch.id)` | ✅ PASS |
| P12-54 | `useCreateBranch.mutationFn` trả về `Pick<Branch, 'id' \| 'name'>` — component nhận được `newBranch.id` đúng | ✅ PASS |
| P12-55 | Reset form sau khi tạo: `setName(''), setAddress(''), setPhone('')` | ✅ PASS |

---

## Phần 8 — Test tính năng Phase 12: `AdminSidebar`

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P12-56 | Link "Chi nhánh" với `Building2` icon chỉ render khi `isSuperAdmin` | ✅ PASS |
| P12-57 | Divider `<div className="my-1 mx-3 border-t" />` sau link "Chi nhánh" — tách biệt với nav items chính | ✅ PASS |
| P12-58 | Tablet link dùng `activeBranchId`: `href={/tablet/${activeBranchId}}` | ✅ PASS |
| P12-59 | Tablet link chỉ render khi `activeBranchId` truthy: `{activeBranchId && ...}` | ✅ PASS |

---

## Phần 9 — Test tính năng Phase 12: `useBranches` hook

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P12-60 | Query key: `['branches']` — không scoped theo branchId (global) | ✅ PASS — đúng thiết kế cho super_admin xem tất cả |
| P12-61 | `if (error) throw error` — lỗi được throw để TanStack Query bắt | ✅ PASS |
| P12-62 | `order('name')` — alphabetical | ✅ PASS |
| P12-63 | Không có `enabled` guard — query chạy ngay khi hook được gọi | ⚠️ DEBT-P12-02 (ghi nhận từ handoff) |
| P12-64 | `useBranches` select `'id, name, address, phone, is_active, created_at'` — không include `default_allowance_fulltime/parttime` (thêm từ Phase 8), nhưng cast sang `Branch[]` | ⚠️ OBS-P12-01 — xem ghi chú |

**[OBS-P12-01] — Low — `useBranches.ts`**

`useBranches` cast kết quả về `Branch[]`, nhưng chỉ select 6 field. `Branch` interface (Phase 8) có thêm `default_allowance_fulltime: number` và `default_allowance_parttime: number` — hai field này sẽ là `undefined` ở runtime (không được select từ DB). TypeScript không bắt lỗi vì dùng `as Branch[]`.

Không gây bug thực tế vì không có code nào truy cập `branch.default_allowance_fulltime` từ dữ liệu của `useBranches`. Phụ cấp được query riêng qua `useAllowanceDefaults`. Nhưng là type accuracy issue.

**[OBS-P12-02] — Low — `BranchListPage.tsx`**

Khi super_admin click "Ngưng" trên chi nhánh đang là `activeBranchId`:
- DB: `is_active = false` ✅
- Store: `activeBranchId` vẫn giữ ID của chi nhánh vừa deactivate
- BranchSwitcher dropdown: chi nhánh đó biến mất (filter `is_active`)
- Tất cả data queries vẫn chạy với ID cũ → dữ liệu vẫn hiện nhưng branch đã "ngưng"

Không có cảnh báo nào cho super_admin biết họ đang xem chi nhánh đã bị deactivate. Edge case hiếm, không block ship.

---

## Phần 10 — Verify migration 17 hooks

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P12-65 | Grep `s.user?.branch_id` trong toàn bộ `src/features/` (`.ts` và `.tsx`) → 0 kết quả | ✅ PASS — migration hoàn tất |
| P12-66 | Grep `activeBranchId` trong `src/features/` → 18 files (17 hooks + BranchListPage) | ✅ PASS |
| P12-67 | Spot-check `useEmployees.ts`: `useAuthStore((s) => s.activeBranchId)` | ✅ PASS |
| P12-68 | Spot-check `useAttendance.ts`: `useAuthStore((s) => s.activeBranchId)` | ✅ PASS |
| P12-69 | Spot-check `useSettings.ts`: `useAuthStore((s) => s.activeBranchId)` (11 usages) | ✅ PASS |
| P12-70 | Grep `s.user?.branch_id` trong `src/layouts/` → 0 kết quả | ✅ PASS |

---

## Phần 11 — Router và routes

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| P12-71 | `/admin/branches` route đăng ký trong `router.tsx` (line 112) | ✅ PASS |
| P12-72 | `BranchListPage` được lazy load đúng | ✅ PASS |

---

## Phần 12 — Test cases cần live environment

| # | Feature | Cần test |
|---|---------|---------|
| L-01 | **BranchSelectOverlay** | Login super_admin (branch_id = null) → thấy overlay ngay lập tức |
| L-02 | **Chọn branch từ overlay** | Click chi nhánh → overlay biến mất → dashboard load data chi nhánh đó |
| L-03 | **Reload persist** | Sau khi chọn branch → reload trang → overlay không hiện lại |
| L-04 | **BranchSwitcher** | Login super_admin → switch branch → data trên trang thay đổi theo chi nhánh mới |
| L-05 | **Manager không thấy BranchSwitcher** | Login manager → topbar không có dropdown BranchSwitcher |
| L-06 | **BranchListPage CRUD** | Tạo chi nhánh mới → auto-switch → badge "Đang xem" chuyển sang mới |
| L-07 | **Data isolation** | Chi nhánh A có 5 NV, chi nhánh B có 3 NV → switch → danh sách NV đổi đúng |
| L-08 | **BUG-P12-01 reproduce** | Deactivate tất cả branches → logout → login lại → verify bị stuck ở overlay |
| L-09 | **Trigger leave_balance** (từ Phase 5) | Tạo nhân viên mới → `leave_balances` có bản ghi tự động |
| L-10 | **Migration permissions** | Không có "permission denied" khi query |

---

## Phần 13 — Tổng kết

### Kết quả test

| Hạng mục | Số lượng |
|----------|---------|
| Test cases tổng | 72 |
| PASS | 65 |
| BUG (mới phát hiện) | 1 (P12-29 — Medium) |
| OBSERVATION (không block ship) | 2 (P12-49, P12-64) |
| DEBT (xác nhận từ handoff) | 2 (DEBT-P12-01, DEBT-P12-02) |
| NEEDS-LIVE | 10 |

---

### BUG-P9-01 — Verified FIXED ✅

`Clock className="h-5 w-5"` — đúng Tailwind class.

---

### Bug mới phát hiện

| ID | Mô tả | Mức độ | File |
|----|--------|--------|------|
| BUG-P12-01 | Super_admin bị kẹt ở `BranchSelectOverlay` khi không có active branch nào — không có nút/link để thoát ra vì overlay `z-50` chặn toàn bộ click vào sidebar. Ảnh hưởng initial setup và trường hợp tất cả branches bị deactivate. | **Medium** | `BranchSelectOverlay.tsx` |

---

### Observations (không block ship)

| # | Mô tả | Mức độ |
|---|--------|--------|
| OBS-P12-01 | `useBranches` select 6 fields nhưng cast sang `Branch[]` — thiếu `default_allowance_fulltime/parttime`. Không gây runtime bug vì không ai đọc những fields đó từ `useBranches`. Type accuracy issue. | Low |
| OBS-P12-02 | Deactivate chi nhánh đang là `activeBranchId` không reset store → super_admin tiếp tục xem data branch đã deactivate mà không có cảnh báo. Edge case hiếm gặp. | Low |

---

### Technical Debt xác nhận từ handoff

| ID | Mô tả |
|----|--------|
| DEBT-P12-01 | TanStack Query cache của branch cũ không bị xóa khi switch branch — data cũ vẫn trong memory. Tự expire theo TTL, không gây bug. |
| DEBT-P12-02 | `useBranches` không có RLS/role filter — bất kỳ user nào gọi hook đều thấy tất cả branches. Cần RLS policy trong production. |

---

### Carry-over từ phase trước

| Hạng mục | Trạng thái |
|----------|-----------|
| BUG-P9-01 | ✅ FIXED — Verified |
| Tất cả bugs từ Phase 1–8 | ✅ Vẫn fixed |
| UX-01, UX-02 (P6) | ⏸ Accepted |
| DEBT-P7-01, DEBT-P9-01 | ⏸ Accepted |
| OBS-P8-01/02, OBS-P9-01 | ⏸ Accepted |
| L-09, L-10 (live verify) | 🔍 Vẫn cần verify |

---

### Verdict

**⚠️ PASS với 1 bug Medium cần xem xét**

**BUG-P12-01** ảnh hưởng initial setup và edge case tất cả branches deactivate. Với hệ thống production được deploy đúng cách (luôn có ít nhất 1 active branch), bug này không xảy ra trong normal usage. Tuy nhiên, đây là UX trap nguy hiểm khi setup lần đầu.

**Đề xuất:** Fix ngay bằng cách thêm `<a href="/admin/branches">` trong empty state của overlay trước khi ship.

**Deploy checklist Phase 12:**
1. Không có migration DB mới cần chạy
2. Không có Edge Function mới cần deploy
3. Tạo tài khoản `super_admin` thủ công trong `users` table với `role='super_admin'` và `branch_id=NULL`
4. Đảm bảo có ít nhất 1 active branch trong DB trước khi super_admin đăng nhập lần đầu (tránh BUG-P12-01)
5. *(Nếu chưa từ Phase 8)* Chạy migration `20260521000005_branch_default_allowance.sql`
6. *(Nếu chưa từ Phase 5–7)* Chạy migrations `000001`–`000004` và deploy Edge Functions
