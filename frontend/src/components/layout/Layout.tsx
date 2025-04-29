import { Outlet, useLocation } from 'react-router-dom'
import { Navigation } from '@/components/layout/Navigation'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { NetworkSelector } from '@/components/common/NetworkSelector'
import { useContext, useEffect, useState } from 'react'
import { NetworkContext } from '@/App'
import { Logo } from '@/components/layout/Logo'
import { BeaconClockManager } from '@/utils/beacon.ts'
import { Menu } from 'lucide-react'
import { NETWORK_METADATA, type NetworkKey } from '@/constants/networks.tsx'
import clsx from 'clsx'

function Layout(): JSX.Element {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const { selectedNetwork, setSelectedNetwork } = useContext(NetworkContext)
  const [currentSlot, setCurrentSlot] = useState<number | null>(null)
  const [currentEpoch, setCurrentEpoch] = useState<number | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Get network metadata
  const selectedMetadata = NETWORK_METADATA[selectedNetwork as NetworkKey] || {
    name: selectedNetwork.charAt(0).toUpperCase() + selectedNetwork.slice(1),
    icon: '🔥',
    color: '#627EEA'
  }

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location])

  // Update slot and epoch every second
  useEffect(() => {
    const clock = BeaconClockManager.getInstance().getBeaconClock(selectedNetwork)
    if (!clock) return

    const updateTime = () => {
      const slot = clock.getCurrentSlot()
      const epoch = Math.floor(slot / 32)
      setCurrentSlot(slot)
      setCurrentEpoch(epoch)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [selectedNetwork])

  return (
    <div className="relative min-h-screen text-primary font-mono bg-gradient-to-b from-[rgb(var(--bg-base))] via-[rgb(var(--bg-base))] to-[rgb(var(--bg-base))]">
      {/* Integrated Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-error/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header Section */}
        <header className="sticky top-0 z-50 bg-nav border-b border-accent/30">
          {/* Top Bar */}
          <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 py-2 flex items-center justify-between">
            {/* Left - Logo and Mobile Menu */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="lg:hidden text-primary hover:text-accent"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <Menu className="h-6 w-6" />
              </button>
              <Logo />
            </div>
            
            {/* Center - Network Selector (hidden on mobile) */}
            <div className="hidden lg:flex justify-center">
              <NetworkSelector
                selectedNetwork={selectedNetwork}
                onNetworkChange={setSelectedNetwork}
                className="w-48"
              />
            </div>

            {/* Right - Slot/Epoch Info (hidden on mobile) */}
            <div className="hidden lg:flex justify-end">
              {currentSlot !== null && currentEpoch !== null && (
                <div className="text-sm font-mono">
                  <span className="text-tertiary">Slot </span>
                  <span className="text-primary">{currentSlot}</span>
                  <span className="text-tertiary mx-2">·</span>
                  <span className="text-tertiary">Epoch </span>
                  <span className="text-primary">{currentEpoch}</span>
                </div>
              )}
            </div>

            {/* Mobile Network Display */}
            <div className="lg:hidden flex flex-col items-end">
              <div className="flex flex-col items-center gap-1">
                <span className="flex items-center justify-center w-8 h-8">
                  {selectedMetadata.icon}
                </span>
                <span className="text-xs font-medium text-tertiary">{selectedMetadata.name}</span>
              </div>
            </div>
          </div>

          {/* Navigation Bar (desktop only) */}
          {!isHome && (
            <div className="hidden lg:block w-full px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 py-2 border-t border-accent/20">
              <div className="flex items-center justify-between">
                <Breadcrumbs />
                <Navigation />
              </div>
            </div>
          )}
        </header>

        {/* Mobile Navigation Sidebar */}
        <div
          className={clsx(
            'fixed inset-0 z-40 lg:hidden transition-opacity duration-300',
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          style={{ top: '56px' }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sidebar */}
          <div
            className={clsx(
              'absolute top-0 left-0 w-72 h-[calc(100vh-56px)] bg-nav border-r border-accent/30 transform transition-transform duration-300',
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <div className="flex flex-col h-full">
              {/* Network Selector */}
              <div className="p-4 border-b border-subtle">
                <NetworkSelector
                  selectedNetwork={selectedNetwork}
                  onNetworkChange={setSelectedNetwork}
                  className="w-full"
                />
              </div>

              {/* Mobile Navigation Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-4 space-y-6 py-4">
                  {/* Breadcrumbs */}
                  {!isHome && (
                    <div className="pb-4 border-b border-subtle">
                      <Breadcrumbs className="text-xs" />
                    </div>
                  )}

                  {/* Navigation */}
                  <Navigation showLinks={true} />
                </div>
              </div>

              {/* Footer Info */}
              {currentSlot !== null && currentEpoch !== null && (
                <div className="mt-auto p-4 border-t border-accent/20 bg-surface">
                  <div className="text-sm font-mono space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-tertiary">Slot</span>
                      <span className="text-primary font-medium">{currentSlot}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-tertiary">Epoch</span>
                      <span className="text-primary font-medium">{currentEpoch}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 relative">
          <div className={clsx(
            'w-full',
            (location.pathname === '/beacon/slot/live' || /^\/beacon\/slot\/\d+$/.test(location.pathname))
              ? 'h-[calc(100vh-56px)]'
              : ['min-h-0', 'p-2 md:p-4 lg:p-6']
          )}>
            <div className={clsx(
              'relative',
              (location.pathname === '/beacon/slot/live' || /^\/beacon\/slot\/\d+$/.test(location.pathname))
                ? 'h-full'
                : [
                    'p-4 md:p-6 lg:p-8'
                  ]
            )}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout 