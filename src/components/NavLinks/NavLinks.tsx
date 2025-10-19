import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { HomeIcon, BeakerIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
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
    { to: '/experiments', icon: BeakerIcon, label: 'Experiments' },
    { to: '/about', icon: InformationCircleIcon, label: 'About' },
  ];

  const containerClass = orientation === 'vertical' ? 'flex flex-col gap-1' : 'flex gap-4';

  const linkClass =
    orientation === 'vertical'
      ? 'flex items-center gap-3 rounded-sm px-4 py-3 text-sm/6 font-medium text-slate-300 hover:bg-slate-700 hover:text-white'
      : 'flex items-center gap-2 rounded-sm px-3 py-2 text-sm/6 font-medium text-slate-300 hover:bg-slate-700 hover:text-white';

  const activeClass = 'bg-slate-700 text-white';

  return (
    <div className={containerClass}>
      {links.map(link => (
        <Link key={link.to} to={link.to} className={linkClass} activeProps={{ className: activeClass }}>
          <link.icon className="size-4" />
          {link.label}
        </Link>
      ))}
    </div>
  );
}
