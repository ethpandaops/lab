import { type JSX } from 'react';
import { Header } from '@/components/Header';
import { type StandardProps } from './Standard.types';

export function Standard({
  children,
  showHeader = true,
  showNetworkSelector = true,
  showNetworkSummary = true,
  showBreadcrumbs = true,
  showNavLinks = true,
  fullWidth = false,
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
      <main className={fullWidth ? 'px-4 py-8' : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}>{children}</main>
    </div>
  );
}
