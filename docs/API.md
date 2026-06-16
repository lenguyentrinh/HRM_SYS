# API.md – Data Access & Edge Functions

## Tổng quan

Vì dùng Supabase SDK trực tiếp từ client, không có REST API server riêng. Toàn bộ data access gồm 2 loại:

| Loại | Dùng khi nào |
|---|---|
| **Supabase SDK trực tiếp** | CRUD thông thường, query có RLS bảo vệ tự nhiên |
| **Edge Functions** | Logic server-side phức tạp: cần bypass RLS, cần atomic multi-table operations, hoặc cần tính toán không an toàn trên client |

**Nguyên tắc chọn loại:**
- Nếu chỉ đọc/ghi 1–2 bảng với user's own data → dùng SDK trực tiếp
- Nếu cần: tính toán phức tạp, ghi nhiều bảng atomically, tạo auth.users, hoặc logic nhạy cảm → dùng Edge Function

---

## Edge Functions

### `POST /functions/v1/checkin`

**Mục đích:** Validate QR token và ghi nhận chấm công. Chạy server-side vì cần kiểm tra nhiều bảng atomically và không muốn client tự tính toán status (dễ giả mạo).

**Ai gọi:** Employee Portal, trang `/checkin`, sau khi scan QR thành công.

**Request:**
```json
{
  "token": "uuid-string",
  "employee_id": "uuid",
  "type": "check_in"
}
```

**Logic thực hiện:**
1. Tìm `qr_tokens` theo token → kiểm tra `is_active = true` và `expires_at > now()`
2. Kiểm tra NV được gán ca này: ưu tiên `shift_schedules` theo ngày, fallback về `employee_shift_assignments`
3. Kiểm tra chưa check-in ca này rồi (`attendance_records` UNIQUE constraint)
4. Lấy `shifts.start_time`, `grace_period_minutes` → tính `late_minutes`
5. Nếu là check-out: tính `overtime_minutes = check_out_at - shift.end_time`
6. Insert/Update `attendance_records`
7. Insert `notifications` xác nhận cho NV

**Response thành công:**
```json
{
  "success": true,
  "status": "present",
  "late_minutes": 0,
  "message": "Check-in thành công lúc 07:02 – Đúng giờ ✓"
}
```

**Response lỗi:**
```json
{
  "success": false,
  "error": "invalid_token" | "wrong_shift" | "already_checked_in" | "expired_token",
  "message": "Mô tả lỗi bằng tiếng Việt"
}
```

---

### `POST /functions/v1/generate-qr`

**Mục đích:** Sinh QR token cho các ca trong ngày. Chạy server-side vì cần `service_role` để insert `qr_tokens` (bảng này có RLS restrict employee không được insert).

**Ai gọi:**
- **pg_cron** tự động lúc 06:30 mỗi ngày với `{"run_all": true}`
- **Admin** thủ công khi cần gen lại (VD: sau khi duyệt đổi ca) với `{"shift_id": "uuid", "date": "YYYY-MM-DD"}`

**Request (pg_cron):**
```json
{ "run_all": true, "date": "2026-05-18" }
```

**Request (manual):**
```json
{ "shift_id": "uuid", "date": "2026-05-18" }
```

**Logic:**
1. Nếu `run_all`: lấy tất cả `shifts` của tất cả branch ngày hôm đó
2. Với mỗi ca: `token = crypto.randomUUID()`, `expires_at = date + shift.end_time`
3. Upsert vào `qr_tokens` (on conflict shift_id + date → update token, reset is_active = true)

---

### `POST /functions/v1/calculate-payroll`

**Mục đích:** Tính lương tháng cho một hoặc tất cả nhân viên. Chạy server-side vì logic phức tạp và nhạy cảm — không để client tự tính rồi gửi lên.

**Ai gọi:** Admin Portal, trang `/admin/payroll`, khi nhấn "Tính lương tháng".

**Request:**
```json
{
  "month": 5,
  "year": 2026,
  "employee_id": "uuid"   // optional — nếu không có thì tính tất cả NV trong branch
}
```

