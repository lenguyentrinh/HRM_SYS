import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/lib/auth'

const SESSION_TTL_MS = 12 * 60 * 60 * 1000

interface StoredSession {
  user: AuthUser
  activeBranchId: string | null
  expiresAt: number
}

interface AuthState {
  user: AuthUser | null
  activeBranchId: string | null
  isLoading: boolean
  setUser: (user: AuthUser | null) => void
  setActiveBranchId: (id: string | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
  checkExpiry: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      activeBranchId: null,
      isLoading: false,

      setUser: (user) => {
        const activeBranchId = user?.role !== 'super_admin' ? (user?.branch_id ?? null) : null
        set({ user, activeBranchId })
      },

      setActiveBranchId: (activeBranchId) => set({ activeBranchId }),

      setLoading: (isLoading) => set({ isLoading }),

      logout: () => set({ user: null, activeBranchId: null }),

      checkExpiry: () => {
        try {
          const raw = localStorage.getItem('hrm-auth')
          if (!raw) return
          const parsed = JSON.parse(raw) as { state?: { session?: StoredSession } }
          const session = parsed?.state?.session
          if (session && Date.now() > session.expiresAt) {
            get().logout()
          }
        } catch {
          get().logout()
        }
      },
    }),
    {
      name: 'hrm-auth',
      partialize: (state) => {
        if (!state.user) return { session: null }
        try {
          const raw = localStorage.getItem('hrm-auth')
          if (raw) {
            const parsed = JSON.parse(raw) as { state?: { session?: StoredSession } }
            const existing = parsed?.state?.session
            if (existing?.user?.id === state.user.id && existing.expiresAt > Date.now()) {
              return {
                session: {
                  user: state.user,
                  activeBranchId: state.activeBranchId,
                  expiresAt: existing.expiresAt,
                } satisfies StoredSession,
              }
            }
          }
        } catch {
          // fall through to create new session
        }
        return {
          session: {
            user: state.user,
            activeBranchId: state.activeBranchId,
            expiresAt: Date.now() + SESSION_TTL_MS,
          } satisfies StoredSession,
        }
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return
        try {
          const raw = localStorage.getItem('hrm-auth')
          if (!raw) return
          const parsed = JSON.parse(raw) as { state?: { session?: StoredSession } }
          const session = parsed?.state?.session
          if (!session || Date.now() > session.expiresAt) {
            state.user = null
            state.activeBranchId = null
          } else {
            state.user = session.user
            state.activeBranchId = session.activeBranchId ?? null
          }
        } catch {
          state.user = null
          state.activeBranchId = null
        }
      },
    }
  )
)
