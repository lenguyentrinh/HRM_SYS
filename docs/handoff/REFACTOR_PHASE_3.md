# Testing Phase 3 — Bugs Found & Fixed

**Ngày test:** 2026-05-18  
**Người test:** User  
**Trạng thái:** ✅ Tất cả đã fix, 0 TS errors

---

## Bugs đã phát hiện và fix

### [BUG-P3-01] Admin không nhận notification khi nhân viên gửi đơn nghỉ phép

**Mô tả:** Nhân viên gửi đơn xin nghỉ → không thấy noti nào lên bell của admin/manager.

**Root cause:** `useCreateLeaveRequest` chỉ insert đơn vào DB, không insert notification cho admin.

**Fix:**
- Sau khi insert `leave_requests`, query `users` theo `branch_id + role IN ('manager', 'super_admin')`
- Bulk insert notifications cho tất cả admin/manager trong branch
- `type: 'leave_request_created'`, `body`: tên NV + khoảng ngày nghỉ

**File:** `src/features/leaves/hooks/useLeaves.ts` — `useCreateLeaveRequest.mutationFn`

---

### [BUG-P3-02] Admin không nhận notification khi nhân viên gửi yêu cầu đổi ca

**Mô tả:** Tương tự BUG-P3-01 nhưng cho yêu cầu đổi ca.

**Root cause:** `useCreateShiftChangeRequest` không insert notification cho admin.

**Fix:** Cùng pattern với BUG-P3-01 — notify branch admins/managers sau khi insert yêu cầu.

**File:** `src/features/shift-change/hooks/useShiftChange.ts` — `useCreateShiftChangeRequest.mutationFn`

---

### [BUG-P3-03] Danh sách đơn nghỉ phép không reload sau khi duyệt/từ chối

**Mô tả:** Admin xác nhận duyệt hoặc từ chối → toast hiện nhưng bảng danh sách không cập nhật.

**Root cause (2 tầng):**

1. **Cột `rejection_reason` chưa tồn tại trong bảng `leave_requests`** — khi reject, Supabase UPDATE thất bại với HTTP 400 (PostgREST không chấp nhận column không tồn tại). Do code không check error (`await supabase...update({rejection_reason: ...}).eq(id)` không có `if (error) throw error`), mutation "thành công" từ góc độ JS → `onSuccess` fire → `invalidateQueries` → refetch → dữ liệu không đổi (vì UPDATE đã fail).

2. **Approve path cũng thiếu error throw** cho bước update status — nếu UPDATE fail vì RLS hoặc lý do khác, silent failure tương tự.

**Fix:**
- Migration `20260518000005_leave_rejection_reason.sql`: `ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT`
- Thêm `rejection_reason: string | null` vào type `LeaveRequest` trong `database.ts`
- Thêm `if (updateErr) throw updateErr` cho cả approve và reject path trong `useReviewLeave`

**Files:**
- `supabase/migrations/20260518000005_leave_rejection_reason.sql` *(mới)*
- `src/types/database.ts`
- `src/features/leaves/hooks/useLeaves.ts`

**Migration cần chạy:** `20260518000005_leave_rejection_reason.sql`

---

### [BUG-P3-04] Danh sách nhân viên không reload ngay sau khi thêm nhân viên thành công

**Mô tả:** Thêm nhân viên → toast "Đã thêm" → dialog đóng → nhân viên mới không xuất hiện ngay trong danh sách.

**Root cause:** `invalidateQueries` hoạt động đúng và background refetch được trigger. Tuy nhiên do `staleTime: 30_000` (30 giây), trong khoảng 1-2 giây chờ Supabase response, component hiển thị cached data (không có loading indicator). User thấy list cũ và nghĩ data không load lại.

**Fix:** Thêm `isFetching && !isLoading` spinner (Loader2) trong description của PageHeader — user thấy icon xoay khi data đang refetch ở background.

**Files:** `src/features/employees/pages/EmployeeListPage.tsx`, `src/components/shared/PageHeader.tsx` (description type: `string` → `ReactNode`)

---

### [BUG-P3-05] Danh sách đổi ca và nghỉ phép cũng thiếu indicator khi đang refetch

**Mô tả:** Tương tự BUG-P3-04 — sau approve/reject, user không thấy dấu hiệu nào cho biết data đang được tải lại.

**Fix:** Thêm Loader2 spinner vào `AdminLeavePage` và `ShiftChangePage`.

**Files:** `src/features/leaves/pages/LeavePage.tsx`, `src/features/shift-change/pages/ShiftChangePage.tsx`

---

### [BUG-P3-06] Employee portal không hiển thị lý do từ chối đơn nghỉ phép

**Mô tả:** Admin từ chối đơn với lý do nhưng nhân viên không thấy lý do đó trong danh sách đơn của mình.

**Root cause:** `EmployeeLeavePage` không render `req.rejection_reason`.

**Fix:** Thêm dòng hiển thị `rejection_reason` màu đỏ bên dưới lý do gốc của đơn.

**File:** `src/features/employee-portal/pages/LeavePage.tsx`

---

### [BUG-P3-07] Admin phải reload page mới thấy notification realtime

**Mô tả:** Nhân viên gửi đơn nghỉ phép → Admin phải F5 mới thấy notification lên bell, không realtime.

