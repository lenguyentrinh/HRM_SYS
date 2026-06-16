# TESTING PHASE 1 – HRM Management App

**Ngày test:** 2026-05-18  
**Tester:** Senior QC (10+ năm kinh nghiệm)  
**Phiên bản:** Phase 1 – Handoff 2026-05-18  
**Phương pháp:** Static code review + logic analysis (môi trường live chưa được setup)

---

## 1. Phạm vi test

Theo PHASE_1_HANDOFF.md, Phase 1 bao gồm:
- Infrastructure & project setup
- Auth flow (login, route guard, logout, session)
- Admin Portal layout (sidebar, topbar)
- Employee Management (`/admin/employees`, `/admin/employees/:id`)
- Shift Configuration (`/admin/shifts`)
- Employee Portal layout & dashboard placeholder

---

## 2. Phương pháp & giới hạn

**Đã thực hiện:** Code review toàn bộ source files (35+ files), phân tích logic, kiểm tra type consistency, kiểm tra security model, review migration SQL.

**Chưa thực hiện (cần môi trường live):** E2E test với Supabase thật, visual regression, performance testing, browser compatibility.

Các bug được đánh dấu `[STATIC]` là phát hiện qua code review và có thể reproduce khi test live. Các test case đánh dấu `[NEEDS-LIVE]` cần môi trường Supabase thật.

---

## 3. Kết quả test theo module

### 3.1 AUTH FLOW

#### TC-AUTH-01: Login với credentials hợp lệ
- **Bước test:** Vào `/login` → nhập phone `0901234567` + password `123456` → Submit
- **Kết quả mong đợi:** Redirect về `/admin` (nếu super_admin/manager) hoặc `/` (nếu employee)
- **Phân tích code:** `loginWithPhone` → hash SHA-256 → query `users` table → `setUser` → navigate. Logic đúng.
- **Trạng thái:** ✅ PASS (logic đúng, cần xác nhận live)

#### TC-AUTH-02: Login với credentials sai
- **Bước test:** Nhập sai password → Submit
- **Kết quả mong đợi:** Toast error "Sai số điện thoại hoặc mật khẩu"
- **Phân tích code:** `LoginPage.tsx:39` — `catch` block gọi `toast.error`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-AUTH-03: Form validation client-side
- **Bước test:** Submit form trống, submit phone < 10 ký tự, submit password < 6 ký tự
- **Kết quả mong đợi:** Hiện lỗi dưới field tương ứng
- **Phân tích code:** Zod schema `loginSchema` validate min(10) phone, min(6) password. `React Hook Form` + `zodResolver`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-AUTH-04: `PublicOnlyRoute` redirect khi đã đăng nhập
- **Bước test:** Đã login → navigate tới `/login`
- **Kết quả mong đợi:** Redirect về đúng portal theo role
- **Phân tích code:** `RouteGuard.tsx:23-28` — check `user`, redirect đúng.
- **Trạng thái:** ✅ PASS

#### TC-AUTH-05: `RouteGuard` chặn truy cập chưa login
- **Bước test:** Chưa login → navigate tới `/admin/employees`
- **Kết quả mong đợi:** Redirect về `/login`
- **Phân tích code:** `RouteGuard.tsx:11-12` — `if (!user) return <Navigate to="/login" replace />`
- **Trạng thái:** ✅ PASS

#### TC-AUTH-06: `RouteGuard` ngăn wrong-role access
- **Bước test:** Login với role `employee` → navigate tới `/admin/employees`
- **Kết quả mong đợi:** Redirect về `/` (employee portal)
- **Phân tích code:** `RouteGuard.tsx:14-16` — check `allowedRoles.includes(user.role)`, fallback đúng.
- **Trạng thái:** ✅ PASS

