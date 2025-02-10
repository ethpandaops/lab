import { Outlet } from 'react-router-dom'
import { Navigation } from './Navigation'
import { Breadcrumbs } from './Breadcrumbs'

function Layout(): JSX.Element {
  return (
    <div className="relative min-h-screen bg-cyber-darker text-cyber-neon font-mono">
      {/* Cyber Grid Background */}
      <div className="absolute inset-0 bg-cyber-grid bg-cyber opacity-5" />
      
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
              {/* Main content */}
              <div className="relative backdrop-blur-sm bg-cyber-darker/90 rounded-lg border border-cyber-neon/10 p-6">
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