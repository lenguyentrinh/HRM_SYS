import { Outlet } from 'react-router-dom'
import { AdminSidebar } from '../components/AdminSidebar'
import { AdminTopbar } from '../components/AdminTopbar'
import { BranchSelectOverlay } from '@/components/admin/BranchSelectOverlay'
import { useAuthStore } from '@/stores/authStore'

export function AdminLayout() {
  const user = useAuthStore((s) => s.user)
  const activeBranchId = useAuthStore((s) => s.activeBranchId)
  const needsBranchSelect = user?.role === 'super_admin' && !activeBranchId

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      {needsBranchSelect && <BranchSelectOverlay />}
    </div>
  )
}
