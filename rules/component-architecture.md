---
name: Component Architecture
description: Shared components, file splitting, React architecture conventions
type: feedback
---

## Prefer reusable components

Before writing new UI, check `src/components/ui/` (shadcn) and `src/components/shared/` to see if it already exists. If the same UI appears in 2+ places → extract into a shared component.

**Why:** Avoid duplicate logic, ensure consistent design, easy maintenance.

**How to apply:**
- `src/components/shared/` — generic app-level components: PageHeader, DataTable, StatusBadge, ConfirmDialog, LoadingSkeleton, EmptyState
- `src/components/ui/` — shadcn primitives (Button, Input, Dialog, etc.) — do not edit directly
- Feature-specific components live in `src/features/<module>/components/`

## Split files according to React architecture

Each file should have only 1 responsibility. Do not put logic, queries, and UI in the same component.

**Structure per feature module:**
```
src/features/<module>/
  components/     — UI components (pure/presentational)
  hooks/          — custom hooks, TanStack Query hooks
  pages/          — page-level components (route target), compose only
  types.ts        — module-specific types/interfaces
  utils.ts        — pure helper functions
```

**Rules:**
- Page component only composes, no direct business logic
- Data fetching in hooks (`useEmployees`, `useLeaveRequests`), not in page
- Form state with react-hook-form + zod schema — extract to separate file if > 5 fields
- Keep files < 200 lines — if exceeded, consider splitting

## Must build clean before reporting completion

Before ending any phase, run `npm run build` and ensure the output has no errors.

**Why:** TypeScript errors are only caught at build time. Many errors don't show in the dev server.

**How to apply:**
- Run `npm run build` — must pass with 0 errors
- TSC strict mode: no type errors allowed
- If warnings from external libraries: record in HANDOFF.md, do not block release