**Logic:**
1. Lấy tất cả `attendance_records` của NV trong tháng
2. Đếm: `working_days_actual`, `total_overtime_minutes`, `total_late_minutes`, `total_absent_days`
3. Lấy `payroll_configs` có `effective_from <= ngày cuối tháng` (config gần nhất)
4. Tính:
   - `salary_earned = base_salary × (working_days_actual / working_days_standard)`
   - `overtime_pay` theo từng loại ngày (thường / cuối tuần / lễ) × hệ số OT
   - `late_penalty = total_late_minutes × late_penalty_per_minute`
   - `attendance_bonus` nếu đủ điều kiện trong `attendance_bonus_condition`
   - `gross = salary_earned + allowance + overtime_pay + bonus - late_penalty - absent_penalty`
   - `bhxh_employee = gross × bhxh_employee_rate`
   - `net = gross - bhxh_employee` (tax = 0, admin nhập sau)
5. Upsert `payroll_records` với `status = 'draft'`

**Response:**
```json
{
  "success": true,
  "calculated": 48,
  "errors": []
}
```

---

### `POST /functions/v1/bulk-import`

**Mục đích:** Tạo tài khoản hàng loạt cho nhân viên. Chạy server-side vì cần `service_role` để tạo `auth.users` (Supabase Admin API).

**Ai gọi:** Admin Portal, trang `/admin/employees`, sau khi review file Excel.

**Request:**
```json
{
  "branch_id": "uuid",
  "employees": [
    {
      "full_name": "Nguyễn Thị Thu",
      "phone": "0901234567",
      "type": "fulltime",
      "base_salary": 6000000,
      "allowance": 500000,
      "shift_id": "uuid",
      "department": "Bán hàng",
      "position": "Nhân viên",
      "join_date": "2026-01-01"
    }
  ]
}
```

**Logic:**
1. Validate từng row (phone format, required fields, phone unique check)
2. Với mỗi row hợp lệ: tạo `auth.users` (password mặc định = SĐT) → tạo `users` → tạo `employees`
3. Gán ca mặc định vào `employee_shift_assignments` tháng hiện tại
4. Khởi tạo `leave_balances` theo `leave_policies` của loại NV
5. Return kết quả: list thành công + list lỗi từng row

**Response:**
```json
{
  "success_count": 45,
  "error_count": 3,
  "errors": [
    { "row": 5, "phone": "0901234567", "reason": "Số điện thoại đã tồn tại" }
  ]
}
```

---

### `GET /functions/v1/salary-preview`

**Mục đích:** Tính lương dự kiến đến hôm nay cho Employee Portal. Không lưu DB — tính realtime mỗi khi nhân viên vào trang dashboard.

**Ai gọi:** Employee Portal, trang `/` (dashboard), khi component mount.

**Request:** Query param `?employee_id=uuid` (lấy từ auth session, không cho client truyền tùy ý).

**Logic:** Tương tự `calculate-payroll` nhưng:
- Chỉ tính `attendance_records` từ đầu tháng đến `now()`
- Không upsert vào DB
- Ước tính thêm ngày công còn lại trong tháng dựa trên ca được gán

---

## Supabase Data Access Patterns

### Auth (Custom – không dùng Supabase Auth)

```ts
// Đăng nhập: hash password SHA-256, query bảng users
import { loginWithPhone } from '@/lib/auth'
const user = await loginWithPhone(phone, password)
// → { id, role, branch_id, phone }
// Lưu vào Zustand store (persist localStorage)
useAuthStore.getState().setUser(user)

// Đăng xuất
useAuthStore.getState().logout()
// xóa localStorage key 'hrm-auth'

// Tạo user mới (Admin tạo NV)
import { createUserWithPhone } from '@/lib/auth'
const userId = await createUserWithPhone(phone, password, 'employee', branchId)
```

> **Lưu ý:** Không dùng `supabase.auth.*` — toàn bộ auth đi qua `src/lib/auth.ts`.
> Session được persist vào `localStorage` key `hrm-auth` qua Zustand persist middleware.

---

### Employees

```ts
// Danh sách NV với phân trang + search (Admin)
const { data, count } = await supabase
  .from('employees')
  .select('*, users(phone)', { count: 'exact' })
  .eq('branch_id', branchId)
  .ilike('full_name', `%${keyword}%`)    // search
  .eq('status', 'active')               // filter
  .order('full_name')
  .range(page * 10, page * 10 + 9)      // pagination

// Xem chi tiết 1 NV
const { data } = await supabase
  .from('employees')
  .select(`
    *,
    users(phone, role),
    employee_shift_assignments(shift_id, month, year, shifts(name))
  `)
  .eq('id', employeeId)
  .single()

// Cập nhật thông tin NV
await supabase.from('employees')
  .update({ base_salary, allowance, department, position })
  .eq('id', employeeId)
```

