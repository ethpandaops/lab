import { Children, type JSX, type ReactElement } from 'react';
import { clsx } from 'clsx';
import { Header } from '@/components/Layout/Header';
import { type SidebarProps, type SidebarSlotProps } from './Sidebar.types';

// Slot components - automatically wrap with semantic HTML tags
function SidebarMain({ children }: SidebarSlotProps): JSX.Element {
  return <main>{children}</main>;
}

function SidebarAside({ children }: SidebarSlotProps): JSX.Element {
  return <aside>{children}</aside>;
}

// Main Sidebar component
function SidebarComponent({
  children,
  showHeader = true,
  showNetworkSelector = true,
  showNetworkSummary = true,
  showBreadcrumbs = true,
  showNavLinks = true,
  fullWidth = true,
  sidebarPosition = 'left',
}: SidebarProps): JSX.Element {
  // Filter children to find Main and Aside slots
  const childArray = Children.toArray(children) as ReactElement[];
  const mainSlot = childArray.find(child => child.type === SidebarMain);
  const asideSlot = childArray.find(child => child.type === SidebarAside);

  // Determine grid columns based on sidebar position
  const gridCols = sidebarPosition === 'left' ? 'grid-cols-[300px_1fr]' : 'grid-cols-[1fr_300px]';

  // Render slots in correct order based on position
  const leftContent = sidebarPosition === 'left' ? asideSlot : mainSlot;
  const rightContent = sidebarPosition === 'left' ? mainSlot : asideSlot;

  return (
    <div className="min-h-dvh bg-base">
      {/* Header - conditional */}
      {showHeader && (
        <Header
          showNetworkSelector={showNetworkSelector}
          showNetworkSummary={showNetworkSummary}
          showBreadcrumbs={showBreadcrumbs}
          showNavLinks={showNavLinks}
        />
      )}

      {/* Two Column Grid */}
      <div
        className={clsx('py-8', {
          'px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16': showHeader,
          'mx-auto max-w-7xl': !fullWidth,
        })}
      >
        <div className={clsx('grid gap-6', gridCols)}>
          {leftContent}
          {rightContent}
        </div>
      </div>
    </div>
  );
}

// Attach slot components to main component
export const Sidebar = Object.assign(SidebarComponent, {
  Main: SidebarMain,
  Aside: SidebarAside,
});
