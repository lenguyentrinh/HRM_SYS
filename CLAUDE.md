# HRM System – Claude Code Context

Web app quản lý nhân sự nội bộ cho ~50 nhân viên: chấm công QR, tính lương, nghỉ phép.
App nội bộ công ty — **không cần SEO, không cần SSR**. Mọi người dùng đều có tài khoản.

---

## Tổng quan hệ thống

**2 portal riêng biệt**, layout và route guard khác nhau:

| Portal | Route prefix | Người dùng | Mục đích |
|---|---|---|---|
| Admin Portal | `/admin/*` | `super_admin`, `manager` | Quản lý vận hành toàn bộ hệ thống |
| Employee Portal | `/` | `employee` | Chấm công, xem lương, nộp đơn |

**Sau đăng nhập**, hệ thống đọc `users.role` từ Supabase và redirect:
- `super_admin` / `manager` → `/admin/dashboard`
- `employee` → `/` (dashboard cá nhân)

---

## Commands

```bash
npm run dev        # Dev server tại http://localhost:5173
npm run build      # Build production (output: dist/)
npm run preview    # Preview bản build production
npm run typecheck  # Kiểm tra TypeScript (không emit)
npm run lint       # ESLint check
```

---

## Cấu trúc thư mục

```
src/
  components/
    ui/                   # shadcn/ui components (không sửa trực tiếp)
    admin/                # Layout, Sidebar, shared components Admin portal
    employee/             # Layout, BottomNav, shared components Employee portal
    shared/               # Components dùng ở cả 2 portal (NotificationBell, Avatar...)
  pages/
    admin/
      DashboardPage.tsx
      EmployeesPage.tsx
      EmployeeDetailPage.tsx
      AttendancePage.tsx
      LeavePage.tsx
      PayrollPage.tsx
      SettingsPage.tsx    # Chỉ super_admin
      AnalyticsPage.tsx
    employee/
      HomePage.tsx        # Dashboard + salary preview
      CheckinPage.tsx     # QR scanner
      AttendanceHistoryPage.tsx
      LeavePage.tsx       # Danh sách đơn + form tạo mới
      SalaryPage.tsx      # Chi tiết lương
      ProfilePage.tsx
    auth/
      LoginPage.tsx
  hooks/
    useAuth.ts            # User hiện tại + role
    useAttendance.ts
    useLeave.ts
    usePayroll.ts
    useNotifications.ts   # Realtime subscription
  lib/
    supabase.ts           # Supabase client singleton
    utils.ts              # formatCurrency, formatDate, calcWorkingDays...
    payroll.ts            # Công thức tính lương (dùng cả client preview)
  stores/
    authStore.ts          # Zustand: user, role, branch_id
    uiStore.ts            # Zustand: sidebar open, notification count
  types/
    supabase.ts           # Auto-generated từ Supabase CLI
    index.ts              # Custom types: EmployeeWithUser, AttendanceWithShift...
supabase/
  functions/
    checkin/              # Validate QR + ghi attendance
    generate-qr/          # Sinh QR token (gọi bởi pg_cron)
    calculate-payroll/    # Tính lương tháng
    bulk-import/          # Import nhân viên từ Excel
    salary-preview/       # Lương dự kiến realtime
  migrations/             # SQL migration files (đặt tên: YYYYMMDDHHMMSS_desc.sql)
docs/                     # Tài liệu dự án — đọc trước khi code
  PLANNING.md             # Đặc tả tính năng đầy đủ + task checklist
  DATABASE.md             # Schema, ERD, data flows
  API.md                  # Edge Functions + query patterns
  VALIDATIONS.md          # Business rules
  DESIGN.md               # Design system, components, UX patterns
  handoff/                # Handoff files khi kết thúc mỗi phase
rules/                    # Coding rules — đọc trước khi viết code
skills/                   # Skill templates tái sử dụng
```

---

## Tech Stack

