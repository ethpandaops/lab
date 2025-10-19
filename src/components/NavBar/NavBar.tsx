import { type JSX } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import { HomeIcon, BeakerIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { type NavBarProps } from './NavBar.types';

export function NavBar({ showBreadcrumbs = true, showNavLinks = true }: NavBarProps): JSX.Element {
  const matches = useRouterState({ select: s => s.matches });

  // Generate breadcrumbs from matched routes using context getTitle
  // Filter out root, index routes (ending with /), and routes without getTitle
  const breadcrumbs = matches
    .filter(match => {
      if (match.pathname === '/') return false;
      if (match.pathname.endsWith('/')) return false;
      return match.context.getTitle;
    })
    .map(match => ({
      title: match.context.getTitle!(),
      path: match.pathname,
    }));

  return (
    <div className="flex items-center">
      {/* Left: Breadcrumbs */}
      {showBreadcrumbs && (
        <nav className="flex items-center gap-2" aria-label="Breadcrumb">
          <Link to="/" className="text-sm/6 font-medium text-slate-400 hover:text-white">
            Home
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center gap-2">
              <ChevronRightIcon className="size-4 text-slate-600" />
              {index === breadcrumbs.length - 1 ? (
                <span className="text-sm/6 font-medium text-white">{crumb.title}</span>
              ) : (
                <Link to={crumb.path} className="text-sm/6 font-medium text-slate-400 hover:text-white">
                  {crumb.title}
                </Link>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Right: Navigation Links - always pushed to the right */}
      {showNavLinks && (
        <div className="ml-auto flex gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm/6 font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
            activeProps={{ className: 'bg-slate-700 text-white' }}
          >
            <HomeIcon className="size-4" />
            Home
          </Link>
          <Link
            to="/experiments"
            className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm/6 font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
            activeProps={{ className: 'bg-slate-700 text-white' }}
          >
            <BeakerIcon className="size-4" />
            Experiments
          </Link>
          <Link
            to="/about"
            className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm/6 font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
            activeProps={{ className: 'bg-slate-700 text-white' }}
          >
            <InformationCircleIcon className="size-4" />
            About
          </Link>
        </div>
      )}
    </div>
  );
}
