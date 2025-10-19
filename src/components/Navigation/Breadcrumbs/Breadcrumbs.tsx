import { type JSX } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { ChevronRightIcon } from '@heroicons/react/20/solid';

/**
 * Breadcrumbs navigation component.
 *
 * Automatically generates breadcrumbs from matched routes using the route context's getTitle function.
 * Filters out root, index routes, and routes without getTitle.
 *
 * Features:
 * - Automatic breadcrumb generation from route matches
 * - Links to all intermediate routes
 * - Shows current page as plain text (not a link)
 * - Responsive and accessible
 *
 * @example
 * ```tsx
 * <Breadcrumbs />
 * ```
 */
export function Breadcrumbs(): JSX.Element {
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
    <nav
      className="flex items-center gap-2 overflow-x-auto font-mono [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Breadcrumb"
    >
      <Link to="/" className="shrink-0 text-sm/6 font-medium text-tertiary hover:text-primary">
        Home
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.path} className="flex shrink-0 items-center gap-2">
          <ChevronRightIcon className="size-4 shrink-0 text-muted" />
          {index === breadcrumbs.length - 1 ? (
            <span className="text-sm/6 font-medium whitespace-nowrap text-primary" title={crumb.title}>
              {crumb.title}
            </span>
          ) : (
            <Link
              to={crumb.path}
              className="text-sm/6 font-medium whitespace-nowrap text-tertiary hover:text-primary"
              title={crumb.title}
            >
              {crumb.title}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