**Root cause:** Bảng `notifications` chưa được thêm vào `supabase_realtime` publication. Supabase `postgres_changes` subscription chỉ fire khi table nằm trong publication — nếu không thì channel đăng ký thành công nhưng không bao giờ nhận được event nào. RLS đã đúng (USING(true) cho anon key), subscription code đúng, chỉ thiếu bước enable publication.

**Fix:**
- Migration `20260519000001_notifications_realtime.sql`:
  - `ALTER TABLE notifications REPLICA IDENTITY FULL` — cần thiết để Realtime truyền đủ dữ liệu row
  - `ALTER PUBLICATION supabase_realtime ADD TABLE notifications`
- Thêm `refetchInterval: 30_000` vào `useNotifications` query làm fallback tự động poll 30 giây nếu realtime gián đoạn

**Files:**
- `supabase/migrations/20260519000001_notifications_realtime.sql` *(mới)*
- `src/features/notifications/hooks/useNotifications.ts`

**Migration cần chạy:** `20260519000001_notifications_realtime.sql`

---

### [BUG-P3-08] Click notification không redirect và không reload data

**Mô tả:** Click vào notification đơn nghỉ phép không dẫn đến trang `/admin/leaves` hoặc `/leave`. Nếu đang đứng sẵn ở trang đó thì data cũng không được refresh.

**Fix:** Redesign `NotificationBell` click handler:
- Thêm `useNavigate`, `useLocation`, `useQueryClient`, `useAuthStore` vào component
- Hàm `getNotifMeta(type, isAdmin)` map notification type → `{ route, queryKeys[] }`
- Click handler: mark as read → `invalidateQueries` cho data liên quan → navigate nếu chưa ở đúng trang (nếu đã ở đó thì chỉ invalidate để force refetch)
- Fix icon map: `leave_request_new` → `leave_request_created`, `shift_change_new` → `shift_change_created`

**Routing logic:**

| Notification type | Admin route | Employee route |
|---|---|---|
| `leave_request_created`, `leave_approved`, `leave_rejected` | `/admin/leaves` | `/leave` |
| `shift_change_created`, `shift_change_approved`, `shift_change_rejected` | `/admin/shift-changes` | `/shift-change` |
| `payroll_confirmed` | — | `/salary` |

**File:** `src/features/notifications/components/NotificationBell.tsx`

---

## Tóm tắt thay đổi

| File | Loại thay đổi |
|---|---|
| `supabase/migrations/20260518000005_leave_rejection_reason.sql` | Mới — cột `rejection_reason` cho `leave_requests` |
| `src/types/database.ts` | Thêm `rejection_reason` vào `LeaveRequest` |
| `src/features/leaves/hooks/useLeaves.ts` | Fix error handling + admin notification |
| `src/features/shift-change/hooks/useShiftChange.ts` | Fix error handling + admin notification |
| `src/components/shared/PageHeader.tsx` | `description` prop: `string` → `ReactNode` |
| `src/features/employees/pages/EmployeeListPage.tsx` | isFetching spinner |
| `src/features/leaves/pages/LeavePage.tsx` | isFetching spinner |
| `src/features/shift-change/pages/ShiftChangePage.tsx` | isFetching spinner |
| `src/features/employee-portal/pages/LeavePage.tsx` | Hiển thị rejection_reason |
| `supabase/migrations/20260519000001_notifications_realtime.sql` | Mới — enable realtime publication cho notifications |
| `src/features/notifications/hooks/useNotifications.ts` | Thêm refetchInterval 30s làm fallback |
| `src/features/notifications/components/NotificationBell.tsx` | Click → navigate + invalidate data tương ứng |

---

## Notification triggers — bảng đầy đủ sau Phase 3 + fixes

| Sự kiện | Người gửi | Người nhận | Type |
|---|---|---|---|
| Gửi đơn nghỉ phép | Employee | Tất cả manager/super_admin trong branch | `leave_request_created` |
| Duyệt đơn nghỉ phép | Admin | Employee | `leave_approved` |
| Từ chối đơn nghỉ phép | Admin | Employee | `leave_rejected` |
| Gửi yêu cầu đổi ca | Employee | Tất cả manager/super_admin trong branch | `shift_change_created` |
| Duyệt đổi ca | Admin | Employee | `shift_change_approved` |
| Từ chối đổi ca | Admin | Employee | `shift_change_rejected` |
| Xác nhận bảng lương | Admin | Tất cả NV trong tháng | `payroll_confirmed` |

---

## Checklist QC Test (bổ sung sau Phase 3)

- [ ] Employee gửi đơn nghỉ phép → Admin login → Bell hiện badge + notification "Đơn xin nghỉ phép mới"
- [ ] Employee gửi yêu cầu đổi ca → Admin login → Bell hiện badge + notification "Yêu cầu đổi ca mới"
- [ ] Admin từ chối đơn nghỉ phép với lý do → Danh sách admin reload (có spinner trong lúc load) → Employee thấy lý do từ chối màu đỏ trong `/leave`
- [ ] Admin duyệt đơn nghỉ phép → Danh sách admin reload → Status đổi thành "Đã duyệt"
- [ ] Thêm nhân viên mới → Dialog đóng → Spinner hiện trong title → Nhân viên xuất hiện trong danh sách sau 1-2 giây
- [ ] Admin từ chối yêu cầu đổi ca → Danh sách reload với status mới