#### TC-AUTH-07: Logout
- **Bước test:** Click user menu → Đăng xuất
- **Kết quả mong đợi:** Session cleared, redirect `/login`, toast "Đã đăng xuất"
- **Phân tích code:** `AdminTopbar.tsx:18-21` — `logout()` + `navigate('/login')` + `toast.success`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-AUTH-08: Session persist qua page reload
- **Bước test:** Login → đóng tab → mở lại → không cần login lại
- **Kết quả mong đợi:** Session được restore từ localStorage, user ở đúng page
- **Phân tích code:** `authStore.ts` dùng Zustand persist, `onRehydrateStorage` restore user từ localStorage. Logic đúng nhưng có bug — xem `[BUG-02]`.
- **Trạng thái:** ⚠️ PARTIAL — xem `[BUG-02]`

#### TC-AUTH-09: Session expire sau 12 giờ [NEEDS-LIVE]
- **Bước test:** Login → set clock +13h → reload page
- **Kết quả mong đợi:** Session expired, redirect `/login`
- **Phân tích code:** `onRehydrateStorage` kiểm tra `Date.now() > session.expiresAt`. Logic đúng nhưng TTL có bug — xem `[BUG-03]`.
- **Trạng thái:** ⚠️ BUG — xem `[BUG-03]`

---

### 3.2 ADMIN LAYOUT

#### TC-LAYOUT-01: Sidebar navigation
- **Bước test:** Click từng menu item trong sidebar
- **Kết quả mong đợi:** Navigate đến đúng route, active state highlight orange
- **Phân tích code:** `AdminSidebar.tsx` — 9 nav items với `NavLink`, class `bg-orange-50 text-orange-600` khi active. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-LAYOUT-02: Topbar user menu
- **Bước test:** Click user menu button
- **Kết quả mong đợi:** Dropdown hiện, có nút Đăng xuất
- **Phân tích code:** `AdminTopbar.tsx` dùng `DropdownMenu`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-LAYOUT-03: Topbar không hiển thị thông tin user hữu ích
- **Bước test:** Xem topbar sau khi đăng nhập
- **Kết quả mong đợi:** Hiện tên hoặc số điện thoại user
- **Phân tích code:** `AdminTopbar.tsx:24` — chỉ hiện "Super Admin" hoặc "Manager" (role label). Số điện thoại và tên không được hiển thị. Users table không có `full_name` column. 
- **Trạng thái:** ⚠️ UX — xem `[BUG-06]`

#### TC-LAYOUT-04: Route không tồn tại
- **Bước test:** Navigate tới `/admin/nonexistent-route`
- **Kết quả mong đợi:** 404 page hoặc redirect
- **Phân tích code:** `router.tsx` không có catch-all `*` route. React Router sẽ render blank page.
- **Trạng thái:** ❌ FAIL — xem `[BUG-07]`

---

### 3.3 EMPLOYEE MANAGEMENT

#### TC-EMP-01: List page load
- **Bước test:** Navigate tới `/admin/employees`
- **Kết quả mong đợi:** Bảng hiển thị danh sách nhân viên, có skeleton loading
- **Phân tích code:** `useEmployees` query với `enabled: !!branchId`. `isLoading` → `TableSkeleton`. Khi data empty → `EmptyState`. Đúng.
- **Trạng thái:** ✅ PASS (logic đúng)

#### TC-EMP-02: Search theo tên
- **Bước test:** Nhập tên vào search box
- **Kết quả mong đợi:** Kết quả filter realtime với debounce
- **Phân tích code:** `EmployeeListPage.tsx:75` — `onChange={(e) => { setSearch(e.target.value); setPage(0) }}`. **Không có debounce**. Mỗi keystroke trigger TanStack Query refetch (tuy nhiên có `staleTime: 30_000` nên cache có thể giảm thiểu). Handoff document tuyên bố "debounce" nhưng code không implement.
- **Trạng thái:** ❌ FAIL — xem `[BUG-01]`

