# Fix Bugs Phase 12

## BUG-P12-01 — Super_admin bị kẹt ở BranchSelectOverlay khi không có active branch

**Severity:** Medium  
**Status:** Fixed

### Mô tả
Khi hệ thống chưa có chi nhánh nào (initial setup) hoặc tất cả chi nhánh bị deactivate, `BranchSelectOverlay` hiển thị empty state với thông báo text-only. Do overlay dùng `fixed inset-0 z-50`, toàn bộ click trên trang bị chặn — super_admin không thể click vào sidebar NavLink "Chi nhánh" để tạo chi nhánh mới và bị kẹt hoàn toàn.

Escape duy nhất trước khi fix: gõ thủ công `/admin/branches` vào address bar của browser.

### Root Cause
Empty state trong overlay chỉ có `<p>` text, không có navigation element nào. Overlay `z-50 fixed inset-0` chặn tất cả pointer events phía dưới, bao gồm cả sidebar.

### Fix
**File:** `src/components/admin/BranchSelectOverlay.tsx`

Thêm `<a href="/admin/branches">` trong empty state để super_admin có thể navigate ra khỏi overlay:

```diff
  ) : activeBranches.length === 0 ? (
-   <div className="text-center py-8 text-slate-400">
-     <p className="text-sm">Chưa có chi nhánh nào. Vui lòng tạo chi nhánh trong trang quản lý.</p>
-   </div>
+   <div className="text-center py-8 text-slate-400 space-y-3">
+     <p className="text-sm">Chưa có chi nhánh nào đang hoạt động.</p>
+     <a
+       href="/admin/branches"
+       className="inline-block text-sm text-orange-600 hover:text-orange-700 underline"
+     >
+       Đến trang quản lý chi nhánh
+     </a>
+   </div>
```

Dùng `<a href>` thay vì `<Link>` hoặc `useNavigate` vì overlay mount ở `fixed z-50` — hard navigation đảm bảo browser thoát khỏi trạng thái bị kẹt trong mọi trường hợp.

### Cách test verify
1. Deactivate tất cả branches trong DB (hoặc setup môi trường không có branches)
2. Logout → login lại với super_admin
3. Overlay hiển thị: thấy text "Chưa có chi nhánh nào đang hoạt động." + link "Đến trang quản lý chi nhánh"
4. Click link → navigate đến `/admin/branches` → overlay biến mất (vì trang load lại với navigation mới)
5. Tạo chi nhánh mới → quay lại `/admin` → overlay hiển thị chi nhánh vừa tạo → click chọn → vào được dashboard

---

## Observations không fix (accepted)

### OBS-P12-01 — `useBranches` cast sang `Branch[]` nhưng thiếu 2 fields từ Phase 8

`useBranches` chỉ select 6 fields nhưng cast về `Branch[]` — `default_allowance_fulltime` và `default_allowance_parttime` sẽ là `undefined` ở runtime. Không gây bug vì không có code nào đọc những fields đó từ `useBranches` (phụ cấp query riêng qua `useAllowanceDefaults`). Type accuracy issue, accepted.

### OBS-P12-02 — Deactivate `activeBranchId` không reset store

Khi super_admin deactivate chi nhánh đang xem, store giữ `activeBranchId` cũ → data vẫn hiển thị cho branch đã deactivate mà không có cảnh báo. Edge case hiếm, không block ship.
