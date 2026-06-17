# Phase 1 Handoff – Layouts & Routing (HRMSYS-12)

**Ngày hoàn thành:** 2026-06-17
**Build status:** ✅ Clean (0 TypeScript errors, 0 build errors)

---

## Tổng quan

Phase 1 triển khai toàn bộ hệ thống layout và routing cho 2 portal (Admin & Employee) của HRM_System.

**Mục tiêu ban đầu:**
- Admin Portal: sidebar + topbar layout, route guard, 14 routes
- Employee Portal: mobile-first bottom nav layout, 6 routes
- Desktop và Tablet variants cho Super Admin
- Stitch design system (Kinetic HRM, light theme, orange accent)

**Kết quả thực tế:** 100% hoàn thành. Build clean với `npm run build` (tsc + vite build).

---

## Tính năng đã hoàn thành

### 1. Admin Layout (Desktop)
- **Mô tả:** Layout gồm sidebar trái (240px) + topbar (60px) + content area (`<Outlet />`). Sidebar chứa 14 navigation items với icon, phân loại theo nhóm (Main, Management, HR Admin, Settings). Active item highlight màu orange (#f97316).
- **Edge cases:**
  - `super_admin` thấy thêm mục "Branch Management" + "Admin Settings" + "Tablet View"
  - `manager` không thấy các mục super_admin-only
  - Sidebar ẩn/hiện trên tablet qua toggle
- **File chính:**
  - `src/features/admin/layouts/AdminLayout.tsx` — shell chính (flex row)
  - `src/features/admin/components/AdminSidebar.tsx` — sidebar nav
  - `src/features/admin/components/AdminTopbar.tsx` — topbar với BranchSwitcher
  - `src/components/admin/BranchSelectOverlay.tsx` — branch selection overlay
  - `src/features/admin/pages/DashboardPage.tsx` — trang dashboard placeholder
- **Cách test:** Truy cập `/admin/dashboard` → thấy sidebar + topbar + content area. Click các nav items → route chuyển đúng.

### 2. Employee Layout (Mobile-first)
- **Mô tả:** Layout max-w-md (390px), centered, với header trắng 48px + bottom nav 64px (5 tabs: Trang chủ, Chấm công, Yêu cầu, Lương, Tài khoản). Active tab orange, inactive slate-500.
- **Edge cases:**
  - Bottom nav chỉ hiển thị trên route `/`, `/checkin`, `/attendance`, `/leaves`, `/salary` — không hiển thị trên trang `/profile`
  - Notification bell ở header right
- **File chính:**
  - `src/features/employee/layouts/EmployeeLayout.tsx` — employee layout shell
- **Cách test:** Truy cập `/` → thấy header + bottom nav. Click các tab → route chuyển đúng. Active tab highlight orange.

### 3. Route Tree & Guards
- **Mô tả:** Đầy đủ route tree với `RouteGuard` (kiểm tra role) và `PublicOnlyRoute` (redirect nếu đã login).
- **14 Admin routes:** dashboard, employees (list + detail), attendance, leaves, shift-changes, shifts, payroll, analytics, branch-management, settings, admin-settings, tablet-view
- **6 Employee routes:** home, checkin, attendance history, leaves, salary, profile
- **Route `/tablet/:branchId`:** public, không cần auth
- **File chính:**
  - `src/router.tsx` — route tree
  - `src/features/auth/components/RouteGuard.tsx` — role-based guard (đã có sẵn)
  - `src/features/auth/components/PublicOnlyRoute.tsx` — redirect nếu đã login (đã có sẵn)
- **Cách test:** Chưa login → `/admin/*` redirect về `/login`. Login với role `employee` → `/admin/*` redirect về `/`. Login với role `super_admin` → vào được `/admin/settings`.

### 4. Stitch Screens (UI Design)
- **Mô tả:** 2 Stitch screens được generate theo design system Kinetic HRM.
- **File chính:**
  - `layout-descriptions.md` — Stitch layout prompts reference
- **Cách test:** Xem trong Google Stitch project "HRM System" (id: 1685953885973274207)
  - Admin Layout Shell (Desktop)
  - Employee Mobile Shell (Mobile)

### 5. Stitch Design System
- **Mô tả:** Design system "Kinetic HRM" được apply: light mode, orange primary (#f97316), Inter font, roundness level 8 (Rounded xl), spacing 8pt grid.
- **Cách test:** Verify trong Stitch project → Design System tab → Kinetic HRM với các tokens đã set.

---

## Tính năng chưa hoàn chỉnh (placeholder)

Các page sau hiển thị nội dung mặc định (sẽ triển khai ở phase sau):
- Tất cả admin pages (trừ Dashboard): "Trang này đang được phát triển"
- Employee pages (trừ Home): "Trang này đang được phát triển"

---

## Known Issues

### [DEBT-01] Không có lazy loading
- **Mô tả:** Tất cả pages import trực tiếp, không dùng `React.lazy()`
- **Nguyên nhân:** Chưa cần optimize ở phase 1
- **Fix (Phase 2):** Thêm `React.lazy()` cho mỗi feature route
- **Severity:** Low

### [DEBT-02] Chưa có xử lý tablet variant cho sidebar
- **Mô tả:** Sidebar hiện tại fixed width 240px, chưa có collapse logic cho tablet
- **Fix (Phase 2):** Media query + toggle button để collapse sidebar thành icon-only
- **Severity:** Low

### [LIMIT-01] Notification Bell chưa có dropdown
- **Mô tả:** Notification bell icon hiển thị nhưng chưa click được
- **Cần implement:** Notification dropdown component
- **Severity:** Low — placeholder component

### [LIMIT-02] BranchSwitcher chưa thực sự chuyển branch
- **Mô tả:** BranchSwitcher component hiển thị UI nhưng chưa gọi API
- **Future:** Cần implement sau khi có Supabase + multi-branch flow
- **Severity:** Low

---

## Checklist QC Test

### Auth & Routing
- [ ] Vào `/` khi chưa login → redirect về `/login`
- [ ] Vào `/admin/dashboard` khi chưa login → redirect về `/login`
- [ ] Login với role `employee` → redirect về `/` (employee portal)
- [ ] Login với role `super_admin` → redirect về `/admin/dashboard`
- [ ] Employee account vào `/admin/dashboard` → redirect về `/`

### Admin Portal
- [ ] `/admin/dashboard` — hiển thị sidebar + topbar + "Dashboard" placeholder
- [ ] Sidebar: hover/active states hoạt động
- [ ] Topbar: hiển thị branch name + notification bell + user avatar
- [ ] Click "Branch Management" (super_admin) → route `/admin/branch-management`
- [ ] Click "Tablet View" (super_admin) → route `/admin/tablet-view`

### Employee Portal
- [ ] `/` — hiển thị header + "Trang chủ" + "Coming Soon" card + bottom nav
- [ ] Click "Chấm công" → route `/checkin`
- [ ] Click "Yêu cầu" → route `/leaves`
- [ ] Click "Lương" → route `/salary`
- [ ] Click "Tài khoản" → route `/profile` (không có bottom nav)

### Build
- [ ] `npm run build` — 0 errors

---

## Ghi chú cho Phase tiếp theo

1. **Thứ tự ưu tiên:** Auth (login thật + Supabase) → Dashboard widgets → Employee features (checkin QR)
2. **Cần setup:** Supabase project + database schema + migration files
3. **Component library:** Chỉ có sẵn Button, Card, Input, Label, Select từ shadcn/ui — cần thêm component mới (DropdownMenu, Dialog, Tabs, v.v.) trước khi implement feature
4. **Stitch screens:** Employee Mobile Shell và Admin Layout Shell đã có sẵn trong Stitch project — có thể dùng làm reference cho UI
5. **Branch store:** Auth store đã có `activeBranchId` / `setActiveBranchId` — sẵn sàng cho multi-branch
