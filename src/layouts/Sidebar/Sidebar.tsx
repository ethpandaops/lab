import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { NetworkSelector } from '@/components/NetworkSelector';
import { type SidebarProps } from './Sidebar.types';

export function Sidebar({
  children,
  showNavbar = false,
  showNetworkSelector = false,
  fullWidth = false,
  sidebarPosition = 'left',
}: SidebarProps): JSX.Element {
  // Determine grid columns based on sidebar position
  const gridCols = sidebarPosition === 'left' ? 'grid-cols-[300px_1fr]' : 'grid-cols-[1fr_300px]';

  return (
    <div className="min-h-dvh bg-slate-900">
      {/* Navbar - conditional */}
      {showNavbar && (
        <nav className="border-b border-slate-700 bg-slate-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Logo & Nav Links */}
              <div className="flex items-center gap-8">
                <Link to="/" className="text-xl font-bold text-white hover:text-slate-300">
                  Lab
                </Link>
                <div className="flex gap-4">
                  <Link
                    to="/experiments"
                    className="rounded-sm px-3 py-2 text-sm/6 font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                    activeProps={{ className: 'bg-slate-700 text-white' }}
                  >
                    Experiments
                  </Link>
                  <Link
                    to="/about"
                    className="rounded-sm px-3 py-2 text-sm/6 font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                    activeProps={{ className: 'bg-slate-700 text-white' }}
                  >
                    About
                  </Link>
                </div>
              </div>

              {/* Network Selector - conditional */}
              {showNetworkSelector && (
                <div className="w-48">
                  <NetworkSelector showLabel={false} />
                </div>
              )}
            </div>
          </div>
        </nav>
      )}

      {/* Two Column Grid */}
      <div className={fullWidth ? 'px-4 py-8' : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}>
        <div className={`grid ${gridCols} gap-6`}>{children}</div>
      </div>
    </div>
  );
}
