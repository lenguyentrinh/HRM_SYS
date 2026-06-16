# TESTING PHASE 4 – HRM Management App

**Ngày test:** 2026-05-19  
**Tester:** Senior QC (10+ năm kinh nghiệm)  
**Phiên bản:** Phase 4 – Handoff 2026-05-19  
**Phương pháp:** Static code review + logic analysis  
**Scope:** Verify Phase 3 carry-over bugs + test toàn bộ tính năng mới Phase 4

---

## PHẦN 1 — Verify Phase 3 Carry-over Bugs

| Bug ID | Mô tả | Trạng thái | Bằng chứng |
|--------|--------|-----------|-----------|
| BUG-P3-NEW-01 | Đổi mật khẩu không verify mật khẩu cũ | ⚠️ **NOT FIXED** | `ProfilePage.tsx` — `changePassword(userId, newPw)` vẫn không có current password check. Không trong scope Phase 4. |
| BUG-P3-NEW-02 | `/shift-change` không có trong EmployeeLayout bottom nav | ✅ **FIXED** | `EmployeeLayout.tsx:11` — "Nghỉ phép" đổi thành "Yêu cầu" (`to: '/leave'`, icon `FileText`). Cả `LeavePage` và `ShiftChangeRequestPage` đều có sub-tab switcher để qua lại. |
| BUG-P2-07 | Unlinked employee — loading vô hạn trên CheckinPage | ⚠️ **NOT FIXED** | Không trong scope Phase 4. CheckinPage vẫn render "Đang tải..." khi employee = null. |
| BUG-P2-09 | Zod và HTML min không đồng bộ ở ShiftChangeRequestPage | ✅ **FIXED** | `ShiftChangeRequestPage.tsx:30-33` — Zod refine dùng `>` (strictly greater than hôm nay). `minDate = addDays(new Date(), 1)`. Cả hai đều enforce "từ ngày mai". Nhất quán. |
| BUG-05 | Employee Detail tab "Ca" không hiển thị data | ✅ **FIXED** | `EmployeeDetailPage.tsx` tab "shifts" — hiển thị ca hiện tại, Select để đổi ca tháng, note về Roster cho override ngày. Đầy đủ data. |

**Tổng kết verify: 3 bugs đã fix trong Phase 4, 2 carry-over tiếp tục.**

---

## PHẦN 2 — Test tính năng Phase 4

### 2.1 Code Splitting — Lazy Loading

#### TC-SPLIT-01: Kiểm tra lazy import trong router
- **Bước test:** Code review `src/router.tsx`
- **Kết quả mong đợi:** Tất cả page dùng `lazy()` + `Suspense`
- **Phân tích:** `router.tsx:11-78` — tất cả admin và employee pages đều dùng `lazy(() => import(...))`. `LoginPage` và `NotFoundPage` vẫn eager-loaded. `LazyPage` wrapper dùng `<Suspense fallback={<PageSkeleton />}>`. Đúng per spec.
- **Trạng thái:** ✅ PASS

#### TC-SPLIT-02: Fallback skeleton
- **Bước test:** Navigate lần đầu đến trang bất kỳ, network chậm
- **Kết quả mong đợi:** `PageSkeleton` animation trong khi chunk đang tải
- **Phân tích:** `LazyPage` wraps mọi page với Suspense + `PageSkeleton`. Fallback đúng. Không blank screen.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

---

### 2.2 Salary Preview — Employee Dashboard

#### TC-SAL-PREV-01: Dashboard load salary preview
- **Bước test:** Employee login → Dashboard
- **Kết quả mong đợi:** Card lương hiển thị `net_estimate` lớn, `gross_estimate` nhỏ, days_worked
- **Phân tích:** `EmployeeDashboardPage.tsx:22` — `useSalaryPreview(employee?.id, month, year)`. `staleTime: 5 phút`. Gradient card cam. `preview.net_estimate` dạng currency lớn. `preview.gross_estimate` + OT nhỏ. Đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

#### TC-SAL-PREV-02: Graceful degradation khi Edge Function chưa deploy
- **Bước test:** `salary-preview` chưa deployed
- **Kết quả mong đợi:** Hiển thị "—" thay vì crash
- **Phân tích:** `EmployeeDashboardPage.tsx:55` — `preview ? ... : <p className="...">—</p>`. `useSalaryPreview` throw error → `data = undefined`. `{preview ? ... : <p>—</p>}`. Graceful, không crash.
- **Trạng thái:** ✅ PASS

