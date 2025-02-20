import { Outlet, useLocation } from 'react-router-dom'
import { Navigation } from './Navigation'
import { Breadcrumbs } from './Breadcrumbs'
import { NetworkSelector } from '../common/NetworkSelector'
import { useContext, useEffect, useState } from 'react'
import { NetworkContext } from '../../App'
import { Logo } from './Logo'
import { BeaconClockManager } from '../../utils/beacon'

function Layout(): JSX.Element {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const { selectedNetwork, setSelectedNetwork, availableNetworks } = useContext(NetworkContext)
  const [currentSlot, setCurrentSlot] = useState<number | null>(null)
  const [currentEpoch, setCurrentEpoch] = useState<number | null>(null)

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
    <div className="relative min-h-screen text-primary font-mono">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid bg-cyber opacity-[0.03] animate-pulse-slow" />
      <div className="fixed inset-0 bg-gradient-to-b from-[rgb(var(--bg-base)/0.7)] via-[rgb(var(--bg-base)/0.8)] to-[rgb(var(--bg-base)/0.9)]" />
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-error/5 via-transparent to-transparent" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header Section */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-nav/80 border-b border-subtle">
          {/* Top Bar */}
          <div className="container mx-auto px-4 py-2 2xl:px-0 flex items-center">
            {/* Left */}
            <div className="w-1/3">
              <Logo />
            </div>
            
            {/* Center */}
            <div className="w-1/3 flex justify-center">
              <NetworkSelector
                selectedNetwork={selectedNetwork}
                onNetworkChange={setSelectedNetwork}
                className="w-48"
              />
            </div>

            {/* Right */}
            <div className="w-1/3 flex justify-end">
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
          </div>

          {/* Navigation Bar */}
          {!isHome && (
            <div className="container mx-auto px-4 py-2 2xl:px-0 flex items-center justify-between border-t border-subtle">
              <Breadcrumbs />
              <Navigation />
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className={`flex-1 ${isHome ? '' : 'container mx-auto py-6 px-4 2xl:px-0'}`}>
          <div className="relative h-full">
            <div className={isHome ? 'h-full' : 'relative backdrop-blur-md bg-surface/90 border border-subtle rounded-lg shadow-lg p-4 md:p-6'}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout 