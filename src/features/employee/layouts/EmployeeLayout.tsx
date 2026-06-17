import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, Clock, FileText, DollarSign, UserCircle, Bell, User, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

const bottomNav = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/attendance', label: 'Check-in', icon: Clock },
  { to: '/leave', label: 'Requests', icon: FileText },
  { to: '/salary', label: 'Salary', icon: DollarSign },
  { to: '/profile', label: 'Account', icon: UserCircle },
]

const leaveGroupRoutes = ['/leave', '/shift-change']

export function EmployeeLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = () => {
    setDropdownOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 max-w-md mx-auto relative">
      <header className="sticky top-0 z-10 h-12 bg-white border-b border-slate-200 flex items-center justify-end gap-2 px-4">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors border border-slate-200"
          >
            <User className="h-4 w-4 text-slate-500" />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-10 w-48 bg-white rounded-xl border border-slate-200 shadow-lg py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs text-slate-500">{user?.phone}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
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
