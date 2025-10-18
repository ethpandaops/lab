import { type JSX } from 'react';
import { Header } from '@/components/Header';
import { type SidebarProps } from './Sidebar.types';

export function Sidebar({
  children,
  showHeader = false,
  showNetworkSelector = false,
  fullWidth = false,
  sidebarPosition = 'left',
}: SidebarProps): JSX.Element {
  // Determine grid columns based on sidebar position
  const gridCols = sidebarPosition === 'left' ? 'grid-cols-[300px_1fr]' : 'grid-cols-[1fr_300px]';

  return (
    <div className="min-h-dvh bg-slate-900">
      {/* Header - conditional */}
      {showHeader && <Header showNetworkSelector={showNetworkSelector} />}

      {/* Two Column Grid */}
      <div className={fullWidth ? 'px-4 py-8' : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}>
        <div className={`grid ${gridCols} gap-6`}>{children}</div>
      </div>
    </div>
  );
}
