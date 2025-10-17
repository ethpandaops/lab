import { type JSX } from 'react';
import { createFileRoute, Outlet, Link, useMatches } from '@tanstack/react-router';
import { NetworkSelector } from '@/components/NetworkSelector';

function AppLayout(): JSX.Element {
  // Get all matched routes and check their staticData
  const matches = useMatches();

  // Show network selector if any matched route has it enabled in staticData
  const shouldShowNetworkSelector = matches.some(match => match.staticData?.showNetworkSelector === true);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navbar */}
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
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                  activeProps={{ className: 'bg-slate-700 text-white' }}
                >
                  Experiments
                </Link>
                <Link
                  to="/about"
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                  activeProps={{ className: 'bg-slate-700 text-white' }}
                >
                  About
                </Link>
              </div>
            </div>

            {/* Network Selector - conditionally rendered */}
            {shouldShowNetworkSelector && (
              <div className="w-48">
                <NetworkSelector showLabel={false} />
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

export const Route = createFileRoute('/_app')({
  component: AppLayout,
});
