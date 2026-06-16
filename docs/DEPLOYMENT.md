# Deployment Guide

## Prerequisites

- Supabase project created at [supabase.com](https://supabase.com)
- Supabase CLI installed: `npm install -g supabase`
- Node.js 18+

---

## 1. Environment Variables

Create `.env` (không commit file này):

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Lấy từ: Supabase Dashboard → Settings → API → Project URL & anon key.

---

## 2. Database Migrations

Chạy tất cả migration files theo thứ tự trong `supabase/migrations/`:

```bash
supabase db push
```

Hoặc chạy từng file trong SQL Editor của Supabase Dashboard:

```
supabase/migrations/
  20260501000000_initial_schema.sql
  20260502000000_rls_policies.sql
  20260503000000_seed_data.sql
  20260518000005_leave_rejection_reason.sql
  20260519000001_notifications_realtime.sql
  20260520000001_holidays.sql
  20260520000002_audit_logs.sql
```

---

## 3. Enable Realtime cho bảng notifications

Sau khi chạy migration `20260519000001_notifications_realtime.sql`, kiểm tra lại trong SQL Editor:

```sql
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
-- notifications phải xuất hiện trong kết quả
```

---

## 4. Deploy Edge Functions

```bash
# Login Supabase CLI
supabase login

# Link với project
supabase link --project-ref <project-ref>

# Deploy từng function
supabase functions deploy generate-qr
supabase functions deploy checkin
supabase functions deploy calculate-payroll
supabase functions deploy salary-preview
```

Hoặc deploy tất cả:

```bash
supabase functions deploy
```

---

## 5. Environment Variables cho Edge Functions

Set trong Supabase Dashboard → Edge Functions → Manage Secrets:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (Settings → API) |

Hoặc qua CLI:

```bash
supabase secrets set SUPABASE_URL=https://xxx.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

---

## 6. Setup pg_cron (Tự động sinh QR token)

Chạy trong SQL Editor (Supabase Dashboard → SQL Editor):

```sql
-- Enable pg_cron extension (nếu chưa có)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule: generate QR tokens lúc 06:30 mỗi ngày
SELECT cron.schedule(
  'generate-qr-tokens-daily',
  '30 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/generate-qr',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <service-role-key>"}'::jsonb,
    body := '{"run_all": true}'::jsonb
  )
  $$
);

-- Kiểm tra job đã được tạo
SELECT * FROM cron.job;
```

---

## 7. Build và Deploy Frontend

### Cloudflare Pages (khuyến nghị)

```bash
npm run build
# Upload thư mục dist/ lên Cloudflare Pages
# Hoặc kết nối GitHub repo và auto-deploy
```

Cấu hình trong Cloudflare Pages:
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Environment variables:** Thêm `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`

### Nginx (self-hosted)

```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /var/www/hrm/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location ~* \.(js|css|png|jpg|gif|ico|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

```bash
npm run build
cp -r dist/* /var/www/hrm/dist/
```

---

## 8. Kiểm tra sau deploy

- [ ] Đăng nhập được với tài khoản admin
- [ ] Đăng nhập được với tài khoản nhân viên
- [ ] QR check-in hoạt động (cần pg_cron đã chạy ít nhất 1 lần)
- [ ] Notification realtime hoạt động (gửi đơn nghỉ → admin thấy bell)
- [ ] Tính lương Edge Function trả về kết quả
- [ ] Salary preview hiển thị trên dashboard nhân viên

---

## 9. Quản lý sau khi deploy

### Reset QR token thủ công

```sql
-- Chạy generate-qr ngay lập tức
SELECT net.http_post(
  url := 'https://<project-ref>.supabase.co/functions/v1/generate-qr',
  headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb,
  body := '{}'::jsonb
);
```

### Unlock bảng lương đã confirmed (chỉ super_admin)

```sql
UPDATE payroll_records
SET status = 'draft'
WHERE month = <month> AND year = <year>
AND employee_id IN (
  SELECT id FROM employees WHERE branch_id = '<branch-id>'
);
```
