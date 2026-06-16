# Fix Bugs Phase 9

## BUG-P9-01 — Invalid Tailwind CSS class on Clock icon

**Severity:** Low  
**Status:** Fixed

### Mô tả
`Clock` icon trong "Ca hôm nay" card trên `EmployeeDashboardPage` sử dụng class `h-4.5 w-4.5`, không tồn tại trong Tailwind CSS v3 default spacing scale. Tailwind v3 không có step `4.5` (nhảy thẳng từ `h-4` = 1rem lên `h-5` = 1.25rem). Class bị ignore nên icon render ở kích thước mặc định của Lucide (24px) thay vì kích thước dự kiến.

### Root Cause
Tailwind v3 default config không extend spacing để thêm `4.5`. Class `h-4.5` và `w-4.5` là không hợp lệ và bị bỏ qua hoàn toàn.

### Fix
**File:** `src/features/employee-portal/pages/EmployeeDashboardPage.tsx` — line 47

```diff
- <Clock className="h-4.5 w-4.5 text-orange-500" />
+ <Clock className="h-5 w-5 text-orange-500" />
```

### Cách test verify
1. Đăng nhập với role `employee`
2. Vào dashboard (`/`)
3. Kiểm tra card "Ca hôm nay" — icon đồng hồ bên trái có kích thước 20px (h-5 = 1.25rem), nhỏ hơn container 36px (w-9 h-9), căn giữa đẹp

---

## OBS-P9-01 — useMyTodayShift không propagate DB errors (không fix)

**Severity:** Observation — không phải bug  
**Status:** Accepted, không fix

### Mô tả
`useMyTodayShift` bắt lỗi silently — nếu Supabase trả về error, hook trả về `null` (giống như không có ca) thay vì throw để TanStack Query đánh dấu `isError`.

### Lý do không fix
Behavior này nhất quán với style của các hooks khác trong codebase (ví dụ: `useMyEmployee`, `useMyAttendance`). Với UX employee portal, "không có ca" và "lỗi DB" đều hiển thị "Chưa có ca" — người dùng không bị ảnh hưởng. Nếu muốn thêm error state sau này thì refactor toàn bộ nhóm hooks cùng lúc.
