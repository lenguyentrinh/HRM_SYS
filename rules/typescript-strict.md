---
name: TypeScript Strict
description: No TypeScript any, no dead code, no unused imports or variables
type: feedback
---

## No `any`

Never use `any` in TypeScript. If the type is unknown, use `unknown` then narrow down. If it's external data, use Zod or type assertion with explanation.

**Why:** `any` disables the type checker — errors will be hidden until runtime instead of caught at compile time.

**How to apply:**
- Replace `any` with a specific type, `unknown`, or generic
- API response: use generated Supabase types from `src/types/supabase.ts`
- Event handlers: `React.ChangeEvent<HTMLInputElement>`, not `any`
- If temporary cast is needed: `as unknown as TargetType` and comment the reason

## No dead code

Do not leave unused imports, variables, functions, or components.

**Why:** Dead code causes confusion, increases bundle size, and hides the true intent of the code.

**How to apply:**
- Before commit: check ESLint `no-unused-vars`, `no-unused-imports`
- Remove commented-out code entirely instead of leaving it
- If code is in development: use `// TODO:` explicitly instead of commenting out old code
