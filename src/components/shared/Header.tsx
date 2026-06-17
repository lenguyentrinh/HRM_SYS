import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export function Header() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = () => {
    setDropdownOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const roleLabel = user?.role === 'super_admin'
    ? 'Super Admin'
    : user?.role === 'manager'
      ? 'Manager'
      : 'Employee'

  return (
    <header className="sticky top-0 w-full h-14 z-40 bg-[#f7f9fb] border-b border-[#e0c0b1] shadow-sm flex items-center justify-between px-4 md:px-10 shrink-0">
      <div className="flex items-center gap-4">
        <span className="text-lg font-extrabold text-[#9d4300] tracking-tight">HRM System</span>
      </div>

      <div className="flex items-center gap-2">
        <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#eceef0] transition-colors relative">
          <Bell className="h-[18px] w-[18px] text-[#515f74]" />
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-[#ba1a1a] rounded-full" />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#e0c0b1] hover:border-[#f97316] transition-colors flex items-center justify-center bg-[#eceef0]"
          >
            <User className="h-4 w-4 text-[#515f74]" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-11 w-56 bg-white rounded-xl border border-[#e0c0b1] shadow-lg py-2 z-50">
              <div className="px-4 py-2 border-b border-[#e0c0b1]/50">
                <p className="text-sm font-semibold text-[#191c1e]">{user?.phone}</p>
                <p className="text-xs text-[#515f74]">{roleLabel}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#191c1e] hover:bg-[#eceef0] transition-colors"
              >
                <LogOut className="h-4 w-4 text-[#515f74]" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