#### TC-EMP-03: Filter theo status
- **Bước test:** Chọn filter "Đang làm", "Tạm nghỉ", "Đã nghỉ"
- **Kết quả mong đợi:** List lọc theo status
- **Phân tích code:** `useEmployees.ts:30` — `if (status) query = query.eq('status', status)`. Khi select "all" → `statusFilter = ''` → không filter. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-EMP-04: Filter theo loại nhân viên
- **Bước test:** Chọn "Toàn thời gian", "Bán thời gian"
- **Kết quả mong đợi:** List lọc theo type
- **Phân tích code:** Tương tự TC-EMP-03. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-EMP-05: Pagination
- **Bước test:** Khi có > 15 nhân viên → click Tiếp/Trước
- **Kết quả mong đợi:** Chuyển trang đúng, pagination hiển thị "Trang X/Y"
- **Phân tích code:** `EmployeeListPage.tsx:148-160` — logic đúng. `totalPages > 1` mới render pagination. `range()` tính đúng.
- **Trạng thái:** ✅ PASS

#### TC-EMP-06: Thêm nhân viên
- **Bước test:** Click "Thêm nhân viên" → điền form → Submit
- **Kết quả mong đợi:** Nhân viên được thêm, dialog đóng, toast success, list refresh
- **Phân tích code:** `useUpsertEmployee` insert không có `id`. `onSuccess` → `qc.invalidateQueries`. Dialog đóng qua `onSuccess`. Đúng.
- **Trạng thái:** ✅ PASS (logic đúng)

#### TC-EMP-07: Form validation khi thêm nhân viên
- **Bước test:** Submit form thiếu tên, thiếu lương, thiếu ngày vào làm
- **Kết quả mong đợi:** Error message hiển thị dưới field
- **Phân tích code:** `employeeFormSchema` — `full_name` min(2), `base_salary` min(1), `join_date` min(1). Đúng.
- **Trạng thái:** ✅ PASS

#### TC-EMP-08: Employee code tự sinh
- **Bước test:** Thêm nhân viên mới → kiểm tra employee_code
- **Kết quả mong đợi:** Code dạng `EMP-0001`, tăng dần
- **Phân tích code:** DB trigger `set_employee_code` → `generate_employee_code()` function dùng sequence. Đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE xác nhận]

#### TC-EMP-09: Click row → mở detail page
- **Bước test:** Click vào bất kỳ row nhân viên nào
- **Kết quả mong đợi:** Navigate tới `/admin/employees/:id`
- **Phân tích code:** `EmployeeListPage.tsx:127-129` — `onClick={() => navigate(\`/admin/employees/${emp.id}\`)}`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-EMP-10: Detail page - tab Thông tin
- **Bước test:** Mở detail page → kiểm tra tab "Thông tin chung"
- **Kết quả mong đợi:** Hiện đúng loại, ngày vào làm, phòng ban, chức vụ, ghi chú
- **Phân tích code:** `EmployeeDetailPage.tsx:59-93`. Data từ `useEmployee`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-EMP-11: Detail page - tab Lương
- **Bước test:** Click tab "Lương & phụ cấp"
- **Kết quả mong đợi:** Hiện lương cơ bản, phụ cấp, thu nhập dự kiến
- **Phân tích code:** `EmployeeDetailPage.tsx:95-118`. `base_salary + allowance` tính inline. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-EMP-12: Detail page - tab Ca làm việc
- **Bước test:** Click tab "Ca làm việc"
- **Kết quả mong đợi:** Hiển thị ca được gán của nhân viên
- **Phân tích code:** `EmployeeDetailPage.tsx:121-133` — chỉ hiện text static "Quản lý ca làm việc tại trang Ca làm việc". Data từ `employee_shift_assignments` được query nhưng không được render.
- **Trạng thái:** ⚠️ INCOMPLETE — xem `[BUG-05]`

#### TC-EMP-13: Edit nhân viên
- **Bước test:** Mở detail → click "Chỉnh sửa" → sửa tên → Save
- **Kết quả mong đợi:** Dialog mở với data cũ, update thành công, toast success
- **Phân tích code:** `EmployeeDetailPage.tsx:25-29` — `upsert.mutate({ ...values, id, branch_id })`. `EmployeeForm` nhận `defaultValues`. Đúng.
- **Trạng thái:** ✅ PASS (logic đúng)

