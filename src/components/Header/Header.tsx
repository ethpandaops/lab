import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { NetworkSelector } from '@/components/NetworkSelector';
import { NetworkSummary } from '@/components/NetworkSummary';
import { NavBar } from '@/components/NavBar';
import { type HeaderProps } from './Header.types';

export function Header({
  showNetworkSelector = false,
  showNetworkSummary = false,
  showBreadcrumbs = true,
  showNavLinks = true,
}: HeaderProps): JSX.Element {
  // Show NavBar if either breadcrumbs or nav links are enabled
  const showNavBar = showBreadcrumbs || showNavLinks;

  return (
    <>
      <nav className="border-b border-slate-700 bg-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center">
            {/* Left: Logo */}
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-white hover:text-slate-300">
                Lab
              </Link>
            </div>

            {/* Middle: Network Selector - conditional */}
            {showNetworkSelector && (
              <div className="flex flex-1 justify-center">
                <div className="w-48">
                  <NetworkSelector showLabel={false} />
                </div>
              </div>
            )}

            {/* Right: Network Summary - conditional, always pushed to the right */}
            {showNetworkSummary && (
              <div className="ml-auto flex">
                <NetworkSummary />
              </div>
            )}
          </div>
        </div>
      </nav>
      {showNavBar && <NavBar showBreadcrumbs={showBreadcrumbs} showNavLinks={showNavLinks} />}
    </>
  );
}
