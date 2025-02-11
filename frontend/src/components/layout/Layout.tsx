import { Outlet, useLocation } from 'react-router-dom'
import { Navigation } from './Navigation'
import { Breadcrumbs } from './Breadcrumbs'

function Layout(): JSX.Element {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="relative min-h-screen bg-cyber-darker text-cyber-neon font-mono">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-cyber-grid bg-cyber opacity-[0.03] animate-pulse-slow" />
      <div className="fixed inset-0 bg-gradient-to-b from-cyber-darker/70 via-cyber-darker/80 to-cyber-darker/90" />
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-cyber-blue/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-cyber-pink/5 via-transparent to-transparent" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        <Navigation />
        <div className={isHome ? '' : 'pt-16'}>
          <main className={isHome ? 'h-screen' : 'container mx-auto py-6 px-4 2xl:px-0'}>
            {!isHome && (
              <div className="mb-4">
                <Breadcrumbs />
              </div>
            )}

            {/* Content Area */}
            <div className="relative h-full">
              {/* Main content */}
              <div className={isHome ? 'h-full' : 'relative backdrop-blur-sm bg-cyber-dark/90 rounded-lg border border-cyber-neon/20 p-4 md:p-6'}>
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default Layout 