import { Link, useLocation } from 'react-router-dom'

interface NavItem {
  name: string
  path: string
  items?: NavItem[]
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
          { name: 'Networks', path: '/experiments/xatu-contributors/networks' },
          { name: 'Contributors', path: '/experiments/xatu-contributors/contributors' },
        ],
      },
    ],
  },
]

export function Navigation(): JSX.Element {
  const location = useLocation()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-x-3">
            <img src="/ethpandaops.png" alt="Logo" className="h-8 w-auto" />
            <div className="flex flex-col">
              <span className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-purple-500 text-transparent bg-clip-text">
                The Lab
              </span>
              <span className="text-[10px] text-gray-400 -mt-1">by ethPandaOps</span>
            </div>
          </Link>

          {/* Top-level Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => {
              const isActive = item.path === '/' 
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    isActive 
                      ? 'text-cyan-400 bg-cyan-500/20 border border-cyan-500/50' 
                      : 'text-gray-200 hover:text-cyan-400 hover:bg-cyan-500/10'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
} 