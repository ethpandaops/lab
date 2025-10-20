import { type JSX } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { NavLinks } from '@/components/NavLinks';
import { type NavBarProps } from './NavBar.types';

export function NavBar({ showBreadcrumbs = true, showNavLinks = true }: NavBarProps): JSX.Element {
  return (
    <div className="flex min-h-8 items-center">
      {/* Left: Breadcrumbs */}
      {showBreadcrumbs && <Breadcrumbs />}

      {/* Right: Navigation Links - always pushed to the right */}
      {showNavLinks && (
        <div className="ml-auto">
          <NavLinks />
        </div>
      )}
    </div>
  );
}
