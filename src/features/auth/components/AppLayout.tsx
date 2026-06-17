import { Outlet } from 'react-router-dom'
import { Header } from '@/components/shared/Header'
import { Footer } from '@/components/shared/Footer'

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f9fb]">
      <Header />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
