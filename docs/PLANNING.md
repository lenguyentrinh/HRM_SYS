# PLANNING.md – Đặc tả & Kế hoạch triển khai HRM System

## Bối cảnh dự án

**HRM System** là web app quản lý nhân sự nội bộ cho doanh nghiệp khoảng 50 nhân viên.
App bao gồm 2 portal riêng biệt: **Admin Portal** và **Employee Portal**.

| | |
|---|---|
| **Loại app** | Web nội bộ công ty (không cần SEO/SSR) |
| **Quy mô** | ~50 nhân viên, 1 chi nhánh ban đầu (multi-branch sau) |
| **Stack** | React 18 + Vite + TypeScript + Supabase |
| **Deploy** | Nginx self-host hoặc Cloudflare Pages |
| **Timeline** | ~5–6 tuần (AI-assisted development) |

---

## Phân hệ & Người dùng

### Vai trò (Roles)

| Role | Mô tả |
|---|---|
| `super_admin` | Toàn quyền hệ thống: cấu hình, nhân sự, lương, báo cáo |
| `manager` | Quản lý vận hành: xem/sửa nhân viên, duyệt phép, xem lương. Không cấu hình hệ thống |
| `employee` | Nhân viên: chấm công QR, xem lương cá nhân, nộp đơn nghỉ/đổi ca |

### Đăng nhập
- Tất cả roles đăng nhập bằng **số điện thoại + mật khẩu**
- Sau khi đăng nhập, redirect tự động theo role: admin/manager → Admin Portal, employee → Employee Portal
- Session quản lý bởi **custom auth**: `users` table + SHA-256 password hash, không dùng Supabase Auth
- Session persist vào `localStorage` qua Zustand, route guard đọc synchronous khi app load

---

## Loại nhân viên (Employee Types)

| Type | Đặc điểm |
|---|---|
| `fulltime` | Lương tháng cố định tính theo ngày công. Phép năm được cộng dồn sang năm sau |
| `parttime` | Lương tính theo ca/giờ. Phép theo tháng, không cộng dồn |

---

## I. Admin Portal

### 1. Dashboard (Trang tổng quan)

**Mục đích:** Cái nhìn tổng thể về tình trạng nhân sự và hoạt động ngày hôm nay.

**Nội dung hiển thị:**
- **4 stat cards:** Tổng nhân viên, Có mặt hôm nay, Đi trễ hôm nay, Vắng/Nghỉ phép hôm nay
- **Biểu đồ chuyên cần 7 ngày gần nhất:** Bar chart thể hiện số nhân viên có mặt mỗi ngày
- **Danh sách cần xử lý:** Số đơn nghỉ phép đang chờ duyệt, yêu cầu đổi ca đang chờ, nhân viên chưa check-out
- **Bảng chấm công gần đây:** 5–10 bản ghi mới nhất trong ngày (tên, giờ check-in, ca, trạng thái)

**Tương tác:**
- Click vào "Xem tất cả" ở mỗi khu vực → navigate đến module tương ứng
- Dữ liệu refresh theo thời gian thực (Supabase Realtime)

---

### 2. Quản lý nhân viên (Employee Management)

#### 2a. Danh sách nhân viên
**Mục đích:** Xem, tìm kiếm, lọc toàn bộ nhân sự trong hệ thống.

**Thông tin hiển thị trong bảng:** Avatar (chữ cái đầu), Mã NV, Họ tên, SĐT, Ca mặc định, Loại NV (fulltime/parttime), Trạng thái (active/inactive/probation).

**Tính năng:**
- Tìm kiếm theo tên hoặc SĐT (real-time search)
- Lọc theo: phòng ban, loại nhân viên, trạng thái
- Phân trang (10 người/trang)
- **Thêm đơn lẻ:** Form popup thêm nhân viên mới (họ tên, SĐT, loại NV, lương cơ bản, ca mặc định, ngày vào làm)
- **Bulk Import từ Excel:** Upload file `.xlsx`, hệ thống parse, validate từng dòng, hiển thị preview với các lỗi, xác nhận import
- **Export Excel:** Xuất danh sách hiện tại (sau khi lọc) ra file Excel

