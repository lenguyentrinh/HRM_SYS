# HRM System — Full Layout Descriptions for Google Stitch

> Copy each section into https://stitch.with.google.com/ to generate layouts.
> Arranged by EFC Phase ordering.

---

# Epic 1: Foundation — Init & Auth

---

## 1. Login Page

Page: Login
Type: Centered card, public (no auth)

Full screen centered on a gradient background (orange-50 to slate-100). Max-width 400px card with:
- Logo area: Orange rounded square with white "H" letter, centered
- Title: "HRM System"
- Subtitle: "Human Resource Management"
- Card with:
  - Title: "Sign in"
  - Description: "Enter your phone number and password"
  - Phone input: type="tel", placeholder "0901234567"
  - Password input: with eye toggle icon button (show/hide)
  - Submit button: full-width, "Sign in", with loading spinner state
- Error messages shown inline below each field (red text)
- Toast errors for invalid credentials (sonner toast top-right)

---

## 2. Sign Up Page (Self-Registration)

Page: /signup
Type: Centered card, public (no auth)
Trigger: "Sign in" link on bottom of signup card

Full screen centered on a gradient background (orange-50 to slate-100). Max-width 400px card.

**Branding (same as Login):**
- Orange rounded square with white "H" letter, centered
- Title: "HRM System"
- Subtitle: "Human Resource Management"

**Card:**
- Title: "Create your account"

**Form fields:**
1. **Full Name** — label "Full Name", text input, required
2. **Phone Number** — label "Phone Number", type="tel", required
3. **Password** — id="password", with eye toggle (show/hide), required, min 6 chars
4. **Confirm Password** — id="confirmPassword", with eye toggle, required, must match password
5. **Branch** — label "Branch", Radix Select trigger with placeholder "Select your branch", shows dropdown of branch options
6. **Submit button** — full-width, "Create account", enabled initially, disabled while submitting

**Validation errors (inline red text):**
- "Passwords do not match" — when confirm password !== password
- "Password must be at least 6 characters" — when password < 6 chars
- "Please select a branch" — when submit without selecting branch

**Post-submission:**
- Button disabled with spinner while loading
- Duplicate phone: inline error "Phone number already registered"
- Success: toast + redirect to /login

**Navigation:**
- Footer link "Sign in" → href="/login"

---

## 3. Admin Layout (Persistent Shell)

Layout: Fixed sidebar + topbar + scrollable content
Type: App shell, role-gated (super_admin, manager)

**Sidebar (fixed, 200px width):**
- Top: Logo "H" icon + "HRM Admin" label, bottom border
- Super Admin section (conditionally visible):
  - "Branches" nav link with Building2 icon
  - Divider
- Navigation items (each with icon):
  1. Overview (LayoutDashboard) → /admin
  2. Employees (Users) → /admin/employees
  3. Attendance (Clock) → /admin/attendance
  4. Roster (CalendarDays) → /admin/roster
  5. Leaves (Calendar) → /admin/leaves
  6. Shift Changes (RefreshCw) → /admin/shift-changes
  7. Shifts (FileText) → /admin/shifts
  8. Payroll (DollarSign) → /admin/payroll
  9. Reports (BarChart3) → /admin/analytics
  10. Audit Log (ClipboardList) → /admin/audit
  11. Settings (Settings) → /admin/settings
- Bottom: "Tablet Screen" link (Tablet icon), shown when branch selected
- Active nav highlighted with orange-50 background + orange text

**Topbar (sticky, 56px height):**
- Left: Branch switcher dropdown (only for super_admin) with Building2 icon + chevron
- Right: NotificationBell component + User dropdown (avatar circle, name, role, logout)

**Main Content Area:**
- Scrollable, padding 24px, outlet for nested routes
- PageHeader component at top of each page (title, description, action buttons)

---

## 4. Employee Layout (Mobile-First Shell)

Layout: Mobile max-width 425px, centered, bottom navigation
Type: App shell, role-gated (employee)

**Header (sticky, 48px height):**
- Right-aligned: NotificationBell component
- White background, bottom border