#### TC-EMP-14: Import/Export buttons
- **Bước test:** Click "Import" hoặc "Export"
- **Kết quả mong đợi:** (per handoff: chưa implement)
- **Phân tích code:** `EmployeeListPage.tsx:54-62` — buttons render nhưng không có `onClick` handler. Click không làm gì.
- **Trạng thái:** ⚠️ KNOWN — đã document trong handoff `[DEBT-02]`

---

### 3.4 SHIFT CONFIGURATION

#### TC-SHF-01: List page load
- **Bước test:** Navigate tới `/admin/shifts`
- **Kết quả mong đợi:** Danh sách ca, có tên, giờ, grace period, trạng thái
- **Phân tích code:** `useShifts` query đúng. Table render đúng columns. Badge variant `success`/`secondary` cho `is_active`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-SHF-02: Tạo ca mới - validation end_time > start_time
- **Bước test:** Nhập start_time = "08:00", end_time = "07:00" (không check qua đêm) → Submit
- **Kết quả mong đợi:** Error "Giờ kết thúc phải sau giờ bắt đầu"
- **Phân tích code:** `shiftFormSchema` — `.refine((data) => data.is_overnight || data.end_time > data.start_time, ...)`. String comparison `"07:00" > "08:00"` = `false` → error. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-SHF-03: Tạo ca qua đêm (bypass end_time validation)
- **Bước test:** Check "Ca qua đêm" → nhập start = "22:00", end = "06:00" → Submit
- **Kết quả mong đợi:** Thành công, ca được tạo, hiện badge "Qua đêm"
- **Phân tích code:** `refine` short-circuit với `data.is_overnight`. `ShiftListPage.tsx:77-80` — hiện badge "Qua đêm". Đúng.
- **Trạng thái:** ✅ PASS

#### TC-SHF-04: Edit ca — form populate đúng data cũ
- **Bước test:** Click edit icon trên một ca → kiểm tra form
- **Kết quả mong đợi:** Form điền sẵn data của ca đó
- **Phân tích code:** `ShiftListPage.tsx:31` — `setEditTarget(shift)`, dialog render `ShiftForm` với `defaultValues={editTarget}`. `ShiftForm` init form với defaultValues. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-SHF-05: Xóa ca không có nhân viên
- **Bước test:** Click delete → confirm
- **Kết quả mong đợi:** Ca xóa thành công, toast "Đã xóa ca", list refresh
- **Phân tích code:** `useDeleteShift` → `supabase.from('shifts').delete().eq('id', id)`. `onSuccess` → invalidate + toast. Đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE xác nhận FK behavior]

#### TC-SHF-06: Xóa ca đang có nhân viên được gán
- **Bước test:** Xóa ca đang có `employee_shift_assignments` record
- **Kết quả mong đợi:** Error toast "Ca này đang được gán cho nhân viên..."
- **Phân tích code:** `useShifts.ts:74-79` — check `err.message.includes('foreign key') || err.message.includes('referenced')`. **Vấn đề:** Supabase trả về lỗi FK violation với message dạng `"violates foreign key constraint"`. Condition `includes('foreign key')` sẽ match. Tuy nhiên cần verify exact error message từ Supabase JS v2.
- **Trạng thái:** ⚠️ NEEDS-LIVE — xem `[BUG-04]`

#### TC-SHF-07: ConfirmDialog trước khi xóa
- **Bước test:** Click delete icon → kiểm tra dialog confirm xuất hiện
- **Kết quả mong đợi:** Dialog hỏi xác nhận, nút "Xóa" destructive style
- **Phân tích code:** `ShiftListPage.tsx:144-153` — `ConfirmDialog` với `variant="destructive"`. Đúng.
- **Trạng thái:** ✅ PASS

---

### 3.5 EMPLOYEE PORTAL

