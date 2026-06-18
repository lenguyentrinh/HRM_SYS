# AGENTS.md — HRM System

## Commands
```bash
npm run dev        # Dev server at http://localhost:5173
npm run build      # Build production (tsc -b && vite build) — MUST PASS with 0 errors
npm run lint       # ESLint check (eslint .)
npm run preview    # Preview production build
```
No test runner configured. `npm run build` runs typecheck — dev server does NOT catch all type errors.

## Architecture
- **Feature-based structure**: `src/features/<module>/{components,hooks,pages,types.ts,utils.ts}`
- **2 portals with separate layouts & route guards**:
  - Admin Portal: `/admin/*` — roles `super_admin`, `manager` — sidebar + topbar layout
  - Employee Portal: `/` — role `employee` — mobile-first bottom nav layout
- **Auth**: Custom (SHA-256 + `users` table), NOT Supabase Auth. Session in `localStorage` key `hrm-auth` (12h TTL) via Zustand `authStore.ts`
- **Route guards**: `RouteGuard` (role check) and `PublicOnlyRoute` in `src/features/auth/components/`
- **After login**: `super_admin`/`manager` → `/admin/dashboard`, `employee` → `/`
- **Multi-branch**: Every table has `branch_id`. `super_admin` can switch branches; others locked to their branch.

## Key Files
| File | Purpose |
|------|---------|
| `src/router.tsx` | Route tree + guards |
| `src/stores/authStore.ts` | Zustand store with custom persist (12h TTL) |
| `src/lib/auth.ts` | `loginWithPhone`, `createUserWithPhone`, `changePassword` (SHA-256) |
| `src/lib/supabase.ts` | Supabase client singleton |
| `src/components/shared/` | Cross-portal components (PageHeader, DataTable, StatusBadge...) |
| `src/components/ui/` | shadcn/ui primitives — do not modify directly |
| `supabase/functions/` | Edge Functions: `checkin`, `generate-qr`, `calculate-payroll`, `bulk-import`, `salary-preview` |

## Conventions (from `rules/`)
- **Import alias**: `@/` → `src/`
- **Files < 200 lines**; 1 component per file (PascalCase)
- **Forms**: react-hook-form + zod (`@hookform/resolvers`)
- **Toasts**: `sonner` (mounted in `App.tsx`)
- **Data fetching**: TanStack Query hooks in `features/<module>/hooks/`, NOT in pages
- **Page components**: Compose only, no business logic
- **TypeScript strict**: no `any`, no unused locals/params, `verbatimModuleSyntax: true`
- **Import order**: React → third-party → shadcn/ui → internal → hooks → types → utils

## Supabase Patterns
- **Never use `supabase.auth.*`** — all auth via `src/lib/auth.ts`
- **Realtime**: Insert into `notifications` table → Supabase Realtime → client subscribes by `user_id`
- **QR Token Flow**: `pg_cron` (06:30 daily) → Edge Function `generate-qr` → upserts to `qr_tokens` (UNIQUE shift_id + date)
- **Shift Lookup**: 1) `shift_schedules` (date override) → 2) `employee_shift_assignments` (monthly default)

## Critical Gotchas
1. **Build before reporting done**: `npm run build` MUST pass (0 errors). Dev server misses TS errors.
2. **Auth store persist shape is custom**: `partialize` returns `{ session: StoredSession }` — NOT Zustand default. Preserve this when editing.
3. **No `supabase.auth`**: Custom auth queries `users` table directly with SHA-256 password hash.
4. **Branch scope**: All queries must filter by `activeBranchId` (from auth store). `super_admin` has `null` (can switch).
5. **Salary preview vs payroll record**: Preview = real-time client calc (no DB); Payroll = end-of-month stored in DB (`draft` → `confirmed`, locked when confirmed).

## Environment
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```
Test accounts in `.env` (admin/employee phone + password).

## Documentation Reference
- `docs/PLANNING.md` — Full feature spec + task checklist
- `docs/DATABASE.md` — Schema, ERD, data flows
- `docs/API.md` — Edge Functions + query patterns
- `docs/VALIDATIONS.md` — Business rules
- `docs/DESIGN.md` — Design system, components, UX patterns
- `docs/handoff/PHASE_X_HANDOFF.md` — Phase completion records
- `layout-descriptions.md` — **Stitch layout prompts** (25 layouts, Epic 1-4). Reference this when generating/updating UI.
- `EFC_PHASES.md` — **Epic → Feature → Child task breakdown** (4 epics, 24 features). Defines scope & order.

## Stitch Design System (Google Stitch)
- **Project ID**: `1685953885973274207` ("HRM System")
- **Design System**: "Kinetic HRM" — light mode, orange primary (#f97316), Inter font, roundness 8 (xl), 8pt grid
- **Screens generated**: Admin Layout Shell (Desktop), Employee Mobile Shell (Mobile), Tablet QR Check-in Kiosk
- **When generating layouts**: Read `layout-descriptions.md` for exact specs, match `EFC_PHASES.md` for phase ordering

## Rules Files (Read Before Coding)
- `rules/component-architecture.md` — Feature structure, build requirement
- `rules/code-style.md` — TS, naming, imports, formatting
- `rules/security.md` — RLS, keys, auth, input validation
- `rules/supabase-patterns.md` — Query patterns, realtime, migration
- `rules/typescript-strict.md` — TS strict mode rules