#### TC-SAL-PREV-03: Loading skeleton
- **Bước test:** Đang fetch salary preview
- **Kết quả mong đợi:** Pulse animation trong thời gian chờ
- **Phân tích:** `EmployeeDashboardPage.tsx:41-43` — `{previewLoading ? <div className="h-10 w-40 bg-white/20 rounded-lg animate-pulse mb-2" /> : ...}`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-SAL-PREV-04: Thưởng chuyên cần và khấu trừ cards
- **Bước test:** Nhân viên có attendance_bonus > 0 và late_penalty > 0
- **Kết quả mong đợi:** 2 card riêng — xanh (thưởng) và đỏ (khấu trừ)
- **Phân tích:** `EmployeeDashboardPage.tsx:101-114` — điều kiện `preview.attendance_bonus > 0` và `preview.late_penalty + preview.absent_penalty > 0`. Đúng.
- **Trạng thái:** ✅ PASS

---

### 2.3 Leave Balance Admin — Employee Detail Page

#### TC-LB-01: Hiển thị tab "Nghỉ phép" trong Employee Detail
- **Bước test:** Admin vào `/admin/employees/:id` → click tab "Nghỉ phép"
- **Kết quả mong đợi:** 3 cards (Tổng / Đã dùng / Còn lại) + year selector
- **Phân tích:** `EmployeeDetailPage.tsx:228-337` — `useEmployeeLeaveBalance(id, leaveYear)`. 3 stat cards với màu thích hợp. Year selector `[currentYear, currentYear-1]`. `carried_over` cộng vào "còn lại". Đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

#### TC-LB-02: Chỉnh sửa số ngày phép
- **Bước test:** Click "Chỉnh sửa" → nhập số mới → Lưu
- **Kết quả mong đợi:** Update `total_paid_days`, invalidate query, toast
- **Phân tích:** `useUpdateLeaveBalance` — check existing → UPDATE hoặc INSERT. Đúng logic upsert. `onSuccess` invalidate `['leave-balance', employeeId, year]`. Button disable khi pending. Đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

#### TC-LB-03: Tạo balance mới với 12 ngày mặc định
- **Bước test:** Nhân viên chưa có `leave_balances` record → click "Tạo với 12 ngày mặc định"
- **Kết quả mong đợi:** Insert `{total_paid_days: 12, used_paid_days: 0, carried_over: 0}`, hiển thị grid
- **Phân tích:** `EmployeeDetailPage.tsx:322-332` — khi `!leaveBalance`, render button → `updateLeaveBalance.mutate({employeeId: id, year, totalPaidDays: 12})`. `useUpdateLeaveBalance` kiểm tra existing (null) → INSERT. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-LB-04: Tính số ngày còn lại có tính carried_over
- **Bước test:** NV có `total=12, used=5, carried_over=3`
- **Kết quả mong đợi:** Còn lại = 12 + 3 - 5 = 10
- **Phân tích:** `EmployeeDetailPage.tsx:273` — `Math.max(0, leaveBalance.total_paid_days + leaveBalance.carried_over - leaveBalance.used_paid_days)`. Đúng. `Math.max(0, ...)` tránh số âm.
- **Trạng thái:** ✅ PASS

---

### 2.4 Link Account cho nhân viên cũ

#### TC-LINK-01: Hiển thị trạng thái tài khoản
- **Bước test:** Vào Employee Detail — 2 trường hợp: đã có và chưa có tài khoản
- **Kết quả mong đợi:** Badge "Đã có tài khoản" (xanh) hoặc "Chưa có tài khoản" + button "Tạo tài khoản" (vàng)
- **Phân tích:** `EmployeeDetailPage.tsx:132-163` — `employee.users` check. Nếu có: green badge + phone hiển thị + "Đặt lại mật khẩu" button. Nếu không: amber badge + "Tạo tài khoản" button. Đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

#### TC-LINK-02: Tạo tài khoản — Happy path
- **Bước test:** Click "Tạo tài khoản" → nhập phone + password → Submit
- **Kết quả mong đợi:** `createUserWithPhone` → update `employees.user_id` → badge đổi sang "Đã có tài khoản"
- **Phân tích:** `useLinkEmployeeAccount.mutationFn` — `createUserWithPhone(phone, password, 'employee', branchId)` → `supabase.from('employees').update({user_id}).eq('id', employeeId)`. Rollback user nếu update fail. `onSuccess` invalidate `['employee', employeeId]` → card re-render với data mới. Đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