| Layer | Công nghệ | Lý do chọn |
|---|---|---|
| Frontend | React 18 + Vite | App nội bộ, không cần SSR. Vite nhanh hơn Next.js |
| Language | TypeScript strict | Type safety toàn bộ, đặc biệt Supabase types |
| Styling | Tailwind CSS + shadcn/ui | Utility-first, component library sẵn có |
| Server state | TanStack Query | Cache, refetch, optimistic updates |
| UI state | Zustand | Nhẹ hơn Redux, đủ cho app này |
| Database | Supabase PostgreSQL | Realtime, Auth, Edge Functions tích hợp sẵn |
| Auth | Custom (SHA-256 + Zustand persist) | Không dùng Supabase Auth — tự quản lý users table |
| Realtime | Supabase Realtime | Notifications không cần WebSocket server riêng |
| Edge Logic | Supabase Edge Functions (Deno) | Logic server-side: tính lương, validate QR |
| Cron | Supabase pg_cron | Auto-gen QR token 30' trước mỗi ca |
| Deploy | Nginx / Cloudflare Pages | Static files, không cần Node server |

---

## Kiến trúc quan trọng — đọc kỹ trước khi code

### Multi-branch
Mọi bảng có `branch_id`. Hiện tại 1 chi nhánh nhưng thiết kế để mở rộng. Không hardcode branch logic.

### Lookup ca của nhân viên
Khi cần biết ca của nhân viên X vào ngày Y:
1. Kiểm tra `shift_schedules` (override cụ thể theo ngày) — ưu tiên cao hơn
2. Nếu không có → fallback về `employee_shift_assignments` (ca tháng mặc định)

### QR Token flow
- `pg_cron` → gọi Edge Function `generate-qr` lúc 06:30 mỗi ngày
- Mỗi ca có 1 token duy nhất per ngày (`UNIQUE shift_id + date`)
- Token expire đúng giờ kết thúc ca
- Tablet tại văn phòng hiển thị QR của ca hiện tại, tự refresh

### Salary Preview vs Payroll Record
- **Salary preview** (Employee Portal): tính realtime không lưu DB, chỉ tính đến hôm nay
- **Payroll record** (Admin Portal): tính cuối tháng, lưu DB với status `draft` → `confirmed`
- Khi `confirmed`: lock, không tính lại được trừ khi super_admin unlock

### Auth flow (Custom)
- Không dùng `supabase.auth.*` — toàn bộ auth đi qua `src/lib/auth.ts`
- Login: query `users` table bằng phone + SHA-256(password)
- Session: lưu `{ id, role, branch_id, phone }` vào Zustand store, persist vào `localStorage` key `hrm-auth`
- Route guard đọc từ store — không cần async call khi khởi động app
- Tạo user mới: `createUserWithPhone()` trong `src/lib/auth.ts` (admin dùng khi thêm NV)

### Notifications
- Insert vào bảng `notifications` → Supabase Realtime trigger → client nhận ngay
- Không polling, không cần WebSocket server riêng
- Mỗi user subscribe 1 channel riêng theo `user_id`

---

## Route Map

```
/login                          # Đăng nhập (redirect nếu đã đăng nhập)

# Admin Portal (cần role: super_admin hoặc manager)
/admin/dashboard                # Tổng quan hôm nay
/admin/employees                # Danh sách nhân viên
/admin/employees/:id            # Chi tiết nhân viên
/admin/attendance               # Bảng chấm công
/admin/leaves                   # Quản lý nghỉ phép
/admin/shift-changes            # Yêu cầu đổi ca
/admin/payroll                  # Bảng lương
/admin/analytics                # Báo cáo thống kê
/admin/settings                 # Cài đặt (super_admin only)

# Employee Portal (cần role: employee)
/                               # Dashboard cá nhân + salary preview
/checkin                        # QR check-in scanner
/attendance                     # Lịch sử chấm công cá nhân
/leaves                         # Đơn nghỉ phép
/salary                         # Xem lương
/profile                        # Thông tin cá nhân

# Public (không cần đăng nhập)
/tablet/:branch_id              # Trang hiển thị QR cho tablet tại văn phòng
```

---

## Key Docs

