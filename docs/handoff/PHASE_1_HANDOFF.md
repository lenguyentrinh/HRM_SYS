# Phase 1 Handoff – Layouts & Routing (HRMSYS-12)

**Completion Date:** 2026-06-17
**Build status:** ✅ Clean (0 TypeScript errors, 0 build errors)

---

## Overview

Phase 1 implements the full layout and routing system for both portals (Admin & Employee) of HRM_System.

**Initial Objective:**
- Admin Portal: sidebar + topbar layout, route guard, 14 routes
- Employee Portal: mobile-first bottom nav layout, 6 routes
- Desktop and Tablet variants for Super Admin
- Stitch design system (Kinetic HRM, light theme, orange accent)

**Actual Result:** 100% complete. Clean build with `npm run build` (tsc + vite build).

---

## Completed Features

### 1. Admin Layout (Desktop)
- **Description:** Layout with left sidebar (240px) + topbar (60px) + content area (`<Outlet />`). Sidebar has 14 navigation items with icons, grouped by category (Main, Management, HR Admin, Settings). Active item highlighted in orange (#f97316).
- **Edge cases:**
  - `super_admin` sees additional "Branches" item + "Tablet View"
  - `manager` does not see super_admin-only items
  - Sidebar toggle for tablet view
- **Key files:**
  - `src/features/admin/layouts/AdminLayout.tsx` — main shell (flex row)
  - `src/features/admin/components/AdminSidebar.tsx` — sidebar nav
  - `src/features/admin/components/AdminTopbar.tsx` — topbar with BranchSwitcher
  - `src/components/admin/BranchSelectOverlay.tsx` — branch selection overlay
  - `src/features/admin/pages/DashboardPage.tsx` — dashboard placeholder page
- **Test:** Visit `/admin/dashboard` → see sidebar + topbar + content area. Click nav items → correct route.

### 2. Employee Layout (Mobile-first)
- **Description:** Max-w-md (390px) centered layout with white 48px header + 64px bottom nav (5 tabs: Home, Check-in, Requests, Salary, Account). Active tab orange, inactive slate-500.
- **Edge cases:**
  - Bottom nav hidden on `/profile` page
  - Notification bell in header right
- **Key files:**
  - `src/features/employee/layouts/EmployeeLayout.tsx` — employee layout shell
- **Test:** Visit `/` → see header + bottom nav. Click tabs → correct route. Active tab highlighted orange.

### 3. Route Tree & Guards
- **Description:** Full route tree with `RouteGuard` (role check) and `PublicOnlyRoute` (redirect if logged in).
- **14 Admin routes:** dashboard, employees (list + detail), attendance, leaves, shift-changes, shifts, payroll, analytics, branch-management, settings, admin-settings, tablet-view
- **6 Employee routes:** home, checkin, attendance history, leaves, salary, profile
- **Route `/tablet/:branchId`:** public, no auth required
- **Key files:**
  - `src/router.tsx` — route tree
  - `src/features/auth/components/RouteGuard.tsx` — role-based guard
  - `src/features/auth/components/PublicOnlyRoute.tsx` — redirect if logged in
- **Test:** Not logged in → `/admin/*` redirects to `/login`. Login as `employee` → `/admin/*` redirects to `/`. Login as `super_admin` → can access `/admin/settings`.

### 4. Stitch Screens (UI Design)
- **Description:** 2 Stitch screens generated using the Kinetic HRM design system.
- **Key files:**
  - `layout-descriptions.md` — Stitch layout prompts reference
- **Test:** View in Google Stitch project "HRM System" (id: 1685953885973274207)
  - Admin Layout Shell (Desktop)
  - Employee Mobile Shell (Mobile)

### 5. Stitch Design System
- **Description:** "Kinetic HRM" design system applied: light mode, orange primary (#f97316), Inter font, roundness level 8 (Rounded xl), 8pt grid spacing.
- **Test:** Verify in Stitch project → Design System tab → Kinetic HRM with all tokens set.

---

## Incomplete Features (Placeholder)

The following pages show default content (to be implemented in later phases):
- All admin pages (except Dashboard): "Coming Soon"
- Employee pages (except Home): "Coming Soon"

---

## Known Issues

### [DEBT-01] No lazy loading
- **Description:** All pages imported directly, no `React.lazy()` used
- **Reason:** Not needed yet in phase 1
- **Fix (Phase 2):** Add `React.lazy()` for each feature route
- **Severity:** Low

### [DEBT-02] No tablet sidebar collapse
- **Description:** Sidebar is fixed at 240px, no collapse logic for tablet
- **Fix (Phase 2):** Media query + toggle button to collapse sidebar to icons
- **Severity:** Low

### [LIMIT-01] Notification bell has no dropdown
- **Description:** Notification bell icon shows but is not clickable
- **Needs:** Notification dropdown component
- **Severity:** Low — placeholder component

### [LIMIT-02] BranchSwitcher does not actually switch branch
- **Description:** BranchSwitcher shows UI but does not call API
- **Future:** Needs implementation after Supabase + multi-branch setup
- **Severity:** Low

---

## QC Test Checklist

### Auth & Routing
- [ ] Visit `/` without login → redirect to `/login`
- [ ] Visit `/admin/dashboard` without login → redirect to `/login`
- [ ] Login as `employee` → redirect to `/` (employee portal)
- [ ] Login as `super_admin` → redirect to `/admin/dashboard`
- [ ] Employee visiting `/admin/dashboard` → redirect to `/`

### Admin Portal
- [ ] `/admin/dashboard` — shows sidebar + topbar + "Dashboard" placeholder
- [ ] Sidebar: hover/active states work
- [ ] Topbar: shows branch name + notification bell + user avatar
- [ ] Click "Branches" (super_admin) → route `/admin/branches`
- [ ] Click "Tablet View" (super_admin) → route `/admin/tablet-view`

### Employee Portal
- [ ] `/` — shows header + "Home" + "Coming Soon" card + bottom nav
- [ ] Click "Check-in" → route `/checkin`
- [ ] Click "Requests" → route `/leaves`
- [ ] Click "Salary" → route `/salary`
- [ ] Click "Account" → route `/profile` (no bottom nav)

### Build
- [ ] `npm run build` — 0 errors

---

## Notes for Next Phase

1. **Priority order:** Auth (real login + Supabase) → Dashboard widgets → Employee features (QR check-in)
2. **Needs setup:** Supabase project + database schema + migration files
3. **Component library:** Only Button, Card, Input, Label, Select available from shadcn/ui — need more components (DropdownMenu, Dialog, Tabs, etc.) before implementing features
4. **Stitch screens:** Employee Mobile Shell and Admin Layout Shell available in Stitch project — use as UI reference
5. **Branch store:** Auth store already has `activeBranchId` / `setActiveBranchId` — ready for multi-branch
