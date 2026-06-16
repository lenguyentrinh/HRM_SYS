# VALIDATIONS.md – Business Rules & Validation Logic

## Nguyên tắc validate

**Validate 2 lớp** — client (UX nhanh) và server (security):
- **Client-only:** Rules mà nếu bypass cũng không gây hại (VD: format input)
- **Server-only:** Rules phức tạp cần query DB (VD: check phone unique)
- **Cả hai:** Rules quan trọng không được bỏ qua (VD: ngày hợp lệ, số tiền > 0)

**Không bao giờ chỉ validate ở client** với dữ liệu nhạy cảm (lương, chấm công, phê duyệt). Client code có thể bị bypass.

**Khi validate fail:**
- Client: hiển thị inline error dưới field, không submit form
- Edge Function: trả về HTTP 400 với `{ error: "error_code", message: "..." }`
- DB constraint: Supabase trả về lỗi PostgreSQL — catch ở client và map ra message tiếng Việt

Tài liệu này định nghĩa tất cả quy tắc nghiệp vụ cần validate. Mỗi rule ghi rõ: nơi validate (client / Edge Function), thông báo lỗi trả về.

---

## Chấm công (Attendance)

### ATT-01: QR Token hợp lệ
- **Rule:** Token phải tồn tại, `is_active = true`, và `expires_at > now()`
- **Validate:** Edge Function `checkin`
- **Error:** `"Mã QR đã hết hạn hoặc không hợp lệ"`

### ATT-02: Nhân viên đúng ca
- **Rule:** Nhân viên chỉ được check-in QR của ca mà họ được gán trong ngày đó (kiểm tra `shift_schedules` → fallback `employee_shift_assignments`)
- **Validate:** Edge Function `checkin`
- **Error:** `"Bạn không thuộc ca làm việc này"`

### ATT-03: Không check-in 2 lần cùng ca
- **Rule:** `attendance_records` đã có `check_in_at IS NOT NULL` cho cặp `(employee_id, date, shift_id)` thì không cho check-in lại
- **Validate:** Edge Function `checkin`
- **Error:** `"Bạn đã check-in ca này rồi"`

### ATT-04: Check-out phải sau check-in
- **Rule:** `check_out_at > check_in_at`
- **Validate:** Edge Function `checkin`
- **Error:** `"Thời gian check-out không hợp lệ"`

### ATT-05: Tính đi trễ
- **Rule:** `check_in_at > (shift.start_time + grace_period_minutes)` → `status = 'late'`, tính `late_minutes`
- **Validate:** Edge Function `checkin` (tự động, không báo lỗi)

### ATT-06: Tính về sớm
- **Rule:** `check_out_at < (shift.end_time - early_leave_minutes)` → ghi nhận `early_leave_minutes`
- **Validate:** Edge Function `checkin` (tự động)

### ATT-07: Tính OT
- **Rule:** `check_out_at > shift.end_time` → tính `overtime_minutes = check_out_at - shift.end_time`
- **Validate:** Edge Function `checkin` (tự động)

---

## Nghỉ phép (Leave)

### LEA-01: Thời gian hợp lệ
- **Rule:** `end_date >= start_date`
- **Validate:** Client + server
- **Error:** `"Ngày kết thúc phải sau ngày bắt đầu"`

### LEA-02: Không xin nghỉ ngày quá khứ
- **Rule:** `start_date >= today`
- **Validate:** Client + server
- **Error:** `"Không thể xin nghỉ cho ngày đã qua"`

### LEA-03: Báo trước đủ số ngày
- **Rule:** `start_date >= today + leave_policies.min_advance_notice_days` (tính ngày làm việc, không tính cuối tuần)
- **Validate:** Server (trước khi insert)
- **Error:** `"Phải xin nghỉ trước ít nhất {N} ngày làm việc"`
- **Default:** min_advance_notice_days = 1

### LEA-04: Không trùng đơn đang pending/approved
- **Rule:** Không được có `leave_requests` khác của cùng nhân viên với `status IN ('pending', 'approved')` mà `date range` trùng nhau
- **Validate:** Server
- **Error:** `"Bạn đã có đơn nghỉ phép trong khoảng thời gian này"`

### LEA-05: Kiểm tra số ngày phép còn lại
- **Rule:** Nếu `leave_type = 'paid'`, kiểm tra `leave_balances.total_paid_days - used_paid_days >= total_days`
- **Validate:** Client (warning) + server (confirm)
- **Warning:** `"Bạn chỉ còn {N} ngày phép có lương. Số ngày vượt quá sẽ chuyển thành nghỉ không lương."`

### LEA-06: Đơn phép đã duyệt → sync attendance
- **Rule:** Khi `status` chuyển từ `pending` → `approved`, tự động tạo/update `attendance_records` cho tất cả ngày trong range với `status = 'leave'` và `leave_request_id`
- **Validate:** Database trigger hoặc Edge Function

### LEA-07: Hủy đơn đã duyệt
- **Rule:** Chỉ admin mới được reject đơn đã approved. Khi reject, phải hoàn lại `leave_balances.used_paid_days`
- **Validate:** Server

---

## Đổi ca (Shift Change)