---

### Attendance

```ts
// Bảng chấm công hôm nay (Admin) — kết hợp với employees filter theo branch
const { data } = await supabase
  .from('attendance_records')
  .select(`
    *,
    employees!inner(full_name, employee_code, branch_id),
    shifts(name, start_time, end_time)
  `)
  .eq('date', toISODate(new Date()))
  .eq('employees.branch_id', branchId)
  .order('check_in_at', { nullsFirst: false })

// Lịch sử chấm công cá nhân (Employee)
const { data } = await supabase
  .from('attendance_records')
  .select('*, shifts(name, start_time, end_time)')
  .eq('employee_id', employeeId)
  .gte('date', startOfMonth)
  .lte('date', endOfMonth)
  .order('date', { ascending: false })

// Chấm công thủ công (Admin) — upsert để handle cả thêm mới và cập nhật
await supabase.from('attendance_records').upsert({
  employee_id, shift_id, date,
  check_in_at: new Date().toISOString(),
  check_in_source: 'manual',
  status: 'present',
  created_by: adminUserId,
  notes: 'Chấm công thủ công bởi admin'
}, { onConflict: 'employee_id,date,shift_id' })
```

---

### Leave Requests

```ts
// Danh sách đơn chờ duyệt (Admin)
const { data } = await supabase
  .from('leave_requests')
  .select(`
    *,
    employees!inner(full_name, employee_code, branch_id),
    leave_balances!inner(total_paid_days, used_paid_days)
  `)
  .eq('status', 'pending')
  .eq('employees.branch_id', branchId)
  .order('created_at')

// Nộp đơn nghỉ (Employee) — sau đó Edge Function hoặc DB trigger gửi notification
const { data, error } = await supabase.from('leave_requests').insert({
  employee_id, leave_type, start_date, end_date, total_days, reason
})

// Duyệt đơn (Admin) — validation trước ở VALIDATIONS.md LEA-*
await supabase.from('leave_requests').update({
  status: 'approved',
  reviewed_by: adminId,
  reviewed_at: new Date().toISOString()
}).eq('id', requestId)
// Sau đó: sync attendance + update leave_balances + send notification
// (xem VALIDATIONS.md LEA-06)
```

---

### Payroll

```ts
// Bảng lương tháng (Admin)
const { data } = await supabase
  .from('payroll_records')
  .select('*, employees(full_name, employee_code, type)')
  .eq('month', month)
  .eq('year', year)
  .eq('employees.branch_id', branchId)  // filter theo branch qua join
  .order('net_salary', { ascending: false })

// Xác nhận phát lương — chỉ super_admin
await supabase.from('payroll_records').update({
  status: 'confirmed',
  confirmed_by: adminId,
  confirmed_at: new Date().toISOString()
}).eq('month', month).eq('year', year)
// KHÔNG dùng .eq('employees.branch_id') vì update không support join filter
// Thay vào đó, lấy danh sách employee_ids trong branch trước, rồi .in('employee_id', ids)
```

---

### Notifications (Realtime)

```ts
// Khởi tạo realtime subscription — đặt trong useNotifications hook
useEffect(() => {
  const channel = supabase
    .channel(`user-notifications-${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      // Invalidate query để refetch list
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      // Hiển thị toast
      toast(payload.new.title)
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [userId])

// Danh sách notifications (có phân trang)
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(20)

// Đánh dấu tất cả đã đọc
await supabase.from('notifications')
  .update({ is_read: true })
  .eq('user_id', userId)
  .eq('is_read', false)
```

---

## pg_cron Jobs

```sql
-- Chạy lúc 06:30 mỗi ngày — 30 phút trước ca sớm nhất (07:00)
-- Thay <project-ref> và <service_role_key> bằng giá trị thật khi setup
SELECT cron.schedule(
  'generate-qr-tokens-daily',
  '30 6 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/generate-qr',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <service_role_key>',
      'Content-Type', 'application/json'
    ),
    body    := jsonb_build_object('run_all', true)
  );
  $$
);

-- Xem danh sách jobs đang chạy
SELECT * FROM cron.job;

-- Xoá job nếu cần
SELECT cron.unschedule('generate-qr-tokens-daily');
```
