import { Outlet } from 'react-router-dom'
import { Navigation } from './Navigation'
import { Breadcrumbs } from './Breadcrumbs'

function Layout(): JSX.Element {
  return (
    <div className="relative min-h-screen bg-black text-gray-100">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="relative w-full h-full">
          {/* Main gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-black to-cyan-900/10 animate-gradient" />
          
          {/* Noise texture */}
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay" />
          
          {/* Grid */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          </div>

          {/* Glow effects */}
          <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-cyan-500/10 blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-1/2 h-1/2 bg-purple-500/10 blur-[120px] animate-pulse delay-1000" />
        </div>
      </div>

      {/* Neon Lines */}
      <div className="fixed inset-x-0 top-0 z-10 pointer-events-none h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      <div className="fixed inset-x-0 bottom-0 z-10 pointer-events-none h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

      {/* Content */}
      <div className="relative z-20">
        <Navigation />
        <div className="pt-16">
          <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
              <Breadcrumbs />
            </div>

            {/* Content Area */}
            <div className="relative">
              {/* Subtle top highlight */}
              <div className="absolute -top-px left-20 right-20 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
              
              {/* Main content */}
              <div className="relative backdrop-blur-sm">
                <Outlet />
              </div>

              {/* Subtle bottom highlight */}
              <div className="absolute -bottom-px left-20 right-20 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default Layout 