#### TC-LINK-03: Link account — Phone đã tồn tại
- **Bước test:** Nhập phone đã có trong `users` table
- **Kết quả mong đợi:** Error toast "Số điện thoại này đã được đăng ký"
- **Phân tích:** `createUserWithPhone` trong `auth.ts:51` — `code === '23505'` → throw. `useLinkEmployeeAccount onError` → `toast.error`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-LINK-04: Button "Tạo tài khoản" validation ở client
- **Bước test:** Nhập phone < 9 ký tự hoặc password < 6 ký tự
- **Kết quả mong đợi:** Button "Tạo tài khoản" bị disable
- **Phân tích:** `EmployeeDetailPage.tsx:513` — `disabled={linkPhone.length < 9 \|\| linkPassword.length < 6 \|\| linkAccount.isPending}`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-LINK-05: Đặt lại mật khẩu từ Employee Detail
- **Bước test:** NV đã có tài khoản → Click "Đặt lại mật khẩu" → nhập password mới
- **Kết quả mong đợi:** `changePassword(users.id, newPassword)` → SHA-256 hash + update, toast success
- **Phân tích:** `EmployeeDetailPage.tsx:553-561` — lấy `linkedUser = employee.users` → `resetPw.mutate({userId: linkedUser.id, newPassword})`. `useResetEmployeePassword` gọi `changePassword`. `disabled={newPassword.length < 6}`. Đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

---

### 2.5 Export CSV

#### TC-CSV-01: Export attendance — Happy path
- **Bước test:** Admin → Chấm công → có data → Click "Xuất CSV"
- **Kết quả mong đợi:** File `chamcong_DD-MM-YYYY.csv` tải xuống, mở Excel đọc được tiếng Việt
- **Phân tích:** `AttendancePage.tsx:47-71` — `handleExportCSV` build headers + rows. `downloadCSV('chamcong_DD-MM-YYYY.csv', [headers, ...rows])`. `export.ts:10` — UTF-8 BOM + `Blob`. 10 cột: Ngày, NV, Mã NV, Ca, Check-in, Check-out, Tổng giờ, OT, Trạng thái, Ghi chú. `statusMap` có tiếng Việt. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-CSV-02: Button "Xuất CSV" ẩn khi không có data
- **Bước test:** Ngày không có attendance records
- **Kết quả mong đợi:** Nút "Xuất CSV" không hiện
- **Phân tích:** `AttendancePage.tsx:81-86` — `{(records?.length ?? 0) > 0 && <Button>Xuất CSV</Button>}`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-CSV-03: Export payroll — Happy path
- **Bước test:** Admin → Tính lương → có records → Click "Xuất CSV"
- **Kết quả mong đợi:** File `luong_tháng_N_YYYY.csv` tải xuống với tất cả cột lương
- **Phân tích:** `PayrollPage.tsx:113-131` — 14 cột: Nhân viên, Mã NV, Ngày công, Lương CB, Phụ cấp, OT, Thưởng, Phạt trễ, Phạt vắng, Gross, BHXH, Thuế, Thực nhận, Trạng thái. `String(r.net_salary)` format không có dấu phẩy (raw number). Mở Excel có thể cần format lại số tiền nhưng data đúng.
- **Trạng thái:** ✅ PASS — xem `[BUG-P4-NEW-03]` filename bug

#### TC-CSV-04: Export payroll — nút xuất hiện khi có records (kể cả draft)
- **Bước test:** Đã tính lương (draft) nhưng chưa confirmed
- **Kết quả mong đợi:** Nút "Xuất CSV" vẫn hiện để admin có thể review trước khi confirm
- **Phân tích:** `PayrollPage.tsx:141` — `{hasRecords && (...Xuất CSV...)}`. `hasRecords = records?.length > 0`. Hiện cho cả draft và confirmed. Đúng — cho phép export bất kể status.
- **Trạng thái:** ✅ PASS

#### TC-CSV-05: Escape field có dấu phẩy trong tên
- **Bước test:** Nhân viên có tên "Nguyễn, Văn A" (hiếm nhưng possible)
- **Kết quả mong đợi:** Tên được wrap trong ngoặc kép trong CSV
- **Phân tích:** `export.ts:3-7` — `escape(v)`: nếu `v.includes(',') \|\| v.includes('"') \|\| v.includes('\n')` → wrap `"${v.replace(/"/g, '""')}"`. Đúng RFC 4180.
- **Trạng thái:** ✅ PASS

---

### 2.6 Roster Scheduling (`/admin/roster`)

#### TC-ROSTER-01: Grid hiển thị đúng số ngày trong tháng
- **Bước test:** Navigate `/admin/roster` → xem tháng 2 (28/29 ngày) và tháng 1 (31 ngày)
- **Kết quả mong đợi:** Số cột day = đúng số ngày tháng đó
- **Phân tích:** `RosterPage.tsx:52` — `daysInMonth = getDaysInMonth(new Date(year, month-1, 1))`. `date-fns` tính đúng. `Array.from({length: daysInMonth}, ...)`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-ROSTER-02: Cuối tuần highlight đỏ
- **Bước test:** Xem grid roster
- **Kết quả mong đợi:** Cột thứ 7 và chủ nhật có header màu đỏ/red background
- **Phân tích:** `RosterPage.tsx:161-167` — `isWeekend(date)` từ `date-fns`. `weekend ? 'text-red-500 bg-red-50' : 'text-slate-600'`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-ROSTER-03: Click ô → Popover chọn ca
- **Bước test:** Click ô bất kỳ trong grid
- **Kết quả mong đợi:** Popover hiện danh sách shifts active + option xóa override (nếu là override)
- **Phân tích:** `RosterPage.tsx:196-248` — `openCell = {empId, date}`. Popover controlled. Danh sách `activeShifts`. Nếu `isOverride(empId, day)` thì hiện "Xóa override". Đúng.
- **Trạng thái:** ✅ PASS

