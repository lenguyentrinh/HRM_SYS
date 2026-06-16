import { createBrowserRouter } from 'react-router-dom'
import { RouteGuard, PublicOnlyRoute } from './features/auth/components/RouteGuard'
import { LoginPage } from './features/auth/pages/LoginPage'

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <RouteGuard allowedRoles={['super_admin', 'manager']} />,
    children: [
      {
        path: '/admin',
        element: <div className="p-8 text-center text-slate-500">Admin Portal — Coming Soon</div>,
      },
    ],
  },
  {
    element: <RouteGuard allowedRoles={['employee']} />,
    children: [
      {
        path: '/',
        element: <div className="p-8 text-center text-slate-500">Employee Portal — Coming Soon</div>,
      },
    ],
  },
  { path: '*', element: <div className="p-8 text-center text-slate-500">404 — Page Not Found</div> },
])
