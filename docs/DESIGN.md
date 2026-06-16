# DESIGN.md – Design System & Wireframes

## Design Philosophy

**Admin Portal** — Desktop-first, data-dense, management tool:
- Fixed sidebar navigation, lots of info on one screen
- Data tables are the primary component — must be scannable
- Colors used to convey status (green/yellow/red), not for decoration

**Employee Portal** — Mobile-first, simple, quick to use:
- Employees open the app mainly for: check-in, view salary, submit requests
- Each task no more than 3 steps
- Bottom navigation, no sidebar

**Primary color — Orange:**
Orange was chosen because it conveys energy, suitable for a not-too-formal business environment. Orange tones on a dark slate background (sidebar) create clear contrast without causing eye fatigue during extended daily use.

---

## Color Palette

### Primary – Orange
| Token | Hex | Tailwind | Used for |
|---|---|---|---|
| primary-50 | `#fff7ed` | `orange-50` | Light background, hover state |
| primary-100 | `#ffedd5` | `orange-100` | Badge background, tag, section highlight |
| primary-200 | `#fed7aa` | `orange-200` | Avatar background, light chart bar |
| primary-400 | `#fb923c` | `orange-400` | Icon accent |
| **primary-500** | **`#f97316`** | **`orange-500`** | **Primary button, active nav, main link** |
| primary-600 | `#ea580c` | `orange-600` | Button hover, badge text on light bg |
| primary-700 | `#c2410c` | `orange-700` | Dark text on orange-100 bg |
| primary-800 | `#9a3412` | `orange-800` | Bold heading accent |

### Neutral – Slate
| Token | Hex | Tailwind | Used for |
|---|---|---|---|
| slate-900 | `#0f172a` | `slate-900` | Sidebar background, topbar |
| slate-800 | `#1e293b` | `slate-800` | Dark card header, modal overlay |
| slate-600 | `#475569` | `slate-600` | Main body text |
| slate-500 | `#64748b` | `slate-500` | Sub text, placeholder, icon |
| slate-300 | `#cbd5e1` | `slate-300` | Input border, light divider |
| slate-200 | `#e2e8f0` | `slate-200` | Table border, card divider |
| slate-100 | `#f1f5f9` | `slate-100` | Page background |
| slate-50  | `#f8fafc` | `slate-50`  | Card background, table row hover |

### Semantic Colors — attendance & request statuses
| Status | Background | Text | Tailwind classes |
|---|---|---|---|
| On time / Approved / Active | `#dcfce7` | `#16a34a` | `bg-green-100 text-green-700` |
| Late / Pending / Warning | `#fef9c3` | `#ca8a04` | `bg-yellow-100 text-yellow-700` |
| Absent / Rejected / Error | `#fee2e2` | `#dc2626` | `bg-red-100 text-red-700` |
| On leave / Info | `#ffedd5` | `#ea580c` | `bg-orange-100 text-orange-700` |
| Parttime / Neutral | `#f1f5f9` | `#64748b` | `bg-slate-100 text-slate-500` |
| Holiday | `#ede9fe` | `#7c3aed` | `bg-violet-100 text-violet-700` |

---

## Typography

**Font:** Inter — import from Google Fonts: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap')`

| Use | Weight | Size | Tailwind |
|---|---|---|---|
| Page title (H1) | 800 | 24px | `text-2xl font-extrabold` |
| Section title (H2) | 700 | 18px | `text-lg font-bold` |
| Card title | 700 | 14px | `text-sm font-bold` |
| Body text | 400 | 14px | `text-sm` |
| Sub text / hint | 400 | 12px | `text-xs text-slate-500` |
| Table header | 600 | 11px uppercase | `text-xs font-semibold uppercase tracking-wide` |
| Badge label | 600 | 10px | `text-[10px] font-semibold` |
| Large amount (salary) | 800 | 22–28px | `text-2xl font-extrabold` |
| Code / employee ID | 500 monospace | 12px | `font-mono text-xs` |

---

## Spacing & Layout

