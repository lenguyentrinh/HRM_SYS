import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, Bell, Building2, ChevronDown, Check } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useBranches } from '@/features/branches/hooks/useBranches'

function BranchSwitcher() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId)
  const setActiveBranchId = useAuthStore((s) => s.setActiveBranchId)
  const { data: branches = [] } = useBranches()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const activeBranch = branches.find((b) => b.id === activeBranchId)
  const activeBranches = branches.filter((b) => b.is_active)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-8 px-3 rounded-md text-sm text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
      >
        <Building2 className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
        <span className="truncate max-w-36">{activeBranch?.name ?? 'Select branch'}</span>
        <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-10 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-2 z-50">
          <div className="px-4 py-1.5 text-xs text-slate-400 font-medium">Switch branch</div>
          <div className="border-t border-slate-100 my-1" />
          {activeBranches.map((branch) => (
            <button
              key={branch.id}
              onClick={() => { setActiveBranchId(branch.id); setOpen(false) }}
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span className="truncate">{branch.name}</span>
              {branch.id === activeBranchId && <Check className="h-3.5 w-3.5 text-orange-500 flex-shrink-0 ml-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function AdminTopbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isSuperAdmin = user?.role === 'super_admin'

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

  const roleLabel = isSuperAdmin ? 'Super Admin' : 'Manager'

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center px-6 gap-3 shrink-0">
      {isSuperAdmin ? (
        <div className="flex-1 flex items-center">
          <BranchSwitcher />
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors relative">
        <Bell className="h-[18px] w-[18px] text-slate-500" />
        <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full" />
      </button>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-9 h-9 rounded-full overflow-hidden border-2 border-slate-200 hover:border-orange-500 transition-colors flex items-center justify-center bg-slate-50"
        >
          <User className="h-4 w-4 text-slate-500" />
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 top-11 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-2 z-50">
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900">{user?.phone}</p>
              <p className="text-xs text-slate-500">{roleLabel}</p>
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
    </header>
  )
}
