# Code Style Rules

## TypeScript
- Bật `strict: true` trong tsconfig
- Không dùng `any` — dùng `unknown` nếu type chưa rõ, rồi narrow down
- Định nghĩa types/interfaces trong `src/types/` — không inline type phức tạp
- Dùng `type` cho unions/primitives, `interface` cho object shapes
- Tất cả Supabase response phải có type đầy đủ (generate từ Supabase CLI)

## Components
- 1 file = 1 component. Tên file = tên component (PascalCase)
- Props interface đặt ngay trên component, đặt tên `ComponentNameProps`
- Không dùng default export cho utilities/hooks — chỉ dùng cho components/pages
- Tách logic phức tạp ra custom hook (`use` prefix)

## Naming
| Loại | Convention | Ví dụ |
|---|---|---|
| Component | PascalCase | `EmployeeTable.tsx` |
| Hook | camelCase, prefix `use` | `useAttendance.ts` |
| Utility | camelCase | `formatCurrency.ts` |
| Constant | UPPER_SNAKE_CASE | `MAX_LEAVE_DAYS` |
| Type/Interface | PascalCase | `AttendanceRecord` |
| Supabase table type | PascalCase + suffix | `EmployeeRow`, `LeaveRequestInsert` |

## Imports
Thứ tự import (ESLint enforced):
1. React
2. Third-party libs (react-router, zustand, tanstack...)
3. shadcn/ui components
4. Internal components (`@/components/...`)
5. Hooks (`@/hooks/...`)
6. Types (`@/types/...`)
7. Utils (`@/lib/...`)

## Formatting
- Dùng Prettier defaults
- Semicolons: có
- Quotes: single
- Tab width: 2
- Trailing comma: all

## Comments
- Không comment những gì code tự giải thích được
- Chỉ comment khi: logic phức tạp, workaround cho bug, business rule không rõ ràng
- Dùng tiếng Việt cho comment nghiệp vụ, tiếng Anh cho technical comment
