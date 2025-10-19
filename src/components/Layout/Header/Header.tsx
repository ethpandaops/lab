import { type JSX, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { NetworkSelector } from '@/components/Network/NetworkSelector';
import { NetworkSummary } from '@/components/Network/NetworkSummary';
import { NetworkIcon } from '@/components/Network/NetworkIcon';
import { NavBar } from '@/components/Navigation/NavBar';
import { NavPanel } from '@/components/Navigation/NavPanel';
import { useNetwork } from '@/hooks/useNetwork';
import { type HeaderProps } from './Header.types';

export function Header({
  showNetworkSelector = false,
  showNetworkSummary = false,
  showBreadcrumbs = true,
  showNavLinks = true,
}: HeaderProps): JSX.Element {
  // Show NavBar if either breadcrumbs or nav links are enabled
  const showNavBar = showBreadcrumbs || showNavLinks;
  // Show NavPanel (and hamburger menu) if any panel content is enabled
  const showNavPanel = showNetworkSelector || showBreadcrumbs || showNavLinks || showNetworkSummary;
  const { currentNetwork } = useNetwork();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <header className="bg-nav sticky top-0 z-50 border-b">
      {/* Top Header Content */}
      <div className="flex w-full items-center justify-between px-4 py-2 md:px-6 lg:px-8 xl:px-12 2xl:px-16">
        {/* Left: Hamburger Menu (mobile only) + Logo */}
        <div className="flex items-center gap-4">
          {/* Hamburger Menu - visible < lg, hidden >= lg */}
          {showNavPanel && (
            <button
              type="button"
              onClick={() => setIsPanelOpen(prev => !prev)}
              className="text-primary hover:text-accent lg:hidden"
              aria-label="Toggle navigation menu"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          )}

          <Link to="/" className="flex items-center gap-3">
            <img alt="Logo" className="h-10 w-10 object-contain" src="/images/lab.png" />
            <div className="flex flex-col justify-center">
              <span className="bg-gradient-to-r from-accent via-accent-muted to-accent bg-clip-text font-sans text-2xl font-black text-transparent">
                The Lab
              </span>
              <div className="-mt-1 flex flex-col font-mono">
                <span className="text-[12px] text-tertiary">lab.ethpandaops.io</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Middle: Network Selector - hidden < lg, visible >= lg */}
        {showNetworkSelector && (
          <div className="hidden justify-center lg:flex">
            <div className="relative">
              <NetworkSelector showLabel={false} expandToFit={true} />
            </div>
          </div>
        )}

        {/* Right: Network Summary - hidden < lg, visible >= lg */}
        {showNetworkSummary && (
          <div className="hidden items-center justify-end gap-4 lg:flex">
            <NetworkSummary />
          </div>
        )}

        {/* Mobile: Network Icon with Name - visible < lg, hidden >= lg, right-aligned */}
        {showNetworkSelector && currentNetwork && (
          <div className="flex flex-col items-end lg:hidden">
            <div className="flex flex-col items-center gap-1">
              <NetworkIcon networkName={currentNetwork.name} />
              <span className="text-xs font-medium text-tertiary">{currentNetwork.display_name}</span>
            </div>
          </div>
        )}
      </div>

      {/* NavBar - hidden on mobile, visible on lg+ */}
      {showNavBar && (
        <div className="hidden w-full border-t border-accent/20 px-4 py-2 md:px-6 lg:block lg:px-8 xl:px-12 2xl:px-16">
          <NavBar showBreadcrumbs={showBreadcrumbs} showNavLinks={showNavLinks} />
        </div>
      )}

      {/* NavPanel - mobile navigation */}
      {showNavPanel && (
        <NavPanel
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          showNetworkSelector={showNetworkSelector}
          showBreadcrumbs={showBreadcrumbs}
          showNavLinks={showNavLinks}
          showNetworkSummary={showNetworkSummary}
        />
      )}
    </header>
  );
}