**Main Content Area:**
- Scrollable, flex-1, bottom padding 80px (for nav bar)
- Outlet for nested routes

**Bottom Navigation (fixed bottom, max-width 425px):**
5 tabs, each with icon + label:
1. Home (Home icon) → /
2. Attendance (Clock icon) → /attendance
3. Requests (FileText icon) → /leave (also highlights for /shift-change)
4. Salary (DollarSign icon) → /salary
5. Account (UserCircle icon) → /profile
- Active tab: orange-500 text
- Inactive: slate-500 text
- White background, top border

---

## 5. Admin — Employee List Page

Route: /admin/employees
Layout: Page header + filters + table + pagination

**PageHeader:** "Employees", description shows total count (e.g. "42 employees"), actions:
- "Import CSV" button (Upload icon)
- "Export CSV" button (Download icon)
- "Add Employee" button (Plus icon) — opens Add Dialog

**Filters bar:**
- Search input with Search icon left, placeholder "Search by name...", debounced 300ms
- Status dropdown: All / Active / Inactive / Terminated
- Type dropdown: All / Full-time / Part-time

**Table (white card, rounded border):**
Columns: Employee Code (mono font) | Full Name | Department · Position | Type (full-time/part-time) | Base Salary | Join Date | Status (badge)
- Each row clickable → /admin/employees/:id
- Empty state: "No employees yet" with "Add Employee" CTA
- Loading state: TableSkeleton with 8 rows × 6 columns

**Pagination:** Page X of Y, Previous/Next buttons

**Add Employee Dialog:** Max-width 600px, contains EmployeeForm component
**Import CSV Dialog:** Contains BulkImportDialog component

---

## 6. Admin — Employee Detail Page

Route: /admin/employees/:id
Layout: Back button + tabs-based profile page

**Top:** Back arrow "← Employees" button, employee name + edit button + employee code

**Tabs:**
1. **Personal Info** — EmployeeForm (editable): full_name, employee_code, type (fulltime/parttime), department, position, base_salary, allowance, join_date, status. Reset password button + Link to account dialog.

2. **Attendance** — Month selector, summary (present/late/absent counts), attendance table (date, shift, check-in, check-out, total hours, status, late badge)

3. **Leave Balance** — Year selector, current balance (paid used/remaining, unpaid used), edit balance dialog, leave history table

4. **Shift** — Current month assignments, shift selector per day, bulk assign

5. **Payroll History** — Month selector, payroll table (month, gross, net, status [draft/confirmed]), click to expand details

6. **Bonuses** — Month selector, add bonus/penalty form (type [bonus/penalty], amount, reason), list with delete

7. **OT Settings** — OT multiplier override toggle + input

---

## 7. Admin — Shift List Page

Route: /admin/shifts
Layout: Header + table + CRUD dialogs

**PageHeader:** "Shifts", description shows count, action: "Create Shift" button

**Table:** Name | Start Time | End Time | Grace Period (minutes) | Status (active/paused) | Actions (edit pencil, delete trash icons)
- Overnight shifts get "Overnight" badge

**Create/Edit Dialog:** ShiftForm with fields: name, start_time, end_time, grace_period_minutes, is_overnight toggle, is_active toggle
**Delete Dialog:** ConfirmDialog with destructive variant

---

## 8. Admin — Branches Page

Route: /admin/branches (super_admin only)
Layout: Header + table + create dialog

**PageHeader:** "Branch Management", action: "Add Branch" button

**Table:** Branch Name (with "Viewing" badge if currently selected) | Address | Phone | Status (active/inactive badge) | Actions:
- "Select" button (to switch active branch)
- Toggle active/inactive button

**Create Dialog:** Name (required), Address, Phone inputs with create/cancel

---

## 9. Employee — Profile Page

Route: /profile
Layout: Mobile vertical list

**Title:** "Account"

**User Info Card:**
- Avatar circle (orange background with User icon)
- Full name
- Employee code (mono font, gray)
- Phone number

**Change Password Card:**
- Key icon + "Change Password" title
- Current password input (with eye toggle)
- New password input (with eye toggle)
- Confirm new password input
- "Change Password" button (full-width)

