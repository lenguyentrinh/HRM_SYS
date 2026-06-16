import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { AuthUser } from '@/lib/auth'

interface RouteGuardProps {
  allowedRoles: AuthUser['role'][]
}

export function RouteGuard({ allowedRoles }: RouteGuardProps) {
  const user = useAuthStore((s) => s.user)

  if (!user) return <Navigate to="/login" replace />

  if (!allowedRoles.includes(user.role)) {
    const fallback = user.role === 'employee' ? '/' : '/admin'
    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const user = useAuthStore((s) => s.user)

  if (user) {
    const to = user.role === 'employee' ? '/' : '/admin'
    return <Navigate to={to} replace />
  }

  return <Outlet />
}
