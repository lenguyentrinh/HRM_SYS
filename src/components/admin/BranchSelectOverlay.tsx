import { useAuthStore } from '@/stores/authStore'
import { useBranches } from '@/features/branches/hooks/useBranches'
import { Building2 } from 'lucide-react'

export function BranchSelectOverlay() {
  const setActiveBranchId = useAuthStore((s) => s.setActiveBranchId)
  const { data: branches = [], isLoading } = useBranches()
  const activeBranches = branches.filter((b) => b.is_active)

  return (
    <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">H</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">HRM System</h1>
          <p className="text-slate-500 text-sm">Select a branch to start managing</p>
        </div>

        {isLoading ? (
          <div className="text-center text-slate-400 py-8">Loading...</div>
        ) : (
          <div className="space-y-2">
            {activeBranches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => setActiveBranchId(branch.id)}
                className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-orange-50 rounded-xl text-left transition-colors border border-slate-200 hover:border-orange-300 shadow-sm"
              >
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-slate-900 font-medium">{branch.name}</p>
                  <p className="text-xs text-slate-500">{branch.address || 'No address'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
