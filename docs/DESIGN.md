# DESIGN.md – Design System & Wireframes

## Triết lý thiết kế

**Admin Portal** — Desktop-first, data-dense, công cụ quản lý:
- Sidebar navigation cố định, nhiều thông tin trên 1 màn hình
- Bảng dữ liệu là thành phần chính — phải đọc nhanh được
- Màu sắc dùng để truyền đạt trạng thái (xanh/vàng/đỏ), không dùng để trang trí

**Employee Portal** — Mobile-first, đơn giản, dùng nhanh:
- Nhân viên mở app chủ yếu để: check-in, xem lương, nộp đơn
- Mỗi tác vụ không quá 3 bước
- Bottom navigation, không sidebar

**Màu chủ đạo — Cam (Orange):**
Cam được chọn vì mang tính năng động, phù hợp môi trường doanh nghiệp không quá formal. Tông cam trên nền slate tối (sidebar) tạo contrast rõ ràng mà không gây mỏi mắt khi dùng cả ngày.

---

## Color Palette

### Primary – Cam (Orange)
| Token | Hex | Tailwind | Dùng cho |
|---|---|---|---|
| primary-50 | `#fff7ed` | `orange-50` | Background nhẹ, hover state |
| primary-100 | `#ffedd5` | `orange-100` | Badge background, tag, section highlight |
| primary-200 | `#fed7aa` | `orange-200` | Avatar background, chart bar nhạt |
| primary-400 | `#fb923c` | `orange-400` | Icon accent |
| **primary-500** | **`#f97316`** | **`orange-500`** | **Button primary, active nav, link chính** |
| primary-600 | `#ea580c` | `orange-600` | Button hover, badge text on light bg |
| primary-700 | `#c2410c` | `orange-700` | Dark text on orange-100 bg |
| primary-800 | `#9a3412` | `orange-800` | Heading accent đậm |

### Neutral – Slate
| Token | Hex | Tailwind | Dùng cho |
|---|---|---|---|
| slate-900 | `#0f172a` | `slate-900` | Sidebar background, topbar |
| slate-800 | `#1e293b` | `slate-800` | Dark card header, modal overlay |
| slate-600 | `#475569` | `slate-600` | Body text chính |
| slate-500 | `#64748b` | `slate-500` | Sub text, placeholder, icon |
| slate-300 | `#cbd5e1` | `slate-300` | Input border, divider nhẹ |
| slate-200 | `#e2e8f0` | `slate-200` | Table border, card divider |
| slate-100 | `#f1f5f9` | `slate-100` | Page background |
| slate-50  | `#f8fafc` | `slate-50`  | Card background, table row hover |

### Semantic Colors — trạng thái chấm công & đơn từ
| Trạng thái | Background | Text | Tailwind classes |
|---|---|---|---|
| Đúng giờ / Đã duyệt / Active | `#dcfce7` | `#16a34a` | `bg-green-100 text-green-700` |
| Đi trễ / Chờ duyệt / Warning | `#fef9c3` | `#ca8a04` | `bg-yellow-100 text-yellow-700` |
| Vắng mặt / Từ chối / Error | `#fee2e2` | `#dc2626` | `bg-red-100 text-red-700` |
| Nghỉ phép / Info | `#ffedd5` | `#ea580c` | `bg-orange-100 text-orange-700` |
| Parttime / Neutral | `#f1f5f9` | `#64748b` | `bg-slate-100 text-slate-500` |
| Ngày lễ | `#ede9fe` | `#7c3aed` | `bg-violet-100 text-violet-700` |

---

## Typography

**Font:** Inter — import từ Google Fonts: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap')`

| Sử dụng | Weight | Size | Tailwind |
|---|---|---|---|
| Page title (H1) | 800 | 24px | `text-2xl font-extrabold` |
| Section title (H2) | 700 | 18px | `text-lg font-bold` |
| Card title | 700 | 14px | `text-sm font-bold` |
| Body text | 400 | 14px | `text-sm` |
| Sub text / hint | 400 | 12px | `text-xs text-slate-500` |
| Table header | 600 | 11px uppercase | `text-xs font-semibold uppercase tracking-wide` |
| Badge label | 600 | 10px | `text-[10px] font-semibold` |
| Số tiền lớn (salary) | 800 | 22–28px | `text-2xl font-extrabold` |
| Code / mã NV | 500 monospace | 12px | `font-mono text-xs` |

---

## Spacing & Layout

| Thuộc tính | Value | Tailwind |
|---|---|---|
| Sidebar width | 200px | `w-[200px]` |
| Topbar height | 56px | `h-14` |
| Page padding | 24px | `p-6` |
| Card padding | 16px | `p-4` |
| Card border radius | 8px | `rounded-lg` |
| Card shadow | sm | `shadow-sm` |
| Gap giữa cards | 16px | `gap-4` |
| Table row min-height | 44px | — |
| Button border radius | 6px | `rounded-md` |
| Input border radius | 6px | `rounded-md` |
| Bottom nav height | 64px | `h-16` |

