import { createBrowserRouter } from 'react-router-dom'
import { RouteGuard, PublicOnlyRoute } from './features/auth/components/RouteGuard'
import { AppLayout } from './features/auth/components/AppLayout'
import { LoginPage } from './features/auth/pages/LoginPage'
import { SignUpPage } from './features/auth/pages/SignUpPage'

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignUpPage /> },
    ],
  },
  {
    element: <RouteGuard allowedRoles={['super_admin', 'manager']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/admin',
            element: <div className="p-8 text-center text-slate-500">Admin Portal — Coming Soon</div>,
          },
        ],
      },
    ],
  },
  {
    element: <RouteGuard allowedRoles={['employee']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/',
            element: <div className="p-8 text-center text-slate-500">Employee Portal — Coming Soon</div>,
          },
        ],
      },
    ],
  },
  { path: '*', element: <div className="p-8 text-center text-slate-500">404 — Page Not Found</div> },
])
