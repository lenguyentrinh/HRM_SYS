# Skill: Tạo trang mới

## Dùng khi
Cần tạo một page mới cho Admin portal hoặc Employee portal.

## Checklist

1. **Tạo file page** tại đúng vị trí:
   - Admin: `src/pages/admin/<FeatureName>Page.tsx`
   - Employee: `src/pages/employee/<FeatureName>Page.tsx`

2. **Cấu trúc file page:**
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
      <PageHeader title="Tên trang" description="Mô tả ngắn" />
      {/* Content */}
    </div>
  )
}
```

3. **Đăng ký route** trong `src/App.tsx` hoặc router config

4. **Thêm nav item** vào sidebar nếu cần (`src/components/admin/Sidebar.tsx`)

5. **Kiểm tra RLS** — đảm bảo user role phù hợp mới vào được trang

## Notes
- Tham khảo DESIGN.md cho color và component patterns
- Dùng TanStack Query cho data fetching, không dùng useEffect + fetch trực tiếp
- Luôn có loading skeleton và empty state