### SHI-01: Không đổi ca trong quá khứ
- **Rule:** `target_date >= today`
- **Validate:** Client + server
- **Error:** `"Không thể đổi ca cho ngày đã qua"`

### SHI-02: Phải đổi sang ca khác với ca hiện tại
- **Rule:** `requested_shift_id != current_shift_id` của ngày đó
- **Validate:** Client
- **Error:** `"Đây đã là ca làm việc của bạn"`

### SHI-03: Không có request trùng đang pending
- **Rule:** Không tồn tại `shift_change_requests` khác `status = 'pending'` cùng `employee_id` và `target_date`
- **Validate:** Server
- **Error:** `"Bạn đã có yêu cầu đổi ca đang chờ duyệt cho ngày này"`

### SHI-04: Cập nhật sau khi duyệt
- **Rule:** Khi approved → upsert `shift_schedules` với `shift_id` mới. Nếu đã có QR token của ngày đó → deactivate token cũ, sinh token mới cho ca mới
- **Validate:** Server (trong flow approve)

---

## Tính lương (Payroll)

### PAY-01: Chỉ tính lương khi có đủ dữ liệu chấm công
- **Rule:** Cảnh báo nếu tháng có ngày làm việc mà `attendance_records` chưa có record (NV có thể đã vắng chưa được ghi nhận)
- **Validate:** Edge Function `calculate-payroll` (warning, không block)

### PAY-02: Không overwrite bảng lương đã confirmed
- **Rule:** Nếu `payroll_records.status = 'confirmed'` → không cho tính lại tự động. Admin phải unlock trước
- **Validate:** Edge Function
- **Error:** `"Bảng lương tháng này đã được xác nhận. Liên hệ Super Admin để mở khóa."`

### PAY-03: Lương thực nhận không âm
- **Rule:** `net_salary = gross - bhxh - tax >= 0`. Nếu âm → báo lỗi
- **Validate:** Edge Function
- **Error:** `"Lương thực nhận âm do các khoản khấu trừ quá lớn. Vui lòng kiểm tra lại."`

### PAY-04: Hệ số OT hợp lệ
- **Rule:** `ot_multiplier_weekday >= 1.0`, `ot_multiplier_weekend >= ot_multiplier_weekday`, `ot_multiplier_holiday >= ot_multiplier_weekend`
- **Validate:** Client khi Admin cập nhật config
- **Error:** `"Hệ số OT không hợp lệ (phải tăng dần: thường < cuối tuần < lễ)"`

---

## Nhân viên (Employee)

### EMP-01: Số điện thoại unique
- **Rule:** `phone` phải unique toàn hệ thống (dùng để đăng nhập)
- **Validate:** DB constraint + client check trước khi submit
- **Error:** `"Số điện thoại này đã được đăng ký"`

### EMP-02: Lương cơ bản > 0
- **Rule:** `base_salary > 0`
- **Validate:** Client
- **Error:** `"Lương cơ bản phải lớn hơn 0"`

### EMP-03: Ngày vào làm không là tương lai xa
- **Rule:** `join_date <= today + 30 days` (cho phép onboard trước 1 tháng)
- **Validate:** Client (soft warning)

### EMP-04: Bulk import – row validation
- **Rule:** Mỗi row phải có `full_name`, `phone` (valid format), `type`, `base_salary > 0`
- **Validate:** Client trước khi gọi Edge Function
- **Error:** Hiển thị danh sách row lỗi kèm lý do, cho phép sửa trước khi import

---

## Ca làm việc (Shifts)

### SHF-01: Giờ kết thúc sau giờ bắt đầu (ca thường)
- **Rule:** Nếu `is_overnight = false` thì `end_time > start_time`
- **Validate:** Client
- **Error:** `"Giờ kết thúc phải sau giờ bắt đầu"`

### SHF-02: Grace period hợp lý
- **Rule:** `grace_period_minutes >= 0` và `< (end_time - start_time) / 2`
- **Validate:** Client
- **Error:** `"Grace period không được vượt quá nửa thời gian ca"`

### SHF-03: Không xóa ca đang được gán
- **Rule:** Không cho xóa `shifts` nếu có `employee_shift_assignments` hoặc `shift_schedules` tương lai
- **Validate:** Server
- **Error:** `"Ca này đang được gán cho nhân viên. Hãy hủy gán trước khi xóa."`

---

## Notification Triggers

| Sự kiện | Người nhận | Loại |
|---|---|---|
| NV nộp đơn nghỉ | Admin + Manager của branch | `leave_request_new` |
| Admin duyệt đơn nghỉ | NV nộp đơn | `leave_approved` |
| Admin từ chối đơn nghỉ | NV nộp đơn | `leave_rejected` |
| NV gửi yêu cầu đổi ca | Admin + Manager | `shift_change_new` |
| Admin duyệt đổi ca | NV gửi yêu cầu | `shift_change_approved` |
| Admin từ chối đổi ca | NV gửi yêu cầu | `shift_change_rejected` |
| Admin xác nhận bảng lương | Tất cả NV trong branch | `payroll_confirmed` |
| Admin chấm công thủ công | NV được chấm | `attendance_manual` |