#### 2b. Chi tiết nhân viên
**Mục đích:** Xem và chỉnh sửa toàn bộ thông tin của một nhân viên.

**Bố cục:** Phần header hiển thị avatar, tên, mã NV, ca và trạng thái. Phía dưới là các tab:

- **Tab "Thông tin":** Thông tin cá nhân (tên, SĐT, email, loại NV, phòng ban, chức vụ, ngày vào làm) + Cấu hình lương (lương cơ bản, phụ cấp cố định/tháng, hệ số OT áp dụng) + Cài đặt phép (số ngày phép/năm, cộng dồn hay không)
- **Tab "Chấm công":** Lịch sử chấm công của nhân viên này, lọc theo tháng, hiển thị dạng bảng
- **Tab "Nghỉ phép":** Danh sách đơn xin nghỉ đã tạo, số ngày phép còn lại theo năm
- **Tab "Lương":** Bảng lương các tháng đã confirmed
- **Tab "Thưởng/Phạt":** Lịch sử các khoản thưởng/phạt đặc biệt (ngoài tính toán tự động)

Admin có thể chỉnh sửa tất cả thông tin trên tab "Thông tin".

---

### 3. Cấu hình Ca làm việc (Shifts)

**Mục đích:** Định nghĩa các ca làm việc của công ty.

**Thông tin mỗi ca:**
- Tên ca (VD: "Ca 1 – Sáng")
- Giờ bắt đầu / Giờ kết thúc
- **Grace period (phút):** Số phút cho phép đi trễ mà không bị tính phạt. VD: Ca bắt đầu 07:00, grace period 30 phút → đến trước 07:30 vẫn là "đúng giờ"
- **Early leave threshold (phút):** Check-out sớm hơn bao nhiêu phút mới bị tính là về sớm
- Ca có qua đêm không (is_overnight)

**Gán ca cho nhân viên:**
- Mỗi nhân viên được gán một ca mặc định theo tháng
- Gán trong trang Chi tiết nhân viên hoặc qua Roster scheduling

---

### 4. Roster Scheduling (Xếp lịch ca)

**Mục đích:** Admin xem và điều chỉnh lịch làm việc của từng nhân viên theo ngày/tuần, khác với ca mặc định tháng.

**Giao diện:** Calendar grid theo tuần. Mỗi ô = 1 nhân viên × 1 ngày, hiển thị ca được gán. Admin click vào ô để thay đổi ca hoặc đánh dấu nghỉ.

**Luồng:** Override lịch được lưu vào `shift_schedules`. Khi hệ thống cần biết ca của một NV vào một ngày cụ thể, ưu tiên `shift_schedules` trước, fallback về `employee_shift_assignments` (ca tháng mặc định).

---

### 5. Quản lý Chấm công (Attendance Management)

**Mục đích:** Theo dõi toàn bộ dữ liệu chấm công, phát hiện bất thường, chỉnh sửa khi cần.

**Bảng chấm công hàng ngày:**
- Mặc định hiển thị ngày hôm nay
- Mỗi dòng: Avatar + Tên NV, Ca, Giờ check-in, Giờ check-out, Tổng giờ làm, Trạng thái (Đúng giờ / Đi trễ Xph / Về sớm / Vắng mặt / Nghỉ phép / Ngày lễ), Ghi chú

**Trạng thái tự động tính:**
- **Đúng giờ:** Check-in trong vòng grace period
- **Đi trễ:** Check-in sau grace period → hiển thị số phút trễ, tự động tính khoản phạt theo config
- **Về sớm:** Check-out trước ngưỡng early leave
- **OT:** Check-out sau giờ kết ca → tự động tính giờ OT
- **Vắng mặt:** Không có bản ghi check-in khi đã qua ca
- **Nghỉ phép:** Được sync từ đơn nghỉ đã duyệt
- **Ngày lễ:** Admin đánh dấu, hệ số OT áp dụng khác

**Bộ lọc:** Ngày/Tháng, Ca, Trạng thái, Tên nhân viên.

