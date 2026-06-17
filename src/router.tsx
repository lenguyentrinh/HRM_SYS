import { createBrowserRouter } from 'react-router-dom'
import { RouteGuard, PublicOnlyRoute } from './features/auth/components/RouteGuard'
import { AdminLayout } from './features/admin/layouts/AdminLayout'
import { EmployeeLayout } from './features/employee/layouts/EmployeeLayout'
import { LoginPage } from './features/auth/pages/LoginPage'
import { SignUpPage } from './features/auth/pages/SignUpPage'
import { DashboardPage } from './features/admin/pages/DashboardPage'

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
    element: <Placeholder title="Tablet QR" />,
  },
  {
    element: <RouteGuard allowedRoles={['super_admin', 'manager']} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'employees', element: <Placeholder title="Quản lý nhân viên" /> },
          { path: 'employees/:id', element: <Placeholder title="Chi tiết nhân viên" /> },
          { path: 'shifts', element: <Placeholder title="Quản lý ca làm việc" /> },
          { path: 'attendance', element: <Placeholder title="Bảng chấm công" /> },
          { path: 'leaves', element: <Placeholder title="Quản lý nghỉ phép" /> },
          { path: 'shift-changes', element: <Placeholder title="Yêu cầu đổi ca" /> },
          { path: 'payroll', element: <Placeholder title="Bảng lương" /> },
          { path: 'analytics', element: <Placeholder title="Báo cáo thống kê" /> },
          { path: 'settings', element: <Placeholder title="Cài đặt hệ thống" /> },
          { path: 'roster', element: <Placeholder title="Xếp lịch ca" /> },
          { path: 'audit', element: <Placeholder title="Nhật ký hệ thống" /> },
          { path: 'branches', element: <Placeholder title="Quản lý chi nhánh" /> },
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
          { index: true, element: <Placeholder title="Trang chủ" /> },
          { path: 'checkin', element: <Placeholder title="Chấm công QR" /> },
          { path: 'attendance', element: <Placeholder title="Lịch sử chấm công" /> },
          { path: 'leave', element: <Placeholder title="Đơn nghỉ phép" /> },
          { path: 'shift-change', element: <Placeholder title="Yêu cầu đổi ca" /> },
          { path: 'salary', element: <Placeholder title="Chi tiết lương" /> },
          { path: 'profile', element: <Placeholder title="Thông tin cá nhân" /> },
        ],
      },
    ],
  },
  { path: '*', element: <Placeholder title="404 — Page Not Found" /> },
])
