---
name: Component Architecture
description: Shared components, file splitting, React architecture conventions
type: feedback
---

## Ưu tiên viết component dùng chung

Trước khi viết UI mới, kiểm tra `src/components/ui/` (shadcn) và `src/components/shared/` đã có chưa. Nếu cùng UI xuất hiện ở 2+ nơi → tách ra shared component.

**Why:** Tránh duplicate logic, đảm bảo consistent design, dễ maintain.

**How to apply:**
- `src/components/shared/` — generic app-level components: PageHeader, DataTable, StatusBadge, ConfirmDialog, LoadingSkeleton, EmptyState
- `src/components/ui/` — shadcn primitives (Button, Input, Dialog, etc.) — không edit trực tiếp
- Feature-specific components sống trong `src/features/<module>/components/`

## Tách nhỏ file chuẩn kiến trúc React

Mỗi file chỉ có 1 responsibility. Không nhét logic, query, và UI vào cùng 1 component.

**Structure per feature module:**
```
src/features/<module>/
  components/     — UI components (pure/presentational)
  hooks/          — custom hooks, TanStack Query hooks
  pages/          — page-level components (route target), chỉ compose
  types.ts        — module-specific types/interfaces
  utils.ts        — pure helper functions
```

**Rules:**
- Page component chỉ compose, không có business logic trực tiếp
- Data fetching trong hooks (`useEmployees`, `useLeaveRequests`), không trong page
- Form state với react-hook-form + zod schema tách ra file riêng nếu > 5 fields
- Giới hạn file < 200 lines — nếu vượt, xem xét tách

## Phải build clean trước khi báo hoàn thành

Trước khi kết thúc bất kỳ phase nào, chạy `npm run build` và đảm bảo output không có error.

**Why:** TypeScript errors chỉ bắt được ở build time. Nhiều lỗi không hiển thị trong dev server.

**How to apply:**
- Chạy `npm run build` — phải pass 0 errors
- TSC strict mode: không được có type error
- Nếu có warning từ thư viện bên ngoài: ghi lại trong HANDOFF.md, không block release