**Chấm công thủ công (Admin/Manager):**
- Admin có thể thêm/sửa bản ghi chấm công cho bất kỳ nhân viên nào
- Lý do bắt buộc nhập khi chấm thủ công
- Hành động này được ghi vào `audit_logs`

**Export:** Xuất Excel toàn bộ dữ liệu sau khi lọc.

---

### 6. Quản lý Nghỉ phép (Leave Management)

**Mục đích:** Tiếp nhận và xử lý đơn xin nghỉ phép từ nhân viên.

**Luồng:**
1. Nhân viên nộp đơn qua Employee Portal
2. Admin/Manager nhận thông báo realtime (bell notification)
3. Admin xem danh sách đơn, click để xem chi tiết (ngày, lý do, số ngày phép còn lại của NV đó)
4. Nhấn **Duyệt** hoặc **Từ chối** (kèm lý do)
5. Hệ thống tự động:
   - Nếu duyệt: tạo/update `attendance_records` cho các ngày nghỉ với status = 'leave', trừ `leave_balances`
   - Gửi thông báo realtime cho nhân viên

**Hiển thị:** Mặc định lọc đơn "Chờ duyệt" (highlight). Có thể xem tất cả đơn theo tháng với filter trạng thái.

**Export:** Xuất danh sách đơn nghỉ ra Excel.

---

### 7. Phê duyệt Đổi ca (Shift Change Requests)

**Mục đích:** Xử lý yêu cầu đổi ca từ nhân viên.

**Thông tin đơn:** Nhân viên, Ngày/Tuần muốn đổi, Ca hiện tại, Ca muốn đổi sang, Lý do.

**Khi duyệt:** Hệ thống cập nhật `shift_schedules` cho ngày/tuần đó. Nếu có QR token cũ → deactivate, sinh token mới cho ca mới.

---

### 8. Cài đặt hệ thống (Settings)

**Truy cập:** Chỉ Super Admin.

**Tab "Ca làm việc":** CRUD các ca làm việc (mô tả ở mục 3).

**Tab "Thưởng/Phạt":**
- Mức phạt đi trễ: bao nhiêu tiền/phút trễ (có thể = 0)
- Mức phạt nghỉ không phép: bao nhiêu tiền/ngày
- Điều kiện thưởng chuyên cần: VD "đi làm đủ 100% số ca, không đi trễ lần nào trong tháng → thưởng X đồng"

**Tab "Phụ cấp":**
- Phụ cấp là khoản tiền cố định cộng thêm mỗi tháng cho nhân viên
- Có thể cấu hình mức phụ cấp mặc định, nhưng từng nhân viên có thể được set riêng trong hồ sơ

**Tab "Nghỉ phép":**
- Cấu hình số ngày phép có lương theo loại nhân viên (fulltime / parttime)
- Fulltime: có cộng dồn, cấu hình số ngày tối đa được cộng dồn
- Parttime: không cộng dồn, số ngày phép cố định theo tháng
- Số ngày làm việc phải báo trước (advance notice days)

**Tab "Ngày lễ":**
- Danh sách ngày lễ tết trong năm (có thể import lịch Việt Nam)
- Những ngày này: hệ số OT = 3.0, `attendance_records.is_holiday = true`

**Tab "Hệ số OT":**
- Hệ số OT ngày thường (mặc định 1.5)
- Hệ số OT cuối tuần (mặc định 2.0)
- Hệ số OT ngày lễ (mặc định 3.0)
- Tỷ lệ BHXH nhân viên đóng (mặc định 8%)

---

### 9. Bảng lương & Tính lương (Payroll)

**Mục đích:** Tổng hợp và xác nhận lương tháng cho toàn bộ nhân viên.

**Quy trình tính lương:**
1. Admin chọn tháng/năm, nhấn "Tính lương tháng"
2. Hệ thống gọi Edge Function `calculate-payroll` cho từng nhân viên
3. Công thức:
   - `salary_earned = base_salary × (working_days_actual / working_days_standard)`
   - `overtime_pay = (base_salary / working_days_standard / shift_hours) × overtime_hours × ot_multiplier`
   - `gross = salary_earned + allowance + overtime_pay + attendance_bonus - late_penalty - absent_penalty`
   - `net = gross - bhxh_employee - tax` (tax do admin nhập thủ công)
