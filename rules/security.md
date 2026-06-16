# Security Rules

## Supabase Keys
- `VITE_SUPABASE_ANON_KEY` — only key used in client code
- **ABSOLUTELY NEVER** use `service_role` key in frontend
- Only Edge Functions can use `service_role` key (server-side only)
- Keys stored in `.env.local`, not committed to git

## Row Level Security (RLS)
- **Enable RLS on ALL tables** — no exceptions
- All queries from client go through RLS
- Before deploying a new migration: verify RLS policies are correct
- Test RLS by logging in with different roles and confirming data isolation

## Authentication
- Route guard: check `auth.user` + `users.role` before rendering admin pages
- Token refresh automatically via Supabase session
- Logout must call `supabase.auth.signOut()` to invalidate session server-side
- Do not store session token in localStorage manually (Supabase manages itself)

## Input Validation
- Validate on client (UX) AND server/Edge Function (security) — not just one side
- Sanitize all text input before rendering (React auto-escapes, but be careful with `dangerouslySetInnerHTML`)
- File upload (Excel import): check MIME type and size before parsing

## QR Token Security
- Token is UUID v4 — unpredictable
- Expires after shift end time
- Each shift has only 1 active token (upsert instead of insert)
- Do not embed sensitive data in token (it's an opaque ID)

## Edge Functions
- Verify `Authorization` header in every Edge Function (except public endpoints)
- Validate and sanitize all input parameters
- Do not log sensitive data (salary, phone number)