| Property | Value | Tailwind |
|---|---|---|
| Sidebar width | 200px | `w-[200px]` |
| Topbar height | 56px | `h-14` |
| Page padding | 24px | `p-6` |
| Card padding | 16px | `p-4` |
| Card border radius | 8px | `rounded-lg` |
| Card shadow | sm | `shadow-sm` |
| Gap between cards | 16px | `gap-4` |
| Table row min-height | 44px | — |
| Button border radius | 6px | `rounded-md` |
| Input border radius | 6px | `rounded-md` |
| Bottom nav height | 64px | `h-16` |

### Responsive Strategy
| Breakpoint | Tailwind | Behavior |
|---|---|---|
| Mobile `< 640px` | default | Primary Employee portal layout. Admin portal hides sidebar, shows bottom nav only |
| Tablet `640–1024px` | `sm:` | Admin portal collapsed sidebar (icons only). Employee portal full |
| Desktop `> 1024px` | `lg:` | Admin portal full sidebar with text + icons |

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
│ [Icon] Employees │    <FilterBar />                          │
│ [Icon] Attendance│    <ActionButtons />                      │
│ [Icon] Leave    │  </div>                                   │
│ [Icon] Salary   │  <DataTable /> or <CardGrid />            │
│ ─────────────── │                                            │
│ [Icon] Analytics│                                            │
│ [Icon] Settings │                                            │
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

**Bottom Nav items:** Home (`/`), Check-in (`/checkin`), Leave (`/leaves`), Profile (`/profile`)

---

## Component Patterns

### Buttons
```tsx
// Primary — main page action
<Button className="bg-orange-500 hover:bg-orange-600 text-white">
  + Add employee
</Button>

// Secondary — secondary action
<Button variant="outline" className="border-slate-300">
  Export Excel
</Button>

// Danger — irreversible action
<Button className="bg-red-600 hover:bg-red-700 text-white">
  Reject
</Button>

// Success — confirm / approve
<Button className="bg-green-600 hover:bg-green-700 text-white">
  ✓ Approve
</Button>

// Ghost icon — edit, delete in table row
<Button variant="ghost" size="icon" className="h-8 w-8">
  <PencilIcon className="h-4 w-4" />
</Button>
```

### Status Badges — consistent across the app
```tsx
// Attendance status
<Badge className="bg-green-100 text-green-700">On time</Badge>
<Badge className="bg-yellow-100 text-yellow-700">Late 8'</Badge>
<Badge className="bg-red-100 text-red-700">Absent</Badge>
<Badge className="bg-orange-100 text-orange-700">On leave</Badge>
<Badge className="bg-violet-100 text-violet-700">Holiday</Badge>

// Request status
<Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
<Badge className="bg-green-100 text-green-700">Approved</Badge>
<Badge className="bg-red-100 text-red-700">Rejected</Badge>

// Employee type
<Badge className="bg-orange-100 text-orange-700">Fulltime</Badge>
<Badge className="bg-slate-100 text-slate-600">Parttime</Badge>

// Employee status
<Badge className="bg-green-100 text-green-700">Active</Badge>
<Badge className="bg-yellow-100 text-yellow-700">Probation</Badge>
<Badge className="bg-slate-100 text-slate-500">Inactive</Badge>
```

### Data Tables
```tsx
// Standard structure — using shadcn Table
<div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
  <Table>
    <TableHeader className="bg-slate-50">
      <TableRow>
        <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Employee
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

**Required states:**
- **Loading:** Skeleton rows (using `shadcn/ui Skeleton`)
- **Empty:** Icon + message "No data" + action if applicable
- **Error:** Red alert with error message

### Forms & Inputs
```tsx
// Label + Input pattern
<div className="space-y-1.5">
  <Label className="text-xs font-medium text-slate-600">
    Full name <span className="text-red-500">*</span>
  </Label>
  <Input
    className="border-slate-300 focus:border-orange-500 focus:ring-orange-500/20"
    placeholder="Nguyen Van A"
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
// Gradient card highlighted on dashboard
<div className="rounded-xl p-5 text-white"
  style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}>
  <div className="text-xs opacity-80 uppercase tracking-wide mb-1">
    Estimated salary for {month}
  </div>
  <div className="text-3xl font-black mb-2">
    {formatCurrency(estimatedSalary)}
  </div>
  <div className="text-xs opacity-80">
    Updated to {formatDate(today)} · {actualDays}/{standardDays} days
  </div>