| File | Đọc khi nào |
|---|---|
| [docs/PLANNING.md](docs/PLANNING.md) | Hiểu tính năng cần build — đọc đầu tiên |
| [docs/DATABASE.md](docs/DATABASE.md) | Trước khi viết query hoặc migration |
| [docs/API.md](docs/API.md) | Trước khi gọi Edge Function hoặc Supabase |
| [docs/VALIDATIONS.md](docs/VALIDATIONS.md) | Trước khi viết form submit hoặc Edge Function |
| [docs/DESIGN.md](docs/DESIGN.md) | Trước khi viết component UI |

---

## Rules — bắt buộc đọc trước khi code

| File | Nội dung |
|---|---|
| [rules/code-style.md](rules/code-style.md) | TypeScript, naming, imports, formatting |
| [rules/security.md](rules/security.md) | RLS, keys, auth, input validation |
| [rules/supabase-patterns.md](rules/supabase-patterns.md) | Query patterns, realtime, migration |

---

## Quy tắc Handoff — bắt buộc khi kết thúc Phase

**Khi hoàn thành một phase, phải tạo file handoff trước khi chuyển sang phase tiếp theo.**

File handoff dùng để QC test và bàn giao — phải đủ chi tiết để người không tham gia development đọc và hiểu được.

### Vị trí file
```
docs/handoff/PHASE_1_HANDOFF.md
docs/handoff/PHASE_2_HANDOFF.md
docs/handoff/PHASE_3_HANDOFF.md
docs/handoff/PHASE_4_HANDOFF.md
```

### File testing bổ sung (TESTING_PHASE_X.md)
Nếu sau khi bàn giao phase có phát sinh bug và fix thêm, tạo file riêng:
```
docs/handoff/TESTING_PHASE_3.md   ← bugs phát hiện khi QC test Phase 3
docs/handoff/TESTING_PHASE_4.md   ← tương tự cho Phase 4
```
File này ghi lại: bug description, root cause, fix, files changed — **không** gộp vào file HANDOFF chính để giữ handoff clean.

### File fix log (FIX_BUGS_PHASE_X.md) — bắt buộc sau khi fix bugs từ TESTING file
Sau khi fix tất cả bugs được log trong `TESTING_PHASE_X.md`, **bắt buộc** tạo file:
```
docs/handoff/FIX_BUGS_PHASE_3_4.md   ← ví dụ đã tạo
docs/handoff/FIX_BUGS_PHASE_5.md     ← tạo sau khi fix bugs từ TESTING_PHASE_5.md
```
File này ghi lại từng bug đã fix: mô tả, root cause, files sửa, cách test verify — để QC có thể retest.  
**Rule:** Mỗi lần fix bugs từ một TESTING file → phải tạo FIX_BUGS file tương ứng trước khi báo hoàn thành.

### Cấu trúc bắt buộc của file Handoff

```markdown
# Phase X Handoff – [Tên Phase]

## Tổng quan
- Mục tiêu ban đầu của phase
- Kết quả thực tế đạt được (% hoàn thành, deviation nếu có)
- Ngày hoàn thành

## Tính năng đã hoàn thành
### [Tên tính năng]
- Mô tả hoạt động như thế nào (luồng từ đầu đến cuối)
- Các edge case đã xử lý
- File/component chính liên quan
- Cách test thủ công

(lặp lại cho từng tính năng)

## Tính năng chưa hoàn chỉnh hoặc bị bỏ qua
- Tên tính năng: lý do chưa làm, ảnh hưởng đến phase sau

## Known Issues & Technical Debt
- [BUG/DEBT-XX] Mô tả vấn đề, tại sao chưa fix, mức độ ảnh hưởng

## Checklist QC Test
- [ ] Test case 1: mô tả bước test + kết quả mong đợi
- [ ] Test case 2: ...
(tối thiểu 1 test case cho mỗi tính năng đã hoàn thành)

## Ghi chú cho Phase tiếp theo
- Những dependency phase sau phải biết
- Những quyết định kỹ thuật phase sau cần tôn trọng
- Những vấn đề tồn đọng cần fix ngay đầu phase sau
```

### Ví dụ tên issue trong Known Issues
- `[BUG-01]` — lỗi logic cần fix
- `[DEBT-01]` — technical debt chấp nhận được nhưng cần clean up
- `[LIMIT-01]` — limitation có chủ ý (không phải bug, nhưng QC cần biết)