**Logout Button:**
- Red outline button full-width
- LogOut icon + "Sign Out"

---

# Epic 2: Attendance — QR & Check-in

---

## 10. Admin — Roster Page

Route: /admin/roster
Layout: Month calendar view of shift assignments

**PageHeader:** "Schedule", month/year picker

**Content:** Calendar grid or list view showing which employees are assigned to which shifts on which days.

---

## 11. Public — Tablet QR Display Page

Route: /tablet/:branch_id
Layout: Full-screen kiosk mode, dark theme (bg-slate-900)
Access: Public (no auth), no sidebar/nav, auto-refresh

**Description:** Large-screen display at office entrance showing current shift QR code for employees to scan. Auto-refreshes every 60 seconds.

**Clock & Date:**
- Large digital clock (HH:mm:ss), font-black, centered
- Date below (e.g. "Monday, 17/06/2026") in slate-400

**Shift Dropdown** (shown when 2+ shifts overlap):
- Custom dark dropdown with shift name + time range
- Chevron icon with rotate animation
- Check icon on selected option
- Auto-selects the most recently started shift

**QR Code Display** (when shift is active with token):
- Shift name (large bold)
- Shift time range
- Large QR code (260px) on white background in rounded card with shadow
- "Scan to check in" text
- Token preview (first 8 chars)
- Expiry time + countdown timer

**No QR Yet** (shift active but no token generated):
- Shift name
- "No QR code for this shift yet"
- "Reload" link

**No Active Shift:**
- "No shift currently in progress" message
- Next upcoming shift info if available
- "System will auto-update when a shift starts" message

**Error State:**
- Dark red error banner with error message
- "Retry" link

**States:** Loading (spinner), error (red banner), active QR, no QR, no shift

---

## 12. Employee — QR Check-in Page

Route: /checkin
Layout: Mobile, single-purpose scanner + manual input

**Title:** "QR Attendance"

**Check-in Type Toggle:** Segmented control (check-in / check-out), orange active state

**Idle State:**
- "Scan QR Code" button (Camera icon, full-width)
- OR "Enter code manually" — text input + "Confirm" button
- Hidden file input for camera fallback (iOS Chrome)

**Scanning State:**
- Video preview (full-width rounded)
- "Point QR code at camera" text
- "Cancel" button

**Confirming State:**
- QR code icon + token display
- "Confirm Check-in/out" button
- "Cancel" button

**Success State:**
- Large green checkmark
- "Success!" + result message
- "Done" button → navigate to history

**Error State:**
- Large red X
- "Failed" + error message
- "Retry" button

---

## 13. Admin — Attendance Page

Route: /admin/attendance
Layout: Date picker + summary cards + filters + table

**PageHeader:** "Attendance", description shows selected date, actions:
- "Export CSV" button (conditional on data)
- "Manual Check-in" button (PenLine icon)

**Summary Cards (3-column grid):**
- Present (green count)
- Late (yellow count)
- Absent (red count)

**Filters bar:**
- Date input (type="date")
- Shift dropdown (All / specific shifts)
- Status dropdown: All / Present / Late / Absent / Leave / Holiday

**Table:** Employee (name + code) | Shift | Check-in time (with late minutes) | Check-out time | Total Hours (with OT) | Status (badge) | Notes

**Manual Check-in Dialog:** Select employee + shift + type (check-in/check-out) + timestamp

---

## 14. Employee — Attendance History

Route: /attendance
Layout: Mobile with month picker + summary + table

**Header:** "Attendance History" + month selector dropdown (last 6 months)

**Summary Cards (2-column grid):**
- Working days (green, large number)
- Late count (yellow, large number)

**Table:** Date | Shift name | Time range (HH:mm–HH:mm) + total hours | Status badge (present/late/absent/leave) + late minutes note

---

## 15. Admin — Shift Change Requests Page

Route: /admin/shift-changes
Layout: Similar to Leave management — table with approve/reject

**PageHeader:** "Shift Change Requests", pending count

