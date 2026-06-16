---
name: TypeScript Strict
description: No TypeScript any, no dead code, no unused imports or variables
type: feedback
---

## Không dùng `any`

Không bao giờ dùng `any` trong TypeScript. Nếu không biết type, dùng `unknown` rồi narrow xuống. Nếu là external data, dùng Zod hoặc type assertion có giải thích.

**Why:** `any` vô hiệu hóa type checker — lỗi sẽ bị ẩn đến runtime thay vì bị bắt lúc compile.

**How to apply:**
- Thay `any` bằng type cụ thể, `unknown`, hoặc generic
- API response: dùng generated Supabase types từ `src/types/supabase.ts`
- Event handlers: `React.ChangeEvent<HTMLInputElement>`, không phải `any`
- Nếu cần cast tạm thời: `as unknown as TargetType` và comment lý do

## Không để code thừa

Không để lại import, variable, function, hoặc component không được dùng.

**Why:** Dead code gây confusion, tăng bundle size, và che giấu ý định thực sự của code.

**How to apply:**
- Trước khi commit: kiểm tra ESLint `no-unused-vars`, `no-unused-imports`
- Xóa hẳn comment-out code thay vì để lại
- Nếu code đang phát triển dở: dùng `// TODO:` explicit thay vì comment out code cũ