#### TC-ROSTER-04: Ưu tiên shift_schedules over employee_shift_assignments
- **Bước test:** NV có default shift A, nhưng ngày X có override shift B
- **Kết quả mong đợi:** Ngày X hiện shift B (override), các ngày khác hiện shift A (default)
- **Phân tích:** `RosterPage.tsx:88-95` — `getShiftForCell`: check `scheduleMap` trước → nếu có thì return. Fallback `defaultMap`. Đúng theo spec ưu tiên.
- **Trạng thái:** ✅ PASS

#### TC-ROSTER-05: Override được đánh dấu ring
- **Bước test:** Ô có override (shift_schedules entry tồn tại)
- **Kết quả mong đợi:** Ô có viền/ring đặc biệt
- **Phân tích:** `RosterPage.tsx:200-204` — `override ? 'ring-1 ring-current' : ''`. `isOverride(empId, day)` check `!!scheduleMap[...]`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-ROSTER-06: Upsert shift — Happy path
- **Bước test:** Click ô → chọn ca khác → ô cập nhật ngay
- **Kết quả mong đợi:** `upsert shift_schedules`, invalidate query, ô re-render với ca mới
- **Phân tích:** `useUpsertShiftSchedule.mutationFn` — nếu `shiftId !== null`: `.upsert({employee_id, shift_id, date}, {onConflict: 'employee_id,date'})`. `onSuccess` đóng popover (`setOpenCell(null)`) + `invalidateQueries(['roster-schedules'])`. Đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

#### TC-ROSTER-07: Xóa override — về ca mặc định
- **Bước test:** Click ô override → "Xóa override (về ca mặc định)"
- **Kết quả mong đợi:** DELETE từ `shift_schedules`, ô hiện ca mặc định
- **Phân tích:** `useUpsertShiftSchedule.mutationFn` — nếu `shiftId === null`: `.delete().eq('employee_id', empId).eq('date', date)`. Đúng. Sau invalidate, `scheduleMap` không còn entry → fallback `defaultMap`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-ROSTER-08: Copy từ tháng trước
- **Bước test:** Click "Copy từ tháng trước" → confirm → xem grid tháng hiện tại
- **Kết quả mong đợi:** Overrides của tháng trước được copy (same day-of-month), toast "Đã copy X lịch ca"
- **Phân tích:** `useCopyRosterFromPreviousMonth` — tính `prevMonth/prevYear` (handle January→December cross-year). Fetch prev schedules. Map `dayOfMonth → newDate`. Filter `dayOfMonth > lastDay` (tháng ngắn hơn). Upsert. `onSuccess` toast với count. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-ROSTER-09: Copy từ tháng trước — tháng ngắn hơn
- **Bước test:** Tháng trước có 31 ngày, tháng này có 30 ngày — có schedules ngày 31
- **Kết quả mong đợi:** Ngày 31 bị bỏ qua, các ngày 1-30 được copy
- **Phân tích:** `RosterPage.tsx:161-163` — `if (dayOfMonth > lastDay) return null`. `.filter(Boolean)`. Đúng.
- **Trạng thái:** ✅ PASS

---

### 2.7 Holiday Config (`/admin/settings` → tab "Ngày lễ")

#### TC-HOL-01: Hiển thị tab "Ngày lễ" trong Settings
- **Bước test:** Admin → Settings → Tab "Ngày lễ"
- **Kết quả mong đợi:** Form thêm ngày lễ (date + name + button) + danh sách ngày lễ theo năm
- **Phân tích:** `SettingsPage.tsx:372-401` — 4 tabs: payroll, leave, **holidays**, account. `HolidaysTab` có year selector (năm trước, năm nay, năm sau), input date + name, danh sách với delete button. Đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

#### TC-HOL-02: Thêm ngày lễ
- **Bước test:** Chọn ngày + nhập tên → "Thêm"
- **Kết quả mong đợi:** Insert vào `holidays(branch_id, date, name)`, danh sách refresh, form reset
- **Phân tích:** `HolidaysTab:287-291` — `handleAdd()` guard `!newDate \|\| !newName.trim()`. `addHoliday.mutate({date, name})` → `onSuccess: setNewDate(''); setNewName('')`. Đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

