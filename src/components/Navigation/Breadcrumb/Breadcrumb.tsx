import type { JSX } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { HomeIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import type { BreadcrumbProps, BreadcrumbItem } from './Breadcrumb.types';

/**
 * Breadcrumb navigation component that automatically generates breadcrumbs
 * from TanStack Router's matched routes.
 *
 * Routes opt-in by providing `getBreadcrumb()` in their `beforeLoad` context:
 *
 * @example
 * ```tsx
 * export const Route = createFileRoute('/ethereum/epochs')({
 *   component: IndexPage,
 *   beforeLoad: () => ({
 *     getBreadcrumb: () => ({ label: 'Epochs' }),
 *   }),
 * });
 * ```
 *
 * @example Dynamic breadcrumbs with params
 * ```tsx
 * export const Route = createFileRoute('/ethereum/epochs/$epoch')({
 *   component: DetailPage,
 *   beforeLoad: ({ params }) => ({
 *     getBreadcrumb: () => ({ label: `Epoch ${params.epoch}` }),
 *   }),
 * });
 * ```
 *
 * @example Opt-out of breadcrumbs
 * ```tsx
 * export const Route = createFileRoute('/ethereum/live')({
 *   component: LivePage,
 *   beforeLoad: () => ({
 *     getBreadcrumb: () => ({ label: 'Live', show: false }),
 *   }),
 * });
 * ```
 */
export function Breadcrumb({ className, separator = '/', showHome = true }: BreadcrumbProps): JSX.Element | null {
  // Get all matched routes from router state
  const matches = useRouterState({ select: s => s.matches });

  // Build breadcrumb items from matched routes
  const breadcrumbs: BreadcrumbItem[] = matches
    .filter(match => {
      // Filter routes that provide getBreadcrumb and have show !== false
      const breadcrumbConfig = match.context?.getBreadcrumb?.();
      if (!breadcrumbConfig) return false;
      // Check show property if it exists (default to true if not specified)
      const show = 'show' in breadcrumbConfig ? breadcrumbConfig.show : true;
      return show !== false;
    })
    // Remove duplicate paths (index routes match same path as their layout)
    .filter((match, index, array) => {
      // Keep if it's the first occurrence of this pathname
      return array.findIndex(m => m.pathname === match.pathname) === index;
    })
    .map((match, index, array) => {
      const breadcrumbConfig = match.context.getBreadcrumb!();
      // Check clickable property (default to true if not specified)
      const clickable: boolean =
        'clickable' in breadcrumbConfig && typeof breadcrumbConfig.clickable === 'boolean'
          ? breadcrumbConfig.clickable
          : true;
      // Get label with fallback (routes with show: false are already filtered out)
      const label = 'label' in breadcrumbConfig ? breadcrumbConfig.label || '' : '';
      return {
        label,
        path: match.pathname,
        isActive: index === array.length - 1, // Last item is active
        clickable,
      };
    });

  // Don't render if no breadcrumbs or only one breadcrumb
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={clsx('flex items-center gap-2 px-4 py-4 text-sm/6 sm:px-6 lg:px-8', className)}
    >
      <ol className="flex items-center gap-2">
        {/* Home icon */}
        {showHome && (
          <>
            <li>
              <Link to="/" className="text-muted transition-colors hover:text-foreground" aria-label="Home">
                <HomeIcon className="h-4 w-4" />
              </Link>
            </li>
            <li aria-hidden="true" className="text-muted">
              {separator}
            </li>
          </>
        )}

        {/* Breadcrumb items */}
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.path} className="flex items-center gap-2">
            {crumb.isActive ? (
              // Active breadcrumb (current page)
              <span className="font-semibold text-foreground" aria-current="page">
                {crumb.label}
              </span>
            ) : crumb.clickable ? (
              // Clickable parent breadcrumbs
              <>
                <Link to={crumb.path} className="text-accent transition-colors hover:text-accent/80">
                  {crumb.label}
                </Link>
                {index < breadcrumbs.length - 1 && (
                  <span aria-hidden="true" className="text-muted">
                    {separator}
                  </span>
                )}
              </>
            ) : (
              // Non-clickable parent breadcrumbs (sections without pages)
              <>
                <span className="text-muted">{crumb.label}</span>
                {index < breadcrumbs.length - 1 && (
                  <span aria-hidden="true" className="text-muted">
                    {separator}
                  </span>
                )}
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
