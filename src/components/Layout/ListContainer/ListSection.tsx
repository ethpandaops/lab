import { type JSX, useState } from 'react';
import clsx from 'clsx';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Header } from '@/components/Layout/Header';
import type { ListSectionProps } from './ListSection.types';

/**
 * ListSection component for creating sections and subsections within lists.
 * Renders a section header with children - does not create nested containers.
 * Use within a ListContainer and wrap children in ListItems.
 */
export function ListSection({
  title,
  children,
  nested = false,
  collapsible = false,
  defaultCollapsed = false,
  showAccent = true,
  className,
  headerClassName,
  contentClassName,
}: ListSectionProps): JSX.Element {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Use smaller, lighter text for nested sections to create visual hierarchy
  const headerElement = nested ? (
    <div
      className={clsx(
        'text-xs font-semibold tracking-wider text-muted/70 uppercase',
        collapsible && 'cursor-pointer select-none',
        headerClassName
      )}
    >
      {title}
    </div>
  ) : (
    <Header
      size="xs"
      title={title}
      showAccent={showAccent}
      className={clsx(collapsible && 'cursor-pointer select-none', headerClassName)}
    />
  );

  const content = <div className={clsx('mt-1.5', nested && 'ml-2.5', contentClassName)}>{children}</div>;

  if (collapsible) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          {headerElement}
          <ChevronDownIcon className={clsx('size-4 text-muted transition-transform', isCollapsed && '-rotate-90')} />
        </button>
        {!isCollapsed && content}
      </div>
    );
  }

  return (
    <div className={className}>
      {headerElement}
      {content}
    </div>
  );
}
