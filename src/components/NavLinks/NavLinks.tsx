import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { HomeIcon, BeakerIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { NavLinksProps } from './NavLinks.types';

/**
 * Navigation links component.
 *
 * Displays the main navigation links for the application.
 *
 * Features:
 * - Active route highlighting
 * - Icons for each link
 * - Hover states
 * - Keyboard accessible
 * - Can be displayed horizontally or vertically
 *
 * @example
 * ```tsx
 * // Horizontal layout (default)
 * <NavLinks />
 *
 * // Vertical layout (for mobile panels)
 * <NavLinks orientation="vertical" />
 * ```
 */
export function NavLinks({ orientation = 'horizontal' }: NavLinksProps): JSX.Element {
  const links = [
    { to: '/', icon: HomeIcon, label: 'Home' },
    { to: '/explore', icon: BeakerIcon, label: 'Experiments' },
    { to: '/about', icon: InformationCircleIcon, label: 'About' },
  ];

  return (
    <nav
      className={clsx('flex gap-2 font-mono', {
        'flex-col': orientation === 'vertical',
        'flex-col lg:flex-row lg:items-center': orientation === 'horizontal',
      })}
    >
      {links.map(link => (
        <Link
          key={link.to}
          to={link.to}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-hover hover:text-accent"
          activeProps={{
            className: 'bg-active text-accent active',
            'data-status': 'active',
            'aria-current': 'page',
          }}
        >
          <link.icon className="h-4 w-4" />
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
