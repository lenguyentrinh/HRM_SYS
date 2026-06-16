# Security Rules

## Supabase Keys
- `VITE_SUPABASE_ANON_KEY` — key duy nhất được dùng trong client code
- **TUYỆT ĐỐI KHÔNG** dùng `service_role` key trong frontend
- Edge Functions mới được dùng `service_role` key (server-side only)
- Keys lưu trong `.env.local`, không commit vào git

## Row Level Security (RLS)
- **Bật RLS trên TẤT CẢ bảng** — không có ngoại lệ
- Mọi truy vấn từ client đều đi qua RLS
- Trước khi deploy migration mới: verify RLS policy đã đúng
- Test RLS bằng cách login với role khác nhau và xác nhận data isolation

## Authentication
- Route guard: kiểm tra `auth.user` + `users.role` trước khi render admin pages
- Token refresh tự động qua Supabase session
- Logout phải gọi `supabase.auth.signOut()` để invalidate session server-side
- Không lưu session token trong localStorage thủ công (Supabase tự quản lý)

## Input Validation
- Validate ở client (UX) VÀ server/Edge Function (security) — không chỉ 1 bên
- Sanitize mọi text input trước khi hiển thị (React tự escape, nhưng cẩn thận với `dangerouslySetInnerHTML`)
- File upload (Excel import): kiểm tra MIME type và size trước khi parse

## QR Token Security
- Token là UUID v4 — không thể đoán
- Expire sau giờ kết ca
- Mỗi ca chỉ có 1 token active (upsert thay vì insert)
- Không nhúng sensitive data vào token (chỉ là opaque ID)

## Edge Functions
- Verify `Authorization` header trong mọi Edge Function (trừ public endpoints)
- Validate và sanitize tất cả input parameters
- Không log sensitive data (lương, SĐT)