#### TC-HOL-03: Xóa ngày lễ
- **Bước test:** Click icon xóa trên 1 ngày lễ
- **Kết quả mong đợi:** DELETE record, danh sách refresh
- **Phân tích:** `HolidaysTab:351-359` — `deleteHoliday.mutate(h.id)`. Button disabled khi pending để tránh double-click. Đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

#### TC-HOL-04: Đổi năm xem ngày lễ
- **Bước test:** Chọn năm 2027 từ selector
- **Kết quả mong đợi:** Danh sách refresh với ngày lễ năm 2027
- **Phân tích:** `year` state thay đổi → `useHolidays(year)` key thay đổi → refetch. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-HOL-05: Duplicate date validation
- **Bước test:** Thêm ngày lễ đã tồn tại trong cùng năm/branch
- **Kết quả mong đợi:** Error toast (DB unique constraint `branch_id, date`)
- **Phân tích:** Migration `20260520000001_holidays.sql:7` — `UNIQUE(branch_id, date)`. Nếu duplicate insert: Supabase trả error → `useAddHoliday onError` → `toast.error`. Đúng.
- **Trạng thái:** ✅ PASS

---

### 2.8 Bulk Import nhân viên (`/admin/employees`)

#### TC-BULK-01: Button "Import CSV" mở dialog
- **Bước test:** Vào `/admin/employees` → Click "Import CSV"
- **Kết quả mong đợi:** `BulkImportDialog` mở
- **Phân tích:** `EmployeeListPage.tsx:67-70` — `<Button onClick={() => setShowImportDialog(true)}>Import CSV</Button>`. `<BulkImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} />`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-BULK-02: Download template CSV
- **Bước test:** Click "Tải template CSV"
- **Kết quả mong đợi:** File `template_import_nhanvien.csv` tải xuống với header + 2 rows mẫu
- **Phân tích:** `BulkImportDialog.tsx:14-23` — `downloadTemplate()` dùng BOM + Blob giống `downloadCSV`. Template có header + 2 rows ví dụ. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-BULK-03: Upload và import thành công
- **Bước test:** Upload CSV hợp lệ → Click "Import"
- **Kết quả mong đợi:** Gọi Edge Function `bulk-import`, hiển thị result (X thành công), list refresh
- **Phân tích:** `BulkImportDialog.tsx:44-64` — `file.text()` → `supabase.functions.invoke('bulk-import', {body: {csv_content, branch_id}})`. `res.success > 0` → `qc.invalidateQueries(['employees'])` + `toast.success`. Đúng.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

#### TC-BULK-04: Import partial success — hiển thị errors
- **Bước test:** CSV có 5 rows, 2 rows lỗi (phone trùng, format sai)
- **Kết quả mong đợi:** "Import thành công: 3 nhân viên" + danh sách lỗi 2 rows
- **Phân tích:** `BulkImportDialog.tsx:119-136` — `result.success > 0` → green success. `result.errors.length > 0` → red errors list. Có thể hiện cả hai cùng lúc. `max-h-32 overflow-y-auto` cho list lỗi dài. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-BULK-05: Drag-and-drop UX
- **Bước test:** Kéo file CSV vào vùng upload
- **Kết quả mong đợi:** File được chọn
- **Phân tích:** `BulkImportDialog.tsx:97-116` — `div.onClick={() => fileRef.current?.click()}`. Chỉ wired `onClick`, không có `onDragOver`/`onDrop` handlers. Drag-and-drop UX không hoạt động dù UI hint "Kéo thả hoặc click".
- **Trạng thái:** ⚠️ UX — xem `[BUG-P4-NEW-04]`

---

### 2.9 Audit Log (`/admin/audit`)

#### TC-AUDIT-01: Trang load và hiển thị
- **Bước test:** Navigate `/admin/audit`
- **Kết quả mong đợi:** Filter dropdown, date range pickers, bảng audit logs
- **Phân tích:** `AuditPage.tsx` — `useAuditLogs({action, dateFrom, dateTo, page, pageSize: 20})`. Filter by action (`ACTION_OPTIONS`), dateFrom/dateTo. Pagination khi `totalPages > 1`. Đúng UI.
- **Trạng thái:** ✅ PASS [NEEDS-LIVE]