### Responsive Strategy
| Breakpoint | Tailwind | Behavior |
|---|---|---|
| Mobile `< 640px` | default | Employee portal layout chính. Admin portal ẩn sidebar, chỉ hiện bottom nav |
| Tablet `640–1024px` | `sm:` | Admin portal sidebar thu gọn (chỉ icon). Employee portal full |
| Desktop `> 1024px` | `lg:` | Admin portal sidebar đầy đủ text + icon |

---

## Admin Portal Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Topbar (h-14, bg-slate-900)                                   │
│ [Logo] HRM System                          🔔 N  [Avatar] ▾  │
├─────────────────┬────────────────────────────────────────────┤
│ Sidebar         │  Content area                              │
│ (w-[200px]      │  (flex-1, bg-slate-100, p-6)              │
│  bg-slate-900)  │                                            │
│                 │  <PageHeader title="" description="" />    │
│ [Icon] Dashboard│  <div class="flex gap-2 mb-4">            │
│ [Icon] Nhân viên│    <FilterBar />                          │
│ [Icon] Chấm công│    <ActionButtons />                      │
│ [Icon] Nghỉ phép│  </div>                                   │
│ [Icon] Lương    │  <DataTable /> hoặc <CardGrid />          │
│ ─────────────── │                                            │
│ [Icon] Analytics│                                            │
│ [Icon] Cài đặt  │                                            │
└─────────────────┴────────────────────────────────────────────┘
```

**Sidebar active state:** `bg-orange-500 text-white rounded-md mx-2`
**Sidebar inactive:** `text-slate-400 hover:bg-slate-800 hover:text-white rounded-md mx-2`

---

## Employee Portal Layout (Mobile-first)

```
┌────────────────────────┐
│ Topbar (h-14)          │  bg-slate-900, text-white
│ ← [Title]       🔔 N  │
├────────────────────────┤
│                        │
│  Content area          │  bg-slate-100, p-4
│  (scroll)              │
│                        │
│  <Card />              │
│  <Card />              │
│                        │
├────────────────────────┤
│ Bottom Nav (h-16)      │  bg-white, border-t border-slate-200
│  🏠    📷    📋    👤  │  active: text-orange-500, inactive: text-slate-400
└────────────────────────┘
```

**Bottom Nav items:** Trang chủ (`/`), Check-in (`/checkin`), Nghỉ phép (`/leaves`), Hồ sơ (`/profile`)

---

## Component Patterns

### Buttons
```tsx
// Primary — action chính của trang
<Button className="bg-orange-500 hover:bg-orange-600 text-white">
  + Thêm nhân viên
</Button>

// Secondary — action phụ
<Button variant="outline" className="border-slate-300">
  Export Excel
</Button>

// Danger — hành động không thể hoàn tác
<Button className="bg-red-600 hover:bg-red-700 text-white">
  Từ chối
</Button>

// Success — xác nhận / duyệt
<Button className="bg-green-600 hover:bg-green-700 text-white">
  ✓ Duyệt
</Button>

// Ghost icon — edit, delete trong table row
<Button variant="ghost" size="icon" className="h-8 w-8">
  <PencilIcon className="h-4 w-4" />
</Button>
```

### Status Badges — nhất quán toàn app
```tsx
// Attendance status
<Badge className="bg-green-100 text-green-700">Đúng giờ</Badge>
<Badge className="bg-yellow-100 text-yellow-700">Đi trễ 8'</Badge>
<Badge className="bg-red-100 text-red-700">Vắng mặt</Badge>
<Badge className="bg-orange-100 text-orange-700">Nghỉ phép</Badge>
<Badge className="bg-violet-100 text-violet-700">Ngày lễ</Badge>

// Request status
<Badge className="bg-yellow-100 text-yellow-700">Chờ duyệt</Badge>
<Badge className="bg-green-100 text-green-700">Đã duyệt</Badge>
<Badge className="bg-red-100 text-red-700">Từ chối</Badge>

// Employee type
<Badge className="bg-orange-100 text-orange-700">Fulltime</Badge>
<Badge className="bg-slate-100 text-slate-600">Parttime</Badge>

// Employee status
<Badge className="bg-green-100 text-green-700">Đang làm</Badge>
<Badge className="bg-yellow-100 text-yellow-700">Thử việc</Badge>
<Badge className="bg-slate-100 text-slate-500">Đã nghỉ</Badge>
```

### Data Tables
```tsx
// Cấu trúc chuẩn — dùng shadcn Table
<div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
  <Table>
    <TableHeader className="bg-slate-50">
      <TableRow>
        <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Nhân viên
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="hover:bg-slate-50 border-b border-slate-100">
        <TableCell>...</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

**Các trạng thái bắt buộc có:**
- **Loading:** Skeleton rows (dùng `shadcn/ui Skeleton`)
- **Empty:** Icon + message "Không có dữ liệu" + action nếu phù hợp
- **Error:** Alert đỏ với message lỗi

