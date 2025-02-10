import { Link, useLocation } from 'react-router-dom'

interface NavItem {
  name: string
  path: string
  items?: NavItem[]
}

export const navigation = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
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
]

export function Navigation(): JSX.Element {
  const location = useLocation()

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

          {/* Top-level Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navigation.map((item) => {
              const isActive = item.path === '/' 
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-mono transition-colors border ${
                    isActive 
                      ? 'text-cyber-neon bg-cyber-neon/10 border-cyber-neon/30' 
                      : 'text-cyber-neon/70 hover:text-cyber-neon hover:bg-cyber-neon/5 border-transparent hover:border-cyber-neon/20'
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