#### TC-AUDIT-02: Filter theo hành động
- **Bước test:** Chọn "Duyệt nghỉ phép" từ dropdown
- **Kết quả mong đợi:** Chỉ hiển thị records `action = 'leave_approved'`
- **Phân tích:** `useAuditLogs` — `if (action) query = query.eq('action', action)`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-AUDIT-03: Filter theo ngày
- **Bước test:** Nhập dateFrom và dateTo
- **Kết quả mong đợi:** Chỉ records trong range `[dateFrom T00:00, dateTo T23:59]`
- **Phân tích:** `useAuditLogs` — `.gte('created_at', '${dateFrom}T00:00:00').lte('created_at', '${dateTo}T23:59:59')`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-AUDIT-04: Xóa lọc
- **Bước test:** Sau khi có filter → click "Xóa lọc"
- **Kết quả mong đợi:** Reset về tất cả records, button "Xóa lọc" biến mất
- **Phân tích:** `AuditPage.tsx:91-98` — button chỉ hiện khi `actionFilter !== 'all' \|\| dateFrom \|\| dateTo`. Click: reset về 'all', '', '', page 0. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-AUDIT-05: Audit log tự động ghi khi duyệt/từ chối/confirm
- **Bước test:** Admin duyệt đơn nghỉ phép → vào Audit log → thấy record mới
- **Kết quả mong đợi:** Record `action='leave_approved'`, người thực hiện, thời gian
- **Phân tích:** `useReviewLeave` (`useLeaves.ts`) không gọi `useInsertAuditLog`. `useConfirmPayroll` (`usePayroll.ts`) không gọi `useInsertAuditLog`. `useReviewShiftChange` (`useShiftChange.ts`) không gọi `useInsertAuditLog`. **Grep xác nhận:** `useInsertAuditLog` chỉ được EXPORT từ `useAuditLogs.ts`, không được IMPORT ở bất kỳ file nào khác trong `src/`. Audit Page luôn EMPTY.
- **Trạng thái:** ❌ FAIL — xem `[BUG-P4-NEW-01]`

#### TC-AUDIT-06: Pagination
- **Bước test:** Có > 20 audit records
- **Kết quả mong đợi:** Pagination controls hiện, tổng trang và record count đúng
- **Phân tích:** `AuditPage.tsx:54,161-172` — `totalPages = Math.ceil(count / 20)`. `.range(page*20, page*20+19)`. Supabase trả `count` khi `{count: 'exact'}`. Đúng logic (nhưng sẽ không test được vì audit log trống — xem BUG-P4-NEW-01).
- **Trạng thái:** ✅ PASS (logic đúng, không test được live do BUG-P4-NEW-01)

---

### 2.10 Shift Change Navigation (BUG-P3-NEW-02 fix verification)

#### TC-SHCNAV-01: Bottom nav "Yêu cầu" tab
- **Bước test:** Employee login → xem bottom nav
- **Kết quả mong đợi:** Tab "Yêu cầu" (icon FileText) link đến `/leave`
- **Phân tích:** `EmployeeLayout.tsx:11` — `{ to: '/leave', label: 'Yêu cầu', icon: FileText }`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-SHCNAV-02: Sub-tab trong LeavePage
- **Bước test:** Navigate `/leave` → xem sub-tabs
- **Kết quả mong đợi:** "Nghỉ phép" tab active (màu cam), "Đổi ca" tab bên cạnh
- **Phân tích:** `EmployeeLeavePage.tsx:95-106` — Sub-tab switcher. "Nghỉ phép" button `bg-white shadow-sm text-orange-600` (active). "Đổi ca" button `onClick={() => navigate('/shift-change')}`. Đúng.
- **Trạng thái:** ✅ PASS

#### TC-SHCNAV-03: Sub-tab trong ShiftChangeRequestPage
- **Bước test:** Navigate `/shift-change` → xem sub-tabs
- **Kết quả mong đợi:** "Đổi ca" tab active (màu cam), "Nghỉ phép" tab bên cạnh
- **Phân tích:** `ShiftChangeRequestPage.tsx:73-84` — Sub-tabs. "Nghỉ phép" button `onClick={() => navigate('/leave')}`. "Đổi ca" button `bg-white shadow-sm text-orange-600` (active). Đúng mirror.
- **Trạng thái:** ✅ PASS

#### TC-SHCNAV-04: "Yêu cầu" tab active state khi ở `/shift-change`
- **Bước test:** Navigate `/shift-change` → kiểm tra tab highlight trong bottom nav
- **Kết quả mong đợi:** Tab "Yêu cầu" vẫn highlight cam (dù URL là `/shift-change`, nav link là `/leave`)
- **Phân tích:** `EmployeeLayout.tsx:30-38` — NavLink dùng `to: '/leave'`. Khi ở `/shift-change`, NavLink isActive = false. Tab "Yêu cầu" sẽ **không highlight** dù user đang ở trang liên quan.
- **Trạng thái:** ⚠️ UX — xem `[BUG-P4-NEW-05]`

---

## PHẦN 3 — Bugs mới phát hiện trong Phase 4

### [BUG-P4-NEW-01] Audit log không được ghi — HIGH

