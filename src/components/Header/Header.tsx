import { type JSX, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { NetworkSelector } from '@/components/NetworkSelector';
import { NetworkSummary } from '@/components/NetworkSummary';
import { NetworkIcon } from '@/components/NetworkIcon';
import { NavBar } from '@/components/NavBar';
import { NavPanel } from '@/components/NavPanel';
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
    <header className="sticky top-0 z-50 border-b border-slate-700/30 bg-slate-800">
      {/* Top Header Content */}
      <div className="w-full px-4 py-2 md:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <div className="flex items-center justify-between">
          {/* Left: Hamburger Menu (mobile only) + Logo */}
          <div className="flex items-center gap-3">
            {/* Hamburger Menu - visible < lg, hidden >= lg */}
            {showNavPanel && (
              <button
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className="rounded-sm p-2 text-slate-400 hover:bg-slate-700 hover:text-white lg:hidden"
                aria-label="Toggle navigation menu"
              >
                <Bars3Icon className="size-6" />
              </button>
            )}

            <Link to="/" className="flex items-center gap-3">
              <img alt="The Lab Logo" className="size-10 object-contain" src="/images/lab.png" />
              <div className="flex flex-col justify-center">
                <span className="bg-linear-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text font-sans text-2xl font-black text-transparent">
                  The Lab
                </span>
                <div className="-mt-1 flex flex-col font-mono">
                  <span className="text-[12px] text-slate-400">lab.ethpandaops.io</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Mobile: Network Icon with Name - visible < lg, hidden >= lg, right-aligned */}
          {showNetworkSelector && currentNetwork && (
            <div className="flex flex-col items-center gap-1 lg:hidden">
              <NetworkIcon networkName={currentNetwork.name} />
              <span className="font-mono text-xs text-slate-300">{currentNetwork.display_name}</span>
            </div>
          )}

          {/* Middle: Network Selector - hidden < lg, visible >= lg */}
          {showNetworkSelector && (
            <div className="hidden flex-1 justify-center lg:flex">
              <div className="w-48">
                <NetworkSelector showLabel={false} />
              </div>
            </div>
          )}

          {/* Right: Network Summary - hidden < lg, visible >= lg */}
          {showNetworkSummary && (
            <div className="hidden lg:flex">
              <NetworkSummary />
            </div>
          )}
        </div>
      </div>

      {/* NavBar - hidden on mobile, visible on lg+ */}
      {showNavBar && (
        <div className="hidden w-full border-t border-slate-700/20 px-4 py-2 md:px-6 lg:block lg:px-8 xl:px-12 2xl:px-16">
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