4. Kết quả lưu vào `payroll_records` với status = `draft`

**Giao diện bảng lương:**
- Mỗi dòng: Tên NV, Ngày công (thực tế/chuẩn), Lương CB, OT, Phụ cấp, Thưởng, Phạt, Gross, BHXH, Thuế, Thực nhận
- Admin có thể click vào từng dòng để xem chi tiết và điều chỉnh thủ công từng khoản
- Dòng tổng kết ở cuối: Tổng quỹ lương

**Xác nhận phát lương:** Admin nhấn "Xác nhận & Phát lương" → status chuyển thành `confirmed`, không thể tính lại tự động nữa (phải unlock thủ công).

**Export:** Xuất bảng lương Excel với đầy đủ breakdown.

---

### 10. Dashboard Analytics & Báo cáo

**Thống kê hiệu suất nhân viên:**
- Bảng xếp hạng: số ngày công, số lần đi trễ, tỷ lệ chuyên cần (%)
- Phân loại: Xuất sắc / Tốt / Cần cải thiện
- Lọc theo tháng, phòng ban

**Thống kê quỹ lương:**
- Tổng lương đã chi theo tháng (biểu đồ line chart)
- Breakdown theo loại khoản (lương cơ bản, OT, phụ cấp, thưởng)
- Dự kiến chi phí lương tháng hiện tại dựa trên dữ liệu thực tế đến hôm nay

**Export:** Xuất Excel các biểu mẫu thống kê.

---

## II. Employee Portal

### 1. Dashboard cá nhân

**Mục đích:** Trang chủ của nhân viên, cung cấp thông tin quan trọng nhất trong ngày.

**Nội dung:**
- Lời chào + tên nhân viên
- **Trạng thái hôm nay:** Ca làm việc (tên ca, giờ bắt đầu–kết thúc), đã check-in lúc mấy giờ / chưa check-in
- **Salary Preview Card:** Lương dự kiến nhận tháng này (tính đến hôm nay). Công thức giống Admin nhưng chỉ tính đến ngày hiện tại. Hiển thị: tổng dự kiến, số ngày công đã có, số lần đi trễ
- **Thao tác nhanh:** Check-in QR, Xin nghỉ phép, Yêu cầu đổi ca, Xem lịch sử

---

### 2. Chấm công QR (Check-in)

**Cơ chế QR:**
- Mỗi ca làm việc có 1 QR token riêng, được sinh tự động 30 phút trước giờ bắt đầu ca qua pg_cron
- QR hiển thị trên tablet đặt tại văn phòng (trang dành riêng cho tablet, auto-refresh)
- Nhân viên dùng camera điện thoại quét QR
- Có thể truy cập qua link (URL chứa token) nếu quét bằng camera native

**Luồng check-in:**
1. Nhân viên mở trang Check-in, camera tự bật
2. Quét QR code trên tablet
3. Hệ thống validate: token hợp lệ? NV có thuộc ca này không?
4. Ghi nhận check-in với timestamp chính xác
5. Tự động tính trạng thái (đúng giờ / đi trễ)
6. Hiển thị thông báo xác nhận: "Check-in thành công lúc 07:02 – Đúng giờ ✓"

**Check-out:** Tương tự check-in, dùng QR của ca đó. Hệ thống tự tính giờ OT nếu về muộn.

**Validation quan trọng:**
- Nhân viên chỉ quét được QR của ca mình được gán → báo lỗi nếu quét sai ca
- Token đã hết hạn → báo lỗi
- Không check-in 2 lần cùng ca

---

### 3. Lịch sử chấm công cá nhân

Bảng hiển thị toàn bộ bản ghi chấm công của chính mình. Lọc theo tháng. Thông tin: Ngày, Ca, Giờ check-in, Giờ check-out, Trạng thái, Ghi chú (nếu admin chấm thủ công).

