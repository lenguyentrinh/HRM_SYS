# Skill: Create a new page

## When to use
When you need to create a new page for the Admin portal or Employee portal.

## Checklist

1. **Create page file** at the correct location:
   - Admin: `src/pages/admin/<FeatureName>Page.tsx`
   - Employee: `src/pages/employee/<FeatureName>Page.tsx`

2. **Page file structure:**
```tsx
import { PageHeader } from '@/components/admin/PageHeader'
// ... imports

export default function FeatureNamePage() {
  // 1. State & hooks
  // 2. Data fetching (useQuery)
  // 3. Mutations (useMutation)
  // 4. Handlers

  return (
    <div className="space-y-6">
      <PageHeader title="Page Title" description="Short description" />
      {/* Content */}
    </div>
  )
}
```

3. **Register route** in `src/App.tsx` or router config

4. **Add nav item** to sidebar if needed (`src/components/admin/Sidebar.tsx`)

5. **Check RLS** — ensure the correct user role can access the page

## Notes
- Refer to DESIGN.md for color and component patterns
- Use TanStack Query for data fetching, not useEffect + direct fetch
- Always include loading skeleton and empty state
