import { type JSX, useEffect, useRef, useMemo, memo } from 'react';
import clsx from 'clsx';
import type { ScrollingTimelineProps, TimelineItem } from './ScrollingTimeline.types';

const defaultFormatTime = (timestamp: number): string => {
  return `${(timestamp / 1000).toFixed(1)}s`;
};

// Memoized TimelineItem component to prevent unnecessary re-renders
interface TimelineItemComponentProps {
  item: TimelineItem;
  status: 'active' | 'completed' | 'pending';
  formatTime: (timestamp: number) => string;
  onRefChange: (el: HTMLDivElement | null) => void;
}

const TimelineItemComponent = memo(function TimelineItemComponent({
  item,
  status,
  formatTime,
  onRefChange,
}: TimelineItemComponentProps): JSX.Element {
  return (
    <div
      ref={onRefChange}
      className={clsx(
        'relative flex items-center gap-x-2 px-3 py-1 transition-all duration-300',
        status === 'active' && 'bg-primary/10 dark:bg-primary/5',
        status === 'pending' && 'opacity-40'
      )}
    >
      {/* Timestamp */}
      <div
        className={clsx(
          'shrink-0 text-right text-xs font-medium',
          'w-10',
          status === 'active' && 'text-primary',
          status === 'completed' && 'text-foreground dark:text-muted',
          status === 'pending' && 'text-muted dark:text-muted'
        )}
      >
        {formatTime(item.timestamp)}
      </div>

      {/* Timeline dot */}
      <div className="relative ml-1 flex shrink-0 items-center">
        <div
          className={clsx(
            'size-1.5 rounded-full transition-all duration-300',
            status === 'active' && 'bg-primary ring-3 ring-primary/20 dark:ring-primary/10',
            status === 'completed' && 'bg-foreground/40 dark:bg-border',
            status === 'pending' && 'bg-border dark:bg-surface'
          )}
        />
      </div>

      {/* Icon (optional) */}
      {item.icon && (
        <div
          className={clsx(
            'flex shrink-0 items-center',
            status === 'active' && 'text-primary',
            status === 'completed' && 'text-foreground dark:text-muted',
            status === 'pending' && 'text-muted dark:text-muted'
          )}
        >
          {item.icon}
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div
          className={clsx(
            'truncate text-xs transition-colors duration-300',
            status === 'active' && 'font-medium text-foreground dark:text-foreground',
            status === 'completed' && 'text-foreground dark:text-foreground',
            status === 'pending' && 'text-muted dark:text-muted'
          )}
        >
          {item.content}
        </div>
      </div>
    </div>
  );
});

export function ScrollingTimeline({
  items,
  currentTime,
  className,
  height,
  autoScroll = true,
  formatTime = defaultFormatTime,
}: ScrollingTimelineProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Store stable ref callbacks per item ID to prevent TimelineItemComponent re-renders
  const refCallbacks = useRef<Map<string, (el: HTMLDivElement | null) => void>>(new Map());

  // Auto-scroll to the active item based on currentTime
  const lastScrolledItemRef = useRef<string | null>(null);

  // Pre-calculate all item statuses - O(n) instead of O(n²)
  const itemStatuses = useMemo(() => {
    const statuses = new Map<string, 'active' | 'completed' | 'pending'>();

    // Find the active item index
    let activeIndex = -1;
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].timestamp <= currentTime) {
        activeIndex = i;
        break;
      }
    }

    // Set statuses based on active index
    items.forEach((item, index) => {
      if (item.status) {
        statuses.set(item.id, item.status);
      } else if (index === activeIndex) {
        statuses.set(item.id, 'active');
      } else if (index < activeIndex) {
        statuses.set(item.id, 'completed');
      } else {
        statuses.set(item.id, 'pending');
      }
    });

    return statuses;
  }, [items, currentTime]);

  useEffect(() => {
    if (!autoScroll || !containerRef.current) return;

    // Find the active item ID from pre-calculated statuses
    let activeItemId: string | null = null;
    for (const [id, status] of itemStatuses) {
      if (status === 'active') {
        activeItemId = id;
        break;
      }
    }

    if (activeItemId) {
      // Only scroll if the active item has changed to avoid unnecessary scrolling
      if (lastScrolledItemRef.current === activeItemId) return;
      lastScrolledItemRef.current = activeItemId;

      const element = itemRefs.current.get(activeItemId);
      if (element && containerRef.current) {
        // Scroll the active item to the center of the container
        const container = containerRef.current;
        const elementTop = element.offsetTop;
        const elementHeight = element.offsetHeight;
        const containerHeight = container.clientHeight;
        const scrollHeight = container.scrollHeight;

        // Calculate desired scroll position (center the active item)
        let scrollTo = elementTop - containerHeight / 2 + elementHeight / 2;

        // Clamp scrollTo to valid range [0, maxScroll]
        const maxScroll = scrollHeight - containerHeight;
        scrollTo = Math.max(0, Math.min(scrollTo, maxScroll));

        // Use instant scrolling to avoid animation issues
        container.scrollTop = scrollTo;
      }
    }
  }, [currentTime, items, autoScroll, itemStatuses]);

  return (
    <div
      ref={containerRef}
      className={clsx(
        'overflow-x-hidden overflow-y-auto rounded-sm bg-background dark:bg-surface',
        'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border dark:scrollbar-thumb-border',
        !height && 'flex-1',
        className
      )}
      style={height ? { height } : undefined}
    >
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute top-0 left-14 h-full w-px bg-border dark:bg-surface" />

        {/* Timeline items */}
        <div className="space-y-0">
          {items.map(item => {
            const status = itemStatuses.get(item.id) || 'pending';

            // Get or create stable ref callback for this item
            let refCallback = refCallbacks.current.get(item.id);
            if (!refCallback) {
              refCallback = (el: HTMLDivElement | null) => {
                if (el) {
                  itemRefs.current.set(item.id, el);
                } else {
                  itemRefs.current.delete(item.id);
                }
              };
              refCallbacks.current.set(item.id, refCallback);
            }

            return (
              <TimelineItemComponent
                key={item.id}
                item={item}
                status={status}
                formatTime={formatTime}
                onRefChange={refCallback}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