---

### 4. Xin nghỉ phép

**Form nộp đơn:**
- Loại phép: có lương / không lương / bệnh / khác
- Ngày bắt đầu, Ngày kết thúc (date picker)
- Lý do (text area)
- Hệ thống tự tính số ngày nghỉ và hiển thị
- Hiển thị số ngày phép còn lại trước khi submit
- Nếu vượt số ngày phép có lương → cảnh báo "X ngày vượt quá sẽ chuyển sang không lương"

**Validation:** Phải xin trước ít nhất N ngày làm việc (theo config). Không xin ngày đã qua. Không trùng đơn đang chờ/đã duyệt.

**Sau khi gửi:** Hiển thị trạng thái "Đang chờ duyệt". Khi admin xử lý → nhận thông báo realtime.

**Lịch sử đơn:** Danh sách các đơn đã tạo, trạng thái từng đơn (chờ / đã duyệt / bị từ chối kèm lý do).

---

### 5. Yêu cầu đổi ca

**Form gửi yêu cầu:**
- Loại: Đổi 1 ngày / Đổi cả tuần
- Ngày cụ thể hoặc tuần (chọn từ date picker)
- Ca muốn đổi sang (dropdown các ca có sẵn)
- Lý do

**Sau khi gửi:** Tương tự đơn nghỉ phép – chờ admin duyệt, nhận thông báo kết quả.

---

### 6. Xem lương chi tiết

**Lương dự kiến tháng hiện tại:** Realtime, tính đến hôm nay (xem Dashboard).

**Lương các tháng đã xác nhận:**
- Danh sách tháng đã có payroll_record status = confirmed
- Click vào tháng → xem chi tiết breakdown: ngày công, lương CB, OT, phụ cấp, thưởng, phạt, BHXH, thuế, thực nhận

---

## III. Tính năng Hệ thống

### QR Code System

**Sinh QR tự động (pg_cron):**
- Job chạy mỗi ngày lúc 06:30 (hoặc 30 phút trước ca sớm nhất)
- Gọi Edge Function `generate-qr` cho tất cả ca trong ngày
- Mỗi ca = 1 token UUID, expire lúc kết thúc ca

**Trang tablet tại văn phòng:**
- URL riêng dành cho tablet, không cần đăng nhập
- Hiển thị QR lớn của ca hiện tại (hoặc ca sắp tới)
- Tự động chuyển QR khi ca thay đổi
- Hiển thị tên ca, giờ, đếm ngược thời gian còn lại

**Bảo mật QR:**
- Token là UUID v4 (không thể đoán)
- Expire sau giờ kết ca
- Không gắn thông tin nhạy cảm vào token

---

### Realtime Notifications

**Công nghệ:** Supabase Realtime (WebSocket), subscribe theo `user_id`.

**Các sự kiện gửi thông báo:**

| Sự kiện | Ai nhận |
|---|---|
| Nhân viên nộp đơn nghỉ | Admin + Manager |
| Admin duyệt đơn nghỉ | Nhân viên nộp đơn |
| Admin từ chối đơn nghỉ + lý do | Nhân viên nộp đơn |
| Nhân viên gửi yêu cầu đổi ca | Admin + Manager |
| Admin duyệt đổi ca | Nhân viên gửi yêu cầu |
| Admin từ chối đổi ca + lý do | Nhân viên gửi yêu cầu |
| Admin xác nhận bảng lương tháng | Tất cả nhân viên trong branch |
| Admin chấm công thủ công cho NV | Nhân viên được chấm |

**UI thông báo:**
- Icon chuông 🔔 trên topbar, hiển thị số chưa đọc
- Click chuông → dropdown danh sách thông báo gần nhất
- Click vào thông báo → navigate đến trang liên quan
- Mark as read khi click hoặc "Đánh dấu tất cả đã đọc"

---

## IV. Kế hoạch triển khai

### Phase 1 – Foundation (~1 tuần)

**Mục tiêu:** Hệ thống chạy được, đăng nhập được, quản lý nhân viên cơ bản.

