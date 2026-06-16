# Supabase Patterns

## Client Setup
```ts
// src/lib/supabase.ts — singleton, import everywhere
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

## Query Patterns

### Always handle error
```ts
// ✅ Correct
const { data, error } = await supabase.from('employees').select('*')
if (error) throw new Error(error.message)

// ❌ Wrong — skipping error
const { data } = await supabase.from('employees').select('*')
```

### Use TanStack Query for data fetching
```ts
// ✅ Use useQuery instead of useEffect + useState
const { data: employees, isLoading } = useQuery({
  queryKey: ['employees', branchId],
  queryFn: () => fetchEmployees(branchId)
})
```

### Type-safe queries with generated types
```ts
// After running: supabase gen types typescript --project-id <id> > src/types/supabase.ts
type EmployeeRow = Database['public']['Tables']['employees']['Row']
```

### Pagination
```ts
const PAGE_SIZE = 10
const { data, count } = await supabase
  .from('employees')
  .select('*', { count: 'exact' })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
```

### Filter with null check
```ts
// Only apply filter if value exists
let query = supabase.from('attendance_records').select('*')
if (statusFilter) query = query.eq('status', statusFilter)
if (dateFilter) query = query.eq('date', dateFilter)
```

## Realtime Pattern

```ts
// Subscribe in useEffect, cleanup on unmount
useEffect(() => {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [userId])
```

## Edge Function Calls

```ts
// Use supabase.functions.invoke instead of direct fetch
const { data, error } = await supabase.functions.invoke('checkin', {
  body: { token, employee_id, type: 'check_in' }
})
```

## Auth Pattern

```ts
// Hook to get current user + role
export function useAuth() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadUserRole(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(...)
    return () => subscription.unsubscribe()
  }, [])

  return { user, role, isAdmin: role === 'super_admin' || role === 'manager' }
}
```

## Migration Conventions
- File migration: `YYYYMMDDHHMMSS_description.sql`
- Always have `up` migration, consider `down` migration for production
- Do not modify a migration that has already been run — create a new migration
- Enable RLS in the migration when creating the table:
  ```sql
  ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
  ```