**Filters:** Status dropdown

**Table:** Employee | Current Shift | Requested Shift | Date | Reason | Status | Actions (Approve/Reject)

**Approve/Reject Dialogs:** Similar pattern to leave management

---

## 16. Employee — Shift Change Request Page

Route: /shift-change
Layout: Mobile form + request history

**Request Form:** Select date, current shift (auto), desired shift, reason
**Request History:** List of submitted shift change requests with status

---

# Epic 3: Leave, Payroll & Notifications

---

## 17. Admin — Settings Page

Route: /admin/settings (super_admin only)
Layout: Tabs-based settings with forms

**PageHeader:** "Settings", description "System configuration — Super Admin only"

**Tabs (tab bar):**
1. **Payroll Config** — Multiple card sections:
   - Basic: standard working days/month, effective from date
   - OT Multipliers: weekday, weekend, holiday (3-column grid)
   - Bonus/Penalty: late penalty per minute, absent penalty per day, attendance bonus amount, bonus condition (max lates)
   - BHXH: employee rate, employer rate (with example "0.08 = 8%")
   - Save button

2. **Allowance** — Default allowance by type:
   - Full-time monthly amount
   - Part-time monthly amount
   - Note about per-employee overrides

3. **Leave Policy** — Per employee type:
   - Full-time: paid days/year, carry-over toggle, max carry-over days, min advance notice
   - Part-time: same fields
   - Save per form

4. **Holidays** — Year selector, add form (date + name + Add button), list with delete

5. **Account Settings** — Default employee password input with description

---

## 18. Admin — Leave Management Page

Route: /admin/leaves
Layout: Filters + table with approve/reject actions

**PageHeader:** "Leave Requests", description shows pending count, action: "Export CSV" button

**Filter:** Status dropdown: All / Pending / Approved / Rejected

**Table:** Employee (name + code) | Leave Type (paid/unpaid/sick/other) | From | To | Days | Reason | Status (badge) | Actions
- Pending rows: "Approve" (green button) + "Reject" (red outline button)
- Approved/Rejected: show review timestamp

**Approve Dialog:** ConfirmDialog with warning about auto-updating attendance
**Reject Dialog:** Input for rejection reason + confirm buttons

---

## 19. Employee — Leave Page

Route: /leave
Layout: Mobile with sub-tab navigation + request list + create dialog

**Sub-tabs (segmented control):**
- "Leave Request" (active, orange)
- "Shift Change" → navigates to /shift-change

**Header:** "Leave Requests" with remaining paid days count + "Submit" button (Plus icon)

**Request List (vertical cards):**
Each card: Leave type + days count | Date range | Reason | Rejection reason (if rejected, red) | Status badge | Created timestamp
- Empty state: "No leave requests yet"

**Create Dialog:** Form with:
- Leave type dropdown (paid/unpaid/sick/other)
- From/To date inputs (min = today)
- Auto-calculated business days
- Warning if exceeding remaining balance
- Reason textarea (required)
- "Submit" button

---

## 20. Admin — Payroll Page

Route: /admin/payroll
Layout: Month picker + action buttons + salary table

**PageHeader:** "Payroll", description "Calculate and confirm monthly payroll", actions:
- "Export CSV" button
- "Confirm Payroll" button (green outline, shown when all records are draft)
- "Calculate Payroll" button (primary, disabled when all confirmed)

**Filter:** Month/Year dropdown (last 6 months) + total fund display

**Table:** Employee (name + code) | Working Days (actual/standard) | Base Salary | OT Pay | Bonus/Penalty | Gross | Net Salary (orange, bold) | Status (badge: Draft/Confirmed) | Edit button (pencil, only for draft)

**Adjust Dialog (for draft records):** Displays gross and BHXH deduction, input for tax amount + notes, shows real-time net calculation

**Confirm Dialog:** Warning that payroll will be locked and visible to employees

---

## 21. Employee — Salary Page

Route: /salary
Layout: Mobile with month pills + payroll breakdown

**Header:** "Salary"

**Month Pills:** Horizontal scrollable pill buttons for each confirmed month (active: orange filled, inactive: outline)