#### TC-EMP-PORTAL-01: Dashboard load
- **Bước test:** Login với employee account → xem dashboard
- **Kết quả mong đợi:** Greeting, salary preview (placeholder), metric cards
- **Phân tích code:** `EmployeeDashboardPage.tsx` — hiện greeting với `profile?.role` (không phải tên). Salary hiện "—". Cards hiện "—". Đây là placeholder per handoff.
- **Trạng thái:** ⚠️ UX — xem `[BUG-08]`

#### TC-EMP-PORTAL-02: Bottom navigation
- **Bước test:** Click 5 tab trong bottom nav
- **Kết quả mong đợi:** Navigate đúng route, active tab highlight orange
- **Phân tích code:** `EmployeeLayout.tsx` — 5 NavLink items với active class `text-orange-500`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-EMP-PORTAL-03: Employee Portal trang placeholder
- **Bước test:** Click Chấm công, Nghỉ phép, Đổi ca, Lương tabs
- **Kết quả mong đợi:** Placeholder page với title
- **Phân tích code:** `EmployeePlaceholderPage` render với `title` prop. Đúng.
- **Trạng thái:** ✅ PASS (per scope Phase 1)

---

### 3.6 DATABASE SCHEMA & SECURITY

#### TC-DB-01: Migration SQL syntax
- **Bước test:** Review toàn bộ migration file
- **Kết quả mong đợi:** Syntax hợp lệ, foreign keys đúng, constraints đầy đủ
- **Phân tích:** 16 tables, UUID PKs, proper FK constraints, indexes đầy đủ. `update_updated_at` trigger đúng. Employee code sequence đúng.
- **Trạng thái:** ✅ PASS

#### TC-DB-02: RLS policies
- **Bước test:** Kiểm tra RLS setup
- **Kết quả mong đợi:** Tất cả tables có RLS enabled
- **Phân tích:** Migration line 340-370 — RLS `ENABLE` cho tất cả 16 tables + policy `allow_all` cho anon và authenticated. Đây là intentional design (app nội bộ, auth ở tầng app).
- **Trạng thái:** ✅ PASS (theo design)

#### TC-DB-03: Seed data
- **Bước test:** Chạy migration → kiểm tra seed data
- **Kết quả mong đợi:** Branch "Chi nhánh chính" và user super_admin được tạo
- **Phân tích:** `INSERT ... ON CONFLICT DO NOTHING` đúng, có thể chạy lại idempotent.
- **Trạng thái:** ✅ PASS

---

## 4. Bugs & Issues phát hiện

### [BUG-01] Search không có debounce — MEDIUM
- **Mô tả:** `EmployeeListPage.tsx:75` — `onChange` set state trực tiếp, không có `setTimeout`/`useDebounce`.
- **Ảnh hưởng:** Mỗi keystroke gửi query lên Supabase. Với 50 NV ít ảnh hưởng nhưng không đúng với handoff spec.
- **File:** `src/features/employees/pages/EmployeeListPage.tsx:75`
- **Fix:** Dùng `useDebounce` hook hoặc `setTimeout` 300ms trước khi setSearch.
- **Handoff claim:** "Search theo tên: debounce, kết quả lọc đúng" — **KHÔNG ĐÚNG VỚI CODE**.

### [BUG-02] `checkExpiry` không được gọi tự động — LOW
- **Mô tả:** `authStore.ts:31-44` định nghĩa `checkExpiry()` nhưng không có component nào gọi hàm này. Tuy nhiên `onRehydrateStorage` đã handle expiry check khi app reload.
- **Ảnh hưởng:** Nếu user để tab mở > 12h mà không reload, session expired nhưng UI vẫn không force logout. Chỉ ảnh hưởng khi tab đang mở liên tục.
- **File:** `src/stores/authStore.ts:31`
- **Fix:** Gọi `checkExpiry()` trong `useEffect` ở App.tsx với `setInterval` mỗi 5 phút, hoặc dùng Zustand middleware.

