import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  name: string
  path: string
  children?: NavItem[]
}

export const navigation = [
  { name: 'Home', path: '/' },
  { name: 'Experiments', path: '/experiments',
    children: [
      {
        name: 'Xatu',
        path: '/xatu',
        children: [
          { name: 'Community Nodes', path: '/xatu/community-nodes' },
          { name: 'Networks', path: '/xatu/networks' },
          { name: 'Contributors', path: '/xatu/contributors' },
        ],
      },
      {
        name: 'Beacon Chain',
        path: '/beacon-chain-timings',
        children: [
          { name: 'Block Timings', path: '/beacon-chain-timings/blocks' },
        ],
      },
    ],
  },
  { name: 'About', path: '/about' },
]

export function Navigation(): JSX.Element {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Recursive function to render nav items
  const renderNavItems = (items: NavItem[], level = 0) => {
    return items.map((item) => (
      <div key={item.path} className={`${level > 0 ? 'ml-4' : ''}`}>
        <Link
          to={item.path}
          onClick={() => setIsMobileMenuOpen(false)}
          className={`block py-2 text-sm font-mono transition-colors ${
            location.pathname.startsWith(item.path) && item.path !== '/'
              ? 'text-cyber-neon'
              : location.pathname === item.path
              ? 'text-cyber-neon'
              : 'text-cyber-neon/70 hover:text-cyber-neon'
          }`}
        >
          {item.name}
        </Link>
        {item.children && renderNavItems(item.children, level + 1)}
      </div>
    ))
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-cyber-darker/80 backdrop-blur-md border-b border-cyber-neon/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-x-3 group">
            <img src="/ethpandaops.png" alt="Logo" className="h-8 w-auto filter brightness-150" />
            <div className="flex flex-col">
              <span className="text-xl font-sans font-bold bg-gradient-to-r from-cyber-blue via-cyber-neon to-cyber-pink text-transparent bg-clip-text">
                The Lab
              </span>
              <span className="text-[10px] text-cyber-neon/70 -mt-1 font-mono">by ethPandaOps</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navigation.map((item) => {
              const isActive = item.path === '/' 
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)

              return (
                <div key={item.path} className="relative group">
                  <Link
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-mono transition-colors border ${
                      isActive 
                        ? 'text-cyber-neon bg-cyber-neon/10 border-cyber-neon/30' 
                        : 'text-cyber-neon/70 hover:text-cyber-neon hover:bg-cyber-neon/5 border-transparent hover:border-cyber-neon/20'
                    }`}
                  >
                    {item.name}
                  </Link>

                  {/* Desktop Dropdown Menu */}
                  {item.children && (
                    <div className="absolute left-0 mt-2 w-48 rounded-lg border border-cyber-neon/20 bg-cyber-darker/95 backdrop-blur-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left">
                      <div className="py-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            className="block px-4 py-2 text-sm font-mono text-cyber-neon/70 hover:text-cyber-neon hover:bg-cyber-neon/5"
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-cyber-neon/10 hover:border-cyber-neon/30 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-cyber-neon" />
            ) : (
              <Menu className="w-6 h-6 text-cyber-neon" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Background Overlay */}
      <div
        className={`fixed inset-0 bg-cyber-darker/90 backdrop-blur-md transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Slide-out Menu */}
      <div
        className={`fixed inset-y-0 right-0 w-64 bg-cyber-darker/95 backdrop-blur-md border-l border-cyber-neon/20 transform transition-transform duration-300 ease-in-out z-50 ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        } md:hidden`}
      >
        <div className="h-16 flex items-center justify-end px-4 border-b border-cyber-neon/20 bg-cyber-darker">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-lg border border-cyber-neon/10 hover:border-cyber-neon/30 transition-colors"
          >
            <X className="w-6 h-6 text-cyber-neon" />
          </button>
        </div>
        <div className="p-4 space-y-2 bg-cyber-darker">
          {renderNavItems(navigation)}
        </div>
      </div>
    </nav>
  )
} 