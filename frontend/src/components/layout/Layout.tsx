import { useLocation, Outlet } from 'react-router-dom'
import { Navigation } from './Navigation'
import { Breadcrumbs } from './Breadcrumbs'

export const Layout = () => {
  const location = useLocation()

  return (
    <div className="relative min-h-screen bg-black">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="relative w-full h-full">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20 animate-gradient" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>
      </div>

      {/* Neon Lines */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />
      </div>

      {/* Content */}
      <div className="relative z-20">
        <Navigation />
        <div className="pt-16">
          <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <Breadcrumbs />
            <div className="mt-4">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
} 