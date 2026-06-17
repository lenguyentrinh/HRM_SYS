import { createBrowserRouter } from 'react-router-dom'
import { RouteGuard, PublicOnlyRoute } from './features/auth/components/RouteGuard'
import { AdminLayout } from './features/admin/layouts/AdminLayout'
import { EmployeeLayout } from './features/employee/layouts/EmployeeLayout'
import { LoginPage } from './features/auth/pages/LoginPage'
import { SignUpPage } from './features/auth/pages/SignUpPage'
import { DashboardPage } from './features/admin/pages/DashboardPage'
import { EmployeeListPage } from './features/employees/pages/EmployeeListPage'
import { EmployeeDetailPage } from './features/employees/pages/EmployeeDetailPage'
import { ShiftListPage } from './features/shifts/pages/ShiftListPage'
import { TabletQrPage } from './features/tablet/pages/TabletQrPage'
import { CheckinPage } from './features/checkin/pages/CheckinPage'
import { RosterPage } from './features/roster/pages/RosterPage'
import { ShiftChangeListPage } from './features/shift-changes/pages/ShiftChangeListPage'
import { AttendanceListPage } from './features/attendance/pages/AttendanceListPage'
import { MyAttendancePage } from './features/attendance/pages/MyAttendancePage'

function Placeholder({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
      {title} — Coming Soon
    </div>
  )
}

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignUpPage /> },
    ],
  },
  // Public tablet route
  {
    path: '/tablet/:branch_id',
    element: <TabletQrPage />,
  },
  {
    element: <RouteGuard allowedRoles={['super_admin', 'manager']} />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'employees', element: <EmployeeListPage /> },
          { path: 'employees/:id', element: <EmployeeDetailPage /> },
          { path: 'shifts', element: <ShiftListPage /> },
          { path: 'attendance', element: <AttendanceListPage /> },
          { path: 'leaves', element: <Placeholder title="Leave Management" /> },
          { path: 'shift-changes', element: <ShiftChangeListPage /> },
          { path: 'payroll', element: <Placeholder title="Payroll" /> },
          { path: 'analytics', element: <Placeholder title="Reports & Analytics" /> },
          { path: 'settings', element: <Placeholder title="System Settings" /> },
          { path: 'roster', element: <RosterPage /> },
          { path: 'audit', element: <Placeholder title="Audit Logs" /> },
          { path: 'branches', element: <Placeholder title="Branch Management" /> },
        ],
      },
    ],
  },
  {
    element: <RouteGuard allowedRoles={['employee']} />,
    children: [
      {
        element: <EmployeeLayout />,
        children: [
          { index: true, element: <Placeholder title="Home" /> },
          { path: 'checkin', element: <CheckinPage /> },
          { path: 'attendance', element: <MyAttendancePage /> },
          { path: 'leave', element: <Placeholder title="Leave Requests" /> },
          { path: 'shift-change', element: <Placeholder title="Shift Change" /> },
          { path: 'salary', element: <Placeholder title="Salary Details" /> },
          { path: 'profile', element: <Placeholder title="Profile" /> },
        ],
      },
    ],
  },
  { path: '*', element: <Placeholder title="404 — Page Not Found" /> },
])
