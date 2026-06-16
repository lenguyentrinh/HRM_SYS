# Supabase Patterns

## Client Setup
```ts
// src/lib/supabase.ts — singleton, import ở mọi nơi
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

## Query Patterns

### Luôn handle error
```ts
// ✅ Đúng
const { data, error } = await supabase.from('employees').select('*')
if (error) throw new Error(error.message)

// ❌ Sai — bỏ qua error
const { data } = await supabase.from('employees').select('*')
```

### Dùng TanStack Query cho data fetching
```ts
// ✅ Dùng useQuery thay vì useEffect + useState
const { data: employees, isLoading } = useQuery({
  queryKey: ['employees', branchId],
  queryFn: () => fetchEmployees(branchId)
})
```

### Type-safe queries với generated types
```ts
// Sau khi chạy: supabase gen types typescript --project-id <id> > src/types/supabase.ts
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

### Filter với null check
```ts
// Chỉ apply filter nếu có giá trị
let query = supabase.from('attendance_records').select('*')
if (statusFilter) query = query.eq('status', statusFilter)
if (dateFilter) query = query.eq('date', dateFilter)
```

## Realtime Pattern

```ts
// Subscribe trong useEffect, cleanup khi unmount
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
// Dùng supabase.functions.invoke thay vì fetch trực tiếp
const { data, error } = await supabase.functions.invoke('checkin', {
  body: { token, employee_id, type: 'check_in' }
})
```

## Auth Pattern

```ts
// Hook để lấy user + role hiện tại
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
- Luôn có `up` migration, cân nhắc `down` migration cho production
- Không sửa migration đã chạy — tạo migration mới
- Enable RLS ngay trong migration khi tạo bảng:
  ```sql
  ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
  ```