- [ ] Khởi tạo project: Vite + React + TypeScript + Tailwind + shadcn/ui
- [ ] Cấu hình Supabase project, enable Auth (phone + password)
- [ ] Chạy migrations tạo toàn bộ schema (xem DATABASE.md)
- [ ] Cấu hình RLS policies cho tất cả bảng
- [ ] Layout Admin portal (sidebar, topbar, route guards theo role)
- [ ] Layout Employee portal (mobile-first, bottom navigation)
- [ ] Auth flow: đăng nhập, đăng xuất, redirect theo role
- [ ] Module Nhân viên: danh sách (search, filter, pagination), thêm đơn lẻ, sửa, xem chi tiết
- [ ] Bulk import từ Excel (parse + validate + preview + insert)
- [ ] Export danh sách Excel
- [ ] Module Ca làm việc: CRUD ca, gán ca mặc định cho nhân viên theo tháng

### Phase 2 – Chấm công (~2 tuần)

**Mục tiêu:** QR check-in hoạt động đầy đủ, roster scheduling, bảng chấm công admin.

- [ ] Roster scheduling: giao diện xếp lịch ca calendar grid theo tuần
- [ ] QR: Edge Function sinh token, pg_cron job tự động, trang tablet hiển thị QR
- [ ] QR: Employee quét QR (camera API), Edge Function validate + ghi attendance
- [ ] Tính tự động: đúng giờ, đi trễ, về sớm, OT, vắng mặt
- [ ] Chấm công thủ công (Admin)
- [ ] Bảng chấm công Admin: filter, pagination, export Excel
- [ ] Employee: lịch sử chấm công cá nhân theo tháng
- [ ] Yêu cầu đổi ca: employee gửi, admin duyệt/từ chối, cập nhật shift_schedules

### Phase 3 – Nghỉ phép, Lương, Thông báo (~2 tuần)

**Mục tiêu:** App hoàn chỉnh tất cả tính năng, ready for production.

- [ ] Leave policy config (Admin Settings)
- [ ] Employee nộp đơn nghỉ, admin duyệt/từ chối
- [ ] Tự động sync attendance + trừ leave_balances khi duyệt
- [ ] Payroll config (Admin Settings: OT, phụ cấp, thưởng/phạt, BHXH)
- [ ] Edge Function tính lương, bảng lương Admin
- [ ] Admin điều chỉnh thủ công + xác nhận bảng lương
- [ ] Export bảng lương Excel
- [ ] Employee: salary preview realtime + xem chi tiết tháng đã confirmed
- [ ] Realtime notifications (Supabase channel, bell UI, mark as read)
- [ ] Dashboard Admin: stats cards, biểu đồ chuyên cần, danh sách cần xử lý
- [ ] Analytics: xếp hạng nhân viên, thống kê quỹ lương
- [ ] Ngày lễ config + tích hợp vào tính lương
- [ ] Audit log cho các thao tác quan trọng của admin

---

## V. Các quyết định kiến trúc đã chốt

| Quyết định | Lý do |
|---|---|
| React + Vite thay Next.js | App nội bộ, không cần SSR/SEO, nhẹ hơn và build nhanh hơn |
| Supabase SDK gọi trực tiếp từ client | Không cần API server riêng, RLS bảo vệ data |
| Edge Functions cho payroll & QR validate | Logic phức tạp cần chạy server-side, không để trên client |
| pg_cron cho QR auto-gen | Native Supabase, không cần external scheduler |
| Zustand + TanStack Query | Zustand cho UI state, TanStack Query cho server state + caching + invalidation |
| `branch_id` trên tất cả bảng | Multi-branch ready từ đầu, tránh refactor lớn sau này |
| Lương tháng = draft → confirmed | Cho phép admin review trước khi lock, tránh sai sót |
| Phụ cấp là khoản cố định/tháng | Đơn giản hóa tính toán, admin config được per nhân viên |
| Thuế TNCN nhập thủ công | Thuế TNCN phức tạp (biểu thuế lũy tiến, giảm trừ gia cảnh) – để admin tự tính và nhập |
