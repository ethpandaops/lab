import { Link, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'

interface NavigationProps {
  onToggleSidebar?: () => void
  showMenuButton?: boolean
}

interface NavItem {
  name: string
  path: string
  items?: {
    name: string
    path: string
    items?: {
      name: string
      path: string
    }[]
  }[]
}

const navItems: NavItem[] = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
  { 
    name: 'Experiments', 
    path: '/experiments',
    items: [
      { 
        name: 'Xatu Contributors',
        path: '/experiments/xatu-contributors',
        items: [
          { name: 'Community Nodes', path: '/experiments/xatu-contributors/community-nodes' },
        ]
      }
    ]
  },
]

export const Navigation = ({ onToggleSidebar, showMenuButton }: NavigationProps) => {
  const location = useLocation()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            {showMenuButton && (
              <button
                type="button"
                className="lg:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-300 hover:text-cyan-400 focus:outline-none"
                onClick={onToggleSidebar}
              >
                <span className="sr-only">Open sidebar</span>
                <Menu className="h-6 w-6" aria-hidden="true" />
              </button>
            )}
            <Link to="/" className="flex items-center gap-x-3">
              <img src="/ethpandaops.png" alt="Logo" className="h-8 w-auto" />
              <div className="flex flex-col">
                <span className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-purple-500 text-transparent bg-clip-text">
                  The Lab
                </span>
                <span className="text-[10px] text-gray-400 -mt-1">by ethPandaOps</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links - Hidden on mobile when sidebar is available */}
          <div className={`${showMenuButton ? 'hidden lg:flex' : 'flex'} items-center space-x-4`}>
            {navItems.map((item) => {
              const isActive = item.path === '/' 
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)
              return (
                <div key={item.path} className="relative group">
                  <Link
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2
                      ${isActive 
                        ? 'text-cyan-400 bg-cyan-500/20 border border-cyan-500/50' 
                        : 'text-gray-200 hover:text-cyan-400 hover:bg-cyan-500/10'
                      }`}
                  >
                    {item.name}
                  </Link>
                  {item.items && (
                    <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-gray-900/95 backdrop-blur-sm ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                      <div className="py-1" role="menu" aria-orientation="vertical">
                        {item.items.map((subItem) => (
                          <div key={subItem.path} className="relative group/sub">
                            <Link
                              to={subItem.path}
                              className={`block px-4 py-2 text-sm text-gray-300 hover:text-cyan-400 hover:bg-cyan-500/10
                                ${location.pathname.startsWith(subItem.path) ? 'text-cyan-400 bg-cyan-500/20' : ''}`}
                            >
                              {subItem.name}
                            </Link>
                            {subItem.items && (
                              <div className="absolute left-full top-0 w-48 rounded-md shadow-lg bg-gray-900/95 backdrop-blur-sm ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover/sub:opacity-100 group-hover/sub:visible transition-all">
                                <div className="py-1">
                                  {subItem.items.map((subSubItem) => (
                                    <Link
                                      key={subSubItem.path}
                                      to={subSubItem.path}
                                      className={`block px-4 py-2 text-sm text-gray-300 hover:text-cyan-400 hover:bg-cyan-500/10
                                        ${location.pathname === subSubItem.path ? 'text-cyan-400 bg-cyan-500/20' : ''}`}
                                    >
                                      {subSubItem.name}
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
} 