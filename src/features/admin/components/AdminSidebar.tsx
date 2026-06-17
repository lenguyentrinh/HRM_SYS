import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Clock, CalendarDays, Calendar, RefreshCw,
  FileText, DollarSign, BarChart3, ClipboardList, Settings, Tablet, Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/employees', label: 'Employees', icon: Users },
  { to: '/admin/attendance', label: 'Attendance', icon: Clock },
  { to: '/admin/roster', label: 'Schedule', icon: CalendarDays },
  { to: '/admin/leaves', label: 'Leave', icon: Calendar },
  { to: '/admin/shift-changes', label: 'Shift Change', icon: RefreshCw },
  { to: '/admin/shifts', label: 'Shift Config', icon: FileText },
  { to: '/admin/payroll', label: 'Payroll', icon: DollarSign },
  { to: '/admin/analytics', label: 'Reports', icon: BarChart3 },
  { to: '/admin/audit', label: 'Audit Log', icon: ClipboardList },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminSidebar() {
  const user = useAuthStore((s) => s.user)
  const activeBranchId = useAuthStore((s) => s.activeBranchId)
  const isSuperAdmin = user?.role === 'super_admin'

  return (
    <aside className="w-[200px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-xs font-bold text-white">H</span>
          </div>
          <span className="font-semibold text-slate-900">HRM Admin</span>
        </div>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {isSuperAdmin && (
          <>
            <NavLink
              to="/admin/branches"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-orange-50 text-orange-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )
              }
            >
              <Building2 className="h-4 w-4 flex-shrink-0" />
              Branches
            </NavLink>
            <div className="my-1 mx-3 border-t border-slate-100" />
          </>
        )}

        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-orange-50 text-orange-600 font-medium'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {activeBranchId && (
        <div className="px-2 py-3 border-t border-slate-100">
          <a
            href={`/tablet/${activeBranchId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <Tablet className="h-4 w-4 flex-shrink-0" />
            Tablet View
          </a>
        </div>
      )}
    </aside>
  )
}
