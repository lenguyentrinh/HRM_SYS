# Deployment Guide

## Prerequisites

- Supabase project created at [supabase.com](https://supabase.com)
- Supabase CLI installed: `npm install -g supabase`
- Node.js 18+

---

## 1. Environment Variables

Create `.env` (do not commit this file):

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Get from: Supabase Dashboard → Settings → API → Project URL & anon key.

---

## 2. Database Migrations

Run all migration files in order from `supabase/migrations/`:

```bash
supabase db push
```

Or run each file in the Supabase Dashboard SQL Editor:

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

## 3. Enable Realtime for notifications table

After running migration `20260519000001_notifications_realtime.sql`, verify in SQL Editor:

```sql
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
-- notifications must appear in the results
```

---

## 4. Deploy Edge Functions

```bash
# Login Supabase CLI
supabase login

# Link with project
supabase link --project-ref <project-ref>

# Deploy each function
supabase functions deploy generate-qr
supabase functions deploy checkin
supabase functions deploy calculate-payroll
supabase functions deploy salary-preview
```

Or deploy all:

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

Or via CLI:

```bash
supabase secrets set SUPABASE_URL=https://xxx.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

---

## 6. Setup pg_cron (Auto-generate QR tokens)

Run in SQL Editor (Supabase Dashboard → SQL Editor):

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule: generate QR tokens at 06:30 daily
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

-- Verify job was created
SELECT * FROM cron.job;
```

---

## 7. Build and Deploy Frontend

### Cloudflare Pages (recommended)

```bash
npm run build
# Upload dist/ directory to Cloudflare Pages
# Or connect GitHub repo for auto-deploy
```

Configure in Cloudflare Pages:
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Environment variables:** Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

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

## 8. Post-deploy verification

- [ ] Login works with admin account
- [ ] Login works with employee account
- [ ] QR check-in works (requires pg_cron to have run at least once)
- [ ] Realtime notifications work (submit leave request → admin sees bell)
- [ ] Payroll Edge Function returns results
- [ ] Salary preview displays on employee dashboard

---

## 9. Post-deployment management

### Manual QR token reset

```sql
-- Run generate-qr immediately
SELECT net.http_post(
  url := 'https://<project-ref>.supabase.co/functions/v1/generate-qr',
  headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb,
  body := '{}'::jsonb
);
```

### Unlock confirmed payroll (super_admin only)

```sql
UPDATE payroll_records
SET status = 'draft'
WHERE month = <month> AND year = <year>
AND employee_id IN (
  SELECT id FROM employees WHERE branch_id = '<branch-id>'
);
```