### [BUG-03] Session TTL reset sau mỗi state change — LOW/MEDIUM
- **Mô tả:** `authStore.ts:49-51` — `partialize` tính `expiresAt: Date.now() + SESSION_TTL_MS` mỗi lần state thay đổi (bao gồm cả `isLoading`). TTL không phải 12h từ lúc login mà 12h từ lần cuối state update.
- **Ảnh hưởng:** Session thực tế không expire đúng 12h kể từ login. User active sẽ không bao giờ bị logout.
- **File:** `src/stores/authStore.ts:49-51`
- **Fix:** Lưu `loginAt` riêng khi login, tính `expiresAt = loginAt + SESSION_TTL_MS` cố định.

### [BUG-04] Shift FK error detection có thể không match — MEDIUM
- **Mô tả:** `useShifts.ts:74-75` kiểm tra `err.message.includes('foreign key')`. Supabase JS v2 wrap Postgres error vào object với `message`, `code`, `details`. FK violation Postgres code là `23503`. Dùng string match là fragile.
- **Ảnh hưởng:** Nếu error message format thay đổi, user sẽ thấy raw error thay vì friendly message.
- **File:** `src/features/shifts/hooks/useShifts.ts:74-79`
- **Fix:** Check `error.code === '23503'` thay vì string match.

### [BUG-05] Employee Detail tab "Ca" không hiển thị actual shift data — LOW
- **Mô tả:** `useEmployee` query join `employee_shift_assignments` nhưng `EmployeeDetailPage.tsx:121-133` không render data này — chỉ hiện text static.
- **Ảnh hưởng:** Tab "Ca làm việc" misleading — query data nhưng không display.
- **File:** `src/features/employees/pages/EmployeeDetailPage.tsx:121-133`
- **Fix Phase 2:** Render assignment data hoặc xóa join query nếu không cần trong Phase 1.

### [BUG-06] Topbar không hiển thị thông tin nhận dạng user — LOW/UX
- **Mô tả:** `AdminTopbar.tsx:24` chỉ hiện "Super Admin"/"Manager" — không hiện số điện thoại hay tên. Users table không có `full_name`. 
- **Ảnh hưởng:** Khi nhiều người dùng cùng máy, không biết ai đang đăng nhập.
- **File:** `src/layouts/AdminTopbar.tsx:24`
- **Fix:** Hiện `user.phone` (đã có trong AuthUser store).

### [BUG-07] Không có 404 catch-all route — MEDIUM
- **Mô tả:** `router.tsx` không có `{ path: '*', element: <NotFoundPage /> }`. Navigate tới route không tồn tại render blank page.
- **Ảnh hưởng:** Người dùng gõ sai URL → màn hình trắng, không có cách quay lại.
- **File:** `src/router.tsx`
- **Fix:** Thêm catch-all route với Not Found page.

### [BUG-08] Employee Dashboard hiển thị `role` thay vì tên — LOW/UX
- **Mô tả:** `EmployeeDashboardPage.tsx:10` — `{profile?.role}` hiện chữ "employee". Không thân thiện.
- **Ảnh hưởng:** Greeting "Xin chào 👋" + "employee" — UX kém.
- **File:** `src/features/employee-portal/pages/EmployeeDashboardPage.tsx:10`
- **Fix Phase 2:** Join employee data từ `employees` table để lấy `full_name`.

### [DEBT-NEW-01] `phoneToEmail` dead code trong utils — INFO
- **Mô tả:** `utils.ts:32-35` — function `phoneToEmail` convert phone sang `@hrm.local` email format. Không có chỗ nào trong codebase gọi function này. Là leftover từ thiết kế dùng Supabase Auth (đã bỏ).
- **File:** `src/lib/utils.ts:32-35`
- **Fix:** Xóa function này.

### [SECURITY-01] SHA-256 password không có salt — MEDIUM
- **Mô tả:** `auth.ts:3-10` — hash password bằng SHA-256 thuần, không salt. Nếu database bị compromise, attacker có thể dùng rainbow table để reverse hash phổ biến (e.g., "123456").
- **Ảnh hưởng:** Mật khẩu yếu dễ bị crack offline sau khi DB bị breach.
- **File:** `src/lib/auth.ts:3-10`
- **Fix:** Thêm per-user salt column trong users table, concat `salt + password` trước khi hash. Hoặc dùng bcrypt (cần Edge Function). Ưu tiên medium vì đây là app nội bộ.

