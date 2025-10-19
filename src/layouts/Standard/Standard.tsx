import { type JSX } from 'react';
import { clsx } from 'clsx';
import { Header } from '@/components/Header';
import { type StandardProps } from './Standard.types';

export function Standard({
  children,
  showHeader = true,
  showNetworkSelector = true,
  showNetworkSummary = true,
  showBreadcrumbs = true,
  showNavLinks = true,
  fullWidth = true,
}: StandardProps): JSX.Element {
  return (
    <div className="min-h-dvh bg-slate-900">
      {/* Header - conditional */}
      {showHeader && (
        <Header
          showNetworkSelector={showNetworkSelector}
          showNetworkSummary={showNetworkSummary}
          showBreadcrumbs={showBreadcrumbs}
          showNavLinks={showNavLinks}
        />
      )}

      {/* Main Content */}
      <main
        className={clsx('py-8', {
          'px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16': showHeader,
          'mx-auto max-w-7xl': !fullWidth,
        })}
      >
        {children}
      </main>
    </div>
  );
}
