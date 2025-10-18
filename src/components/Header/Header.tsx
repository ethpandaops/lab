import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { NetworkSelector } from '@/components/NetworkSelector';
import { type HeaderProps } from './Header.types';

export function Header({ showNetworkSelector = false }: HeaderProps): JSX.Element {
  return (
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
  );
}