### Forms & Inputs
```tsx
// Label + Input pattern
<div className="space-y-1.5">
  <Label className="text-xs font-medium text-slate-600">
    Họ tên <span className="text-red-500">*</span>
  </Label>
  <Input
    className="border-slate-300 focus:border-orange-500 focus:ring-orange-500/20"
    placeholder="Nguyễn Văn A"
  />
  {error && (
    <p className="text-xs text-red-600">{error}</p>
  )}
</div>
```

**Focus ring:** `focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20`
**Error border:** `border-red-400 focus:border-red-500`

### Salary Preview Card (Employee Portal)
```tsx
// Gradient card nổi bật trên dashboard
<div className="rounded-xl p-5 text-white"
  style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}>
  <div className="text-xs opacity-80 uppercase tracking-wide mb-1">
    Lương dự kiến tháng {month}
  </div>
  <div className="text-3xl font-black mb-2">
    {formatCurrency(estimatedSalary)}
  </div>
  <div className="text-xs opacity-80">
    Cập nhật đến {formatDate(today)} · {actualDays}/{standardDays} ngày
  </div>
</div>
```

### Page Header (Admin Portal)
```tsx
// Đặt ở đầu mỗi page
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-2xl font-extrabold text-slate-900">Quản lý nhân viên</h1>
    <p className="text-sm text-slate-500 mt-0.5">48 nhân viên trong hệ thống</p>
  </div>
  <div className="flex gap-2">
    <Button variant="outline">📤 Export</Button>
    <Button className="bg-orange-500 ...">+ Thêm</Button>
  </div>
</div>
```

---

## UX Patterns

### Loading States
- **Trang đầu tiên load:** Full-page skeleton (không spinner)
- **Refetch sau action:** Giữ nội dung cũ + loading indicator nhỏ ở góc
- **Button submit:** Disable + spinner icon trong button, không disable cả form

### Empty States
```tsx
// Khi không có dữ liệu
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="text-4xl mb-3">📋</div>
  <div className="text-sm font-medium text-slate-700">Chưa có dữ liệu</div>
  <div className="text-xs text-slate-500 mt-1">Thêm nhân viên để bắt đầu</div>
  <Button className="mt-4 bg-orange-500 ...">+ Thêm ngay</Button>
</div>
```

### Error States
```tsx
// Query thất bại
<Alert variant="destructive" className="m-4">
  <AlertTitle>Không thể tải dữ liệu</AlertTitle>
  <AlertDescription>
    {error.message} · <Button variant="link" onClick={refetch}>Thử lại</Button>
  </AlertDescription>
</Alert>
```

### Toast Notifications
- **Success:** `toast.success("Đã duyệt đơn nghỉ phép")` — green, tự tắt sau 3s
- **Error:** `toast.error("Không thể kết nối máy chủ")` — red, tự tắt sau 5s
- **Info:** `toast("QR code đã được làm mới")` — default, tự tắt sau 3s

### Confirmation Dialogs
Dùng cho hành động không thể hoàn tác (xóa NV, từ chối đơn, xác nhận phát lương):
```tsx
<AlertDialog>
  <AlertDialogTrigger>...</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>Xác nhận phát lương tháng 5?</AlertDialogTitle>
    <AlertDialogDescription>
      Hành động này sẽ khóa bảng lương và không thể tính lại tự động.
    </AlertDialogDescription>
    <AlertDialogCancel>Hủy</AlertDialogCancel>
    <AlertDialogAction className="bg-orange-500">Xác nhận</AlertDialogAction>
  </AlertDialogContent>
</AlertDialog>
```

---

## Icons

Dùng **Lucide React** (tích hợp trong shadcn/ui). Size mặc định: `h-4 w-4`. Trong nav sidebar: `h-5 w-5`.

| Module | Icon |
|---|---|
| Dashboard | `LayoutDashboard` |
| Nhân viên | `Users` |
| Chấm công | `Clock` |
| Nghỉ phép | `CalendarOff` |
| Lương | `Wallet` |
| Cài đặt | `Settings` |
| Analytics | `BarChart2` |
| Thông báo | `Bell` |
| QR Code | `QrCode` |
| Check-in | `LogIn` |
| Check-out | `LogOut` |
| Duyệt | `CheckCircle` |
| Từ chối | `XCircle` |
| Export | `Download` |
| Import | `Upload` |
| Thêm mới | `Plus` |
| Sửa | `Pencil` |
| Xóa | `Trash2` |
| Tìm kiếm | `Search` |
| Lọc | `Filter` |
| Đổi ca | `ArrowLeftRight` |
| Lịch | `Calendar` |
| Roster | `CalendarDays` |
| Thưởng/Phạt | `TrendingUp` |

---

## Wireframes

Xem file [`proposal.html`](../proposal.html) để xem wireframe tương tác của tất cả màn hình và workflow diagrams.

Wireframe đã bao gồm:
- **Admin Portal:** Dashboard, Employee List, Employee Detail (tabs), Attendance, Leave Management, Payroll, Settings
- **Employee Portal:** Dashboard + Salary Preview, QR Check-in, Leave Request Form
- **Workflow Diagrams:** QR Check-in flow, Leave Request flow, Shift Change flow, Payroll Calculation flow
