import { useState } from 'react'
import { Navigation } from './Navigation'
import { Sidebar } from './Sidebar'
import { useLocation } from 'react-router-dom'

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const isHomePage = location.pathname === '/'

  return (
    <div className="relative min-h-screen bg-gray-950">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="relative w-full h-full">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-gray-950 to-cyan-900/30 animate-gradient" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
        </div>
      </div>

      {/* Neon Lines */}
      <div className="fixed inset-0 z-1 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-70" />
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-70" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {!isHomePage && (
          <>
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <Navigation onToggleSidebar={() => setSidebarOpen(true)} showMenuButton={true} />
          </>
        )}
        <div className={!isHomePage ? 'lg:pl-72' : ''}>
          <main className={!isHomePage ? 'py-8 px-4 sm:px-6 lg:px-8' : ''}>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
} 