**Payroll Detail Card** (white rounded border):
Breakdown rows:
- Actual working days (X/Y)
- Salary by days
- Allowance
- OT pay
- Attendance bonus
- Late penalty (red, with − prefix)
- Absence penalty (red)
- Gross (bold)
- BHXH employee (red)
- Personal income tax (red, if any)
- Divider
- **Net salary** (orange, large bold)

- Notes at bottom if any

---

## 22. Admin — Dashboard Page

Route: /admin
Layout: Scrollable content with stats grid + charts + recent activity

**PageHeader:** "Overview", description shows current date (e.g. "Monday, 17/06/2026")

**Stat Cards (4-column grid):**
1. Employees — blue icon, count number, clickable → /admin/employees
2. Present Today — green icon, count number, clickable → /admin/attendance
3. Pending Leaves — yellow icon, count number, clickable → /admin/leaves
4. Pending Shift Changes — purple icon, count number, clickable → /admin/shift-changes

**Two-column grid below stats:**
- Column 1 (2/3 width): "7-day Attendance Chart" — bar chart with 7 bars, date labels below, orange bars
- Column 2 (1/3 width): "Needs Attention" panel:
  - Pending leave requests count
  - Pending shift change requests count
  - Employees without check-out today count

**Recent Attendance Table (below grid):**
- Header: "Today's Recent Attendance" + "View All" link
- Rows: employee name + shift name, check-in time + status badge (present/late)

---

## 23. Admin — Analytics / Reports Page

Route: /admin/analytics
Layout: Trend chart + fund overview + attendance ranking table

**PageHeader:** "Reports", description "Attendance and payroll statistics", action: "Export CSV" button

**Payroll Trend Chart (6-month):** SVG line chart with gradient area fill, orange line, data-point dots with value labels. Y-axis labels (0, 50%, 100%), X-axis month labels

**Month Selector:** Dropdown for analysis month

**Payroll Stats (3-column grid):**
- Total fund (orange, large)
- Average salary
- Number of employees paid

**Salary Breakdown (2-column card):**
- Left column: "Additions" — salary by days, OT, allowance, attendance bonus, special bonus
- Right column: "Deductions" — late penalty, absence penalty, BHXH (all in red)

**Attendance Ranking Table:** Rank # (gold/silver/bronze for top 3) | Employee | Working Days | Absent | Late (count) | Rate (progress bar + percentage) | Net Salary

---

## 24. Employee — Dashboard

Route: /
Layout: Mobile scrollable content

**Greeting:** "Hello 👋" + employee full name

**Today's Shift Card** (white rounded border):
- Clock icon in orange circle
- "Today's Shift" label
- Shift name + time range (e.g. "Morning 07:00–12:00")
- Right: Check-in time or "Not checked in"

**Salary Preview Card** (orange gradient background, white text):
- "Estimated salary for [month]" label
- Large net estimate amount
- Gross + OT info
- Working days count + "Updated to [date]" + remaining days

**Quick Actions (4-column grid):**
1. Check-in (QrCode icon, orange)
2. History (CalendarDays icon, blue)
3. Request Leave (FileText icon, green)
4. Shift Change (ArrowLeftRight icon, purple)

**Status Cards (vertical list):**
- Working days this month
- Pending requests count (orange if > 0)
- Attendance bonus (green card, if any)
- Deductions (red card, if any)

---

# Epic 4: Refactor, Fix & Polish

---

## 25. Admin — Audit Log Page

Route: /admin/audit
Layout: Filters + paginated table

**PageHeader:** "System Log", description "Track important operations"

**Filters bar:**
- Action dropdown: All / Leave Approved / Leave Rejected / Shift Change Approved / Shift Change Rejected / Payroll Confirmed / Employee Created / Employee Updated / Password Reset
- Date range: From date input — To date input
- "Clear Filters" button (shown when any filter active)

**Table:** Timestamp | User (phone + role) | Action (colored badge) | Details (JSON, truncated)
- Pagination at bottom: "Page X of Y · N records", Previous/Next