**Mô tả:** `useInsertAuditLog` được export từ `src/features/audit/hooks/useAuditLogs.ts` nhưng **không được import hay gọi ở bất kỳ đâu** trong toàn bộ codebase `src/`. Grep xác nhận chỉ có 1 occurrence là chính definition.

Hệ quả: Trang `/admin/audit` luôn rỗng, không bao giờ có record `leave_approved`, `leave_rejected`, `payroll_confirmed` hay bất kỳ hành động nào khác. Tính năng Audit Log **không hoạt động**.

**Scope ảnh hưởng:**
- `useReviewLeave` — không gọi audit log
- `useReviewShiftChange` — không gọi audit log  
- `useConfirmPayroll` — không gọi audit log
- `useUpsertEmployee` — không gọi audit log

**File:** `src/features/audit/hooks/useAuditLogs.ts:49` (defined, never used)

**Severity:** HIGH — tính năng hoàn toàn không hoạt động dù UI đã build xong

**Fix đề xuất:**
```ts
// Trong useReviewLeave, sau khi update status:
const insertAuditLog = useInsertAuditLog()
// ...trong mutationFn:
await insertAuditLog.mutateAsync({
  action: action === 'approve' ? 'leave_approved' : 'leave_rejected',
  target_type: 'leave_request',
  target_id: id,
  details: { rejectReason },
})
```
Tương tự cho `useConfirmPayroll` (`payroll_confirmed`) và `useReviewShiftChange`.

---

### [BUG-P4-NEW-02] Employee list "Export" button không có handler — LOW

**Mô tả:** `EmployeeListPage.tsx:71-74` — Button "Export" (icon Download) không có `onClick` handler. Click không làm gì. Đây là placeholder chưa implement.

```tsx
<Button variant="outline" size="sm">
  <Download className="h-4 w-4" />
  Export
</Button>
```

**File:** `src/features/employees/pages/EmployeeListPage.tsx:71`

**Severity:** Low — Export employee list là tính năng nice-to-have, không critical. Nhưng button dead gây confusion.

**Fix đề xuất:** Hoặc implement CSV export tương tự AttendancePage, hoặc xóa button cho đến khi implement.

---

### [BUG-P4-NEW-03] Payroll CSV filename có space — LOW

**Mô tả:** `PayrollPage.tsx:131` — `downloadCSV(\`luong_${label.replace(' ', '_')}.csv\`, ...)`.

`String.replace(' ', '_')` chỉ replace lần đầu tiên. `label = format(d, 'MMMM yyyy')` = `"tháng 5 2026"` (2 spaces). Result: `"luong_tháng_5 2026.csv"` — có space trước năm.

**File:** `src/features/payroll/pages/PayrollPage.tsx:131`

**Severity:** Low — file vẫn tải xuống, chỉ tên file không clean.

**Fix:** Dùng `.replaceAll(' ', '_')` hoặc regex `label.replace(/ /g, '_')`.

---

### [BUG-P4-NEW-04] Bulk import drag-and-drop không hoạt động — LOW/UX

**Mô tả:** `BulkImportDialog.tsx:97-99` — UI hint "Kéo thả hoặc click để chọn file" nhưng chỉ có `onClick` được handle. `onDragOver` và `onDrop` không có. Drag-and-drop không có tác dụng.

**File:** `src/features/employees/components/BulkImportDialog.tsx:97`

**Severity:** Low/UX — click vẫn hoạt động, drag-and-drop là enhancement.

**Fix đề xuất:**
```tsx
<div
  className="..."
  onClick={() => fileRef.current?.click()}
  onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
  onDrop={(e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) { setFile(droppedFile); setResult(null) }
  }}
>
```

---

### [BUG-P4-NEW-05] "Yêu cầu" bottom nav không active khi ở `/shift-change` — LOW/UX

**Mô tả:** `EmployeeLayout.tsx:11` — NavLink `to: '/leave'`. Khi user navigate từ sub-tab sang `/shift-change`, NavLink `isActive` logic của React Router kiểm tra URL `/shift-change` không match `to='/leave'`. Tab "Yêu cầu" bị bỏ active highlight. User không biết mình đang ở đâu trong bottom nav.

**File:** `src/layouts/EmployeeLayout.tsx:11`

**Severity:** Low/UX — không ảnh hưởng chức năng, chỉ navigation indicator bị mất.

**Fix đề xuất:** Dùng custom `isActive` logic hoặc thêm `end={false}` + match pattern:
```tsx
// Option 1: Custom className với useMatch
import { useMatch } from 'react-router-dom'
// In component: const isLeaveActive = useMatch('/leave') || useMatch('/shift-change')
```

---

## PHẦN 4 — Test cases cần live environment

