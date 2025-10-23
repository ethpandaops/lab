import { type JSX, useEffect, useRef } from 'react';
import clsx from 'clsx';
import type { ScrollingTimelineProps, TimelineItem } from './ScrollingTimeline.types';

const defaultFormatTime = (timestamp: number): string => {
  return `${(timestamp / 1000).toFixed(1)}s`;
};

export function ScrollingTimeline({
  items,
  currentTime,
  className,
  height = '500px',
  autoScroll = true,
  formatTime = defaultFormatTime,
}: ScrollingTimelineProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Auto-scroll to the active item based on currentTime
  useEffect(() => {
    if (!autoScroll || !containerRef.current) return;

    // Find the item that should be active based on currentTime
    const activeItem = items.find((item, index) => {
      const nextItem = items[index + 1];
      return item.timestamp <= currentTime && (!nextItem || nextItem.timestamp > currentTime);
    });

    if (activeItem) {
      const element = itemRefs.current.get(activeItem.id);
      if (element && containerRef.current) {
        // Scroll the active item to the center of the container
        const container = containerRef.current;
        const elementTop = element.offsetTop;
        const elementHeight = element.offsetHeight;
        const containerHeight = container.offsetHeight;

        const scrollTo = elementTop - containerHeight / 2 + elementHeight / 2;
        container.scrollTo({
          top: scrollTo,
          behavior: 'smooth',
        });
      }
    }
  }, [currentTime, items, autoScroll]);

  // Determine item status based on currentTime if not explicitly set
  const getItemStatus = (item: TimelineItem): 'active' | 'completed' | 'pending' => {
    if (item.status) return item.status;

    const nextItem = items.find(i => i.timestamp > item.timestamp);

    if (item.timestamp <= currentTime && (!nextItem || nextItem.timestamp > currentTime)) {
      return 'active';
    } else if (item.timestamp < currentTime) {
      return 'completed';
    } else {
      return 'pending';
    }
  };

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
        <div className="absolute top-0 left-[3.75rem] h-full w-px bg-border dark:bg-surface" />

        {/* Timeline items */}
        <div className="space-y-0">
          {items.map(item => {
            const status = getItemStatus(item);

            return (
              <div
                key={item.id}
                ref={el => {
                  if (el) {
                    itemRefs.current.set(item.id, el);
                  } else {
                    itemRefs.current.delete(item.id);
                  }
                }}
                className={clsx(
                  'relative flex items-start gap-x-4 px-4 py-3 transition-all duration-300',
                  status === 'active' && 'bg-primary/10 dark:bg-primary/5',
                  status === 'pending' && 'opacity-40'
                )}
              >
                {/* Timestamp */}
                <div
                  className={clsx(
                    'shrink-0 text-right text-xs font-medium',
                    'w-12',
                    status === 'active' && 'text-primary',
                    status === 'completed' && 'text-foreground dark:text-muted',
                    status === 'pending' && 'text-muted dark:text-muted'
                  )}
                >
                  {formatTime(item.timestamp)}
                </div>

                {/* Timeline dot */}
                <div className="relative flex shrink-0 items-center">
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
          })}
        </div>
      </div>
    </div>
  );
}
