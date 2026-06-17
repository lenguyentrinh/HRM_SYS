import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home, Clock, FileText, DollarSign, UserCircle, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

const bottomNav = [
  { to: '/', label: 'Trang chủ', icon: Home, end: true },
  { to: '/attendance', label: 'Chấm công', icon: Clock },
  { to: '/leave', label: 'Yêu cầu', icon: FileText },
  { to: '/salary', label: 'Lương', icon: DollarSign },
  { to: '/profile', label: 'Tài khoản', icon: UserCircle },
]

const leaveGroupRoutes = ['/leave', '/shift-change']

export function EmployeeLayout() {
  const location = useLocation()

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 max-w-md mx-auto relative">
      <header className="sticky top-0 z-10 h-12 bg-white border-b border-slate-200 flex items-center justify-end px-4">
        <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors relative">
          <Bell className="h-[18px] w-[18px] text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </header>
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 flex z-10">
        {bottomNav.map(({ to, label, icon: Icon, end }) => {
          const isLeaveGroup = to === '/leave' && leaveGroupRoutes.includes(location.pathname)
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs transition-colors',
                  isActive || isLeaveGroup ? 'text-orange-500' : 'text-slate-500'
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