### [SECURITY-02] Seed data có hardcoded UUID — INFO
- **Mô tả:** Migration seed dùng UUID cố định `00000000-0000-0000-0000-000000000001/002`. Đây là OK cho dev/test nhưng cần đổi trước production.
- **File:** `supabase/migrations/20260518000001_initial_schema.sql:379-393`

### [TYPE-01] `User` interface thiếu `phone` field — LOW
- **Mô tả:** `database.ts:19-24` — `User` interface không có `phone`. Nhưng `users` table có cột `phone` và `loginWithPhone` select `phone`. `AuthUser` trong `auth.ts` có `phone`. Hai type không đồng bộ.
- **Ảnh hưởng:** Không crash runtime nhưng type inconsistency có thể gây confusion.
- **File:** `src/types/database.ts:19-24`

---

## 5. Test cases cần chạy live [NEEDS-LIVE]

Các test case sau không thể verify qua code review, cần môi trường Supabase thật:

| ID | Test case | Lý do cần live |
|---|---|---|
| TC-LIVE-01 | Login với seed data (`0901234567` / `123456`) thực sự thành công | Cần Supabase connect |
| TC-LIVE-02 | Employee code `EMP-0001` được auto-gen đúng | DB trigger |
| TC-LIVE-03 | Shift FK error message khớp với BUG-04 | Actual Supabase error format |
| TC-LIVE-04 | Pagination với > 15 records thật | Cần data đủ lớn |
| TC-LIVE-05 | TanStack Query cache invalidation sau mutate | Runtime behavior |
| TC-LIVE-06 | Toast notification hiển thị đúng vị trí | Visual |
| TC-LIVE-07 | Supabase RLS policy "allow_all" hoạt động đúng | DB behavior |
| TC-LIVE-08 | Session restore sau page reload | localStorage behavior |

---

## 6. Tóm tắt

### Thống kê

| Hạng mục | Số lượng |
|---|---|
| Test cases đã review | 28 |
| PASS | 20 |
| FAIL / BUG | 3 |
| PARTIAL / UX | 5 |
| Cần live test | 8 |

### Bugs theo severity

| Severity | Số bug | IDs |
|---|---|---|
| High | 0 | — |
| Medium | 3 | BUG-01 (no debounce), BUG-04 (FK error check), BUG-07 (no 404 route) |
| Low | 5 | BUG-02, BUG-03, BUG-05, BUG-06, BUG-08 |
| Security | 1 | SECURITY-01 (no salt) |
| Debt/Info | 3 | DEBT-NEW-01, SECURITY-02, TYPE-01 |

### Đánh giá tổng thể

**Phase 1 đủ điều kiện để tiến sang Phase 2** với điều kiện:

**Phải fix trước Phase 2:**
1. `[BUG-01]` Thêm debounce cho search (handoff sai với thực tế code)
2. `[BUG-04]` Đổi FK error check sang `error.code === '23503'`
3. `[BUG-07]` Thêm 404 catch-all route

**Fix sớm trong Phase 2:**
4. `[BUG-03]` Session TTL cố định từ thời điểm login
5. `[BUG-06]` Hiển thị phone trong topbar
6. `[BUG-08]` Employee dashboard dùng tên thay vì role
7. `[TYPE-01]` Đồng bộ User interface với users table
8. `[DEBT-NEW-01]` Xóa `phoneToEmail` dead code

**Backlog kỹ thuật:**
9. `[SECURITY-01]` Salt password hash — consider trước khi production
10. `[BUG-02]` Auto-call `checkExpiry` nếu app mở lâu

---

*Báo cáo này dựa trên static code review. Kết quả cuối cùng cần được xác nhận qua live testing với môi trường Supabase thật.*
