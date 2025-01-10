import { Outlet } from 'react-router-dom'
import { Navigation } from './Navigation'
import { Breadcrumbs } from './Breadcrumbs'

function Layout(): JSX.Element {
  return (
    <div className="relative min-h-screen text-gray-100">
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
              <div className="relative">
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