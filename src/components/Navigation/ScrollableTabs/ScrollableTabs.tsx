import { useRef, useState, useEffect, type JSX } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { TabList } from '@headlessui/react';
import clsx from 'clsx';
import type { ScrollableTabsProps } from './ScrollableTabs.types';

/**
 * ScrollableTabs component - wraps TabList with horizontal scroll and navigation arrows
 *
 * Provides a scrollable container for tabs that may overflow horizontally.
 * Shows left/right navigation arrows when content is scrollable.
 *
 * @example
 * ```tsx
 * <TabGroup selectedIndex={selectedIndex} onChange={onChange}>
 *   <ScrollableTabs>
 *     <Tab hash="overview">Overview</Tab>
 *     <Tab hash="details">Details</Tab>
 *     <Tab hash="more">More</Tab>
 *   </ScrollableTabs>
 *   <TabPanels>
 *     <TabPanel>Overview content</TabPanel>
 *     <TabPanel>Details content</TabPanel>
 *     <TabPanel>More content</TabPanel>
 *   </TabPanels>
 * </TabGroup>
 * ```
 */
export function ScrollableTabs({ children, className }: ScrollableTabsProps): JSX.Element {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  /**
   * Check if scroll arrows should be visible
   */
  const updateArrowVisibility = (): void => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
  };

  /**
   * Scroll the container by a fixed amount
   */
  const scroll = (direction: 'left' | 'right'): void => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    const targetScroll =
      direction === 'left' ? container.scrollLeft - scrollAmount : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  };

  // Update arrow visibility on mount and when children change
  useEffect(() => {
    updateArrowVisibility();

    // Also update on window resize
    const handleResize = (): void => updateArrowVisibility();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [children]);

  return (
    <div className={clsx('relative', className)}>
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          type="button"
          onClick={() => scroll('left')}
          className="absolute top-0 left-0 z-10 flex h-full items-center bg-gradient-to-r from-surface to-transparent pr-8 pl-2 transition-opacity hover:opacity-80"
          aria-label="Scroll tabs left"
        >
          <ChevronLeftIcon className="h-5 w-5 text-foreground" />
        </button>
      )}

      {/* Scrollable TabList Container */}
      <div
        ref={scrollContainerRef}
        onScroll={updateArrowVisibility}
        className="scrollbar-hide overflow-x-auto"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <TabList className="flex gap-2 border-b border-border">{children}</TabList>
      </div>

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          type="button"
          onClick={() => scroll('right')}
          className="absolute top-0 right-0 z-10 flex h-full items-center bg-gradient-to-l from-surface to-transparent pr-2 pl-8 transition-opacity hover:opacity-80"
          aria-label="Scroll tabs right"
        >
          <ChevronRightIcon className="h-5 w-5 text-foreground" />
        </button>
      )}
    </div>
  );
}
