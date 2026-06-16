# Code Style Rules

## TypeScript
- Enable `strict: true` in tsconfig
- No `any` — use `unknown` if type is unclear, then narrow down
- Define types/interfaces in `src/types/` — no complex inline types
- Use `type` for unions/primitives, `interface` for object shapes
- All Supabase responses must have full types (generated from Supabase CLI)

## Components
- 1 file = 1 component. File name = component name (PascalCase)
- Props interface placed right above component, named `ComponentNameProps`
- No default export for utilities/hooks — only for components/pages
- Extract complex logic into custom hooks (`use` prefix)

## Naming
| Type | Convention | Example |
|---|---|---|
| Component | PascalCase | `EmployeeTable.tsx` |
| Hook | camelCase, prefix `use` | `useAttendance.ts` |
| Utility | camelCase | `formatCurrency.ts` |
| Constant | UPPER_SNAKE_CASE | `MAX_LEAVE_DAYS` |
| Type/Interface | PascalCase | `AttendanceRecord` |
| Supabase table type | PascalCase + suffix | `EmployeeRow`, `LeaveRequestInsert` |

## Imports
Import order (ESLint enforced):
1. React
2. Third-party libs (react-router, zustand, tanstack...)
3. shadcn/ui components
4. Internal components (`@/components/...`)
5. Hooks (`@/hooks/...`)
6. Types (`@/types/...`)
7. Utils (`@/lib/...`)

## Formatting
- Use Prettier defaults
- Semicolons: yes
- Quotes: single
- Tab width: 2
- Trailing comma: all

## Comments
- Do not comment what code can explain itself
- Only comment when: complex logic, workaround for bug, unclear business rule
- Use English for all comments