</div>
```

### Page Header (Admin Portal)
```tsx
// Placed at the top of each page
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-2xl font-extrabold text-slate-900">Employee Management</h1>
    <p className="text-sm text-slate-500 mt-0.5">48 employees in the system</p>
  </div>
  <div className="flex gap-2">
    <Button variant="outline">📤 Export</Button>
    <Button className="bg-orange-500 ...">+ Add</Button>
  </div>
</div>
```

---

## UX Patterns

### Loading States
- **First page load:** Full-page skeleton (no spinner)
- **Refetch after action:** Keep old content + small loading indicator in corner
- **Button submit:** Disable + spinner icon inside button, do not disable entire form

### Empty States
```tsx
// When there is no data
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="text-4xl mb-3">📋</div>
  <div className="text-sm font-medium text-slate-700">No data yet</div>
  <div className="text-xs text-slate-500 mt-1">Add employees to get started</div>
  <Button className="mt-4 bg-orange-500 ...">+ Add now</Button>
</div>
```

### Error States
```tsx
// Failed query
<Alert variant="destructive" className="m-4">
  <AlertTitle>Unable to load data</AlertTitle>
  <AlertDescription>
    {error.message} · <Button variant="link" onClick={refetch}>Retry</Button>
  </AlertDescription>
</Alert>
```

### Toast Notifications
- **Success:** `toast.success("Leave request approved")` — green, auto-dismiss after 3s
- **Error:** `toast.error("Cannot connect to server")` — red, auto-dismiss after 5s
- **Info:** `toast("QR code has been refreshed")` — default, auto-dismiss after 3s

### Confirmation Dialogs
Used for irreversible actions (delete employee, reject request, confirm payroll):
```tsx
<AlertDialog>
  <AlertDialogTrigger>...</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>Confirm payroll for May?</AlertDialogTitle>
    <AlertDialogDescription>
      This action will lock the payroll and cannot be auto-recalculated.
    </AlertDialogDescription>
    <AlertDialogCancel>Cancel</AlertDialogCancel>
    <AlertDialogAction className="bg-orange-500">Confirm</AlertDialogAction>
  </AlertDialogContent>
</AlertDialog>
```

---

## Icons

Use **Lucide React** (integrated in shadcn/ui). Default size: `h-4 w-4`. In nav sidebar: `h-5 w-5`.

| Module | Icon |
|---|---|
| Dashboard | `LayoutDashboard` |
| Employees | `Users` |
| Attendance | `Clock` |
| Leave | `CalendarOff` |
| Salary | `Wallet` |
| Settings | `Settings` |
| Analytics | `BarChart2` |
| Notifications | `Bell` |
| QR Code | `QrCode` |
| Check-in | `LogIn` |
| Check-out | `LogOut` |
| Approve | `CheckCircle` |
| Reject | `XCircle` |
| Export | `Download` |
| Import | `Upload` |
| Add | `Plus` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| Search | `Search` |
| Filter | `Filter` |
| Shift change | `ArrowLeftRight` |
| Calendar | `Calendar` |
| Roster | `CalendarDays` |
| Bonus/Penalty | `TrendingUp` |

---

## Wireframes

See file [`proposal.html`](../proposal.html) for interactive wireframes of all screens and workflow diagrams.

Wireframes include:
- **Admin Portal:** Dashboard, Employee List, Employee Detail (tabs), Attendance, Leave Management, Payroll, Settings
- **Employee Portal:** Dashboard + Salary Preview, QR Check-in, Leave Request Form
- **Workflow Diagrams:** QR Check-in flow, Leave Request flow, Shift Change flow, Payroll Calculation flow