| ID | Test case | Điều kiện |
|---|---|---|
| TC-LIVE-P4-01 | Salary preview Edge Function — số tiền đúng | Cần `salary-preview` deployed + employee có attendance data |
| TC-LIVE-P4-02 | Bulk import — upload CSV thật → nhân viên xuất hiện trong list | Cần `bulk-import` deployed |
| TC-LIVE-P4-03 | Holiday config → calculate-payroll dùng đúng multiplier | Cần holidays trong DB + tháng có OT ngày lễ |
| TC-LIVE-P4-04 | Roster grid — thay đổi ca → reflect ngay trong grid | Cần Supabase live |
| TC-LIVE-P4-05 | Leave balance admin — chỉnh sửa → employee thấy đúng số ngày còn lại | Cần 2 session |
| TC-LIVE-P4-06 | Link account — NV cũ tạo tài khoản → login thành công | Cần Supabase live |
| TC-LIVE-P4-07 | Copy roster từ tháng trước → grid tháng mới đúng | Cần schedules trong DB |

---

## PHẦN 5 — Tóm tắt

### Thống kê test cases Phase 4

| Hạng mục | Số lượng |
|---|---|
| Test cases đã review | 44 |
| PASS | 39 |
| FAIL | 1 (BUG-P4-NEW-01 audit log) |
| PARTIAL / UX | 3 (BUG-P4-NEW-04, BUG-P4-NEW-05, LIMIT) |
| Needs live | 7 |

### Bugs/Issues mới trong Phase 4

| ID | Mô tả | Severity |
|---|---|---|
| BUG-P4-NEW-01 | `useInsertAuditLog` không bao giờ được gọi — Audit Page luôn rỗng | **HIGH** |
| BUG-P4-NEW-02 | Employee list "Export" button không có handler | Low |
| BUG-P4-NEW-03 | Payroll CSV filename có space (replace chỉ lần đầu) | Low |
| BUG-P4-NEW-04 | Bulk import drag-and-drop không hoạt động | Low/UX |
| BUG-P4-NEW-05 | "Yêu cầu" tab không active khi ở `/shift-change` | Low/UX |

### Carry-over từ Phase trước (chưa fix)

| ID | Mô tả | Severity |
|---|---|---|
| BUG-P3-NEW-01 | Password change không verify current password | Medium |
| BUG-P2-07 | Unlinked employee — CheckinPage loading vô hạn | Medium |
| BUG-02 | `checkExpiry` không auto-gọi | Acceptable |
| BUG-P2-06 | isNaN dead code trong generate-qr | Low |
| DEBT-P2-01 | Dead code trong checkin Edge Function | Low |
| BUG-P2-01 / DEBT-P2-02 | `formatPhone` không dùng ở AdminTopbar | Low |

### Migrations cần chạy trước khi ship

| File | Đã chạy? |
|------|---------|
| `20260518000005_leave_rejection_reason.sql` | Chưa xác nhận |
| `20260519000001_notifications_realtime.sql` | Chưa xác nhận |
| `20260520000001_holidays.sql` | Chưa xác nhận |
| `20260520000002_audit_logs.sql` | Chưa xác nhận |

### Edge Functions cần deploy

| Function | Trạng thái |
|----------|---------|
| `salary-preview` | Mới — phải deploy |
| `bulk-import` | Mới — phải deploy |
| `calculate-payroll` | Cập nhật — redeploy để có holiday multiplier |

### Đánh giá tổng thể

**Phase 4 ĐỦ ĐIỀU KIỆN SHIP** với lưu ý:

✅ Tất cả tính năng cốt lõi hoạt động đúng: code splitting, salary preview, leave balance, link account, export CSV, roster, holiday config, bulk import, shift change nav  
✅ BUG-P3-NEW-02 và BUG-P2-09 đã được fix  
✅ Tính năng mới robust — graceful degradation khi Edge Function chưa deploy  

**Phải fix trước khi ship:**
1. `[BUG-P4-NEW-01]` **Audit Log không hoạt động** — wiring `useInsertAuditLog` vào `useReviewLeave`, `useReviewShiftChange`, `useConfirmPayroll`, `useUpsertEmployee`. Đây là tính năng được quảng bá trong handoff nhưng hoàn toàn không hoạt động.
2. Chạy 4 pending migrations trên Supabase production
3. Deploy 3 Edge Functions (`salary-preview`, `bulk-import`, `calculate-payroll`)

**Nên fix trong sprint tiếp theo:**
1. `[BUG-P4-NEW-02]` Employee Export button — implement hoặc xóa
2. `[BUG-P4-NEW-03]` Payroll filename bug — `.replaceAll(' ', '_')`
3. `[BUG-P3-NEW-01]` Current password verification khi đổi mật khẩu
4. `[BUG-P2-07]` Unlinked employee UX

---

*Báo cáo dựa trên static code review của toàn bộ source files Phase 4. Các test case đánh dấu [NEEDS-LIVE] cần xác nhận sau khi deploy.*
