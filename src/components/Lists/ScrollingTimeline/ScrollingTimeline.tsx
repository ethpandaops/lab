import { type JSX, useEffect, useRef } from 'react';
import clsx from 'clsx';
import type { ScrollingTimelineProps, TimelineItem } from './ScrollingTimeline.types';

const defaultFormatTime = (timestamp: number): string => {
  return `${timestamp.toFixed(1)}s`;
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
        'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border dark:scrollbar-thumb-zinc-700',
        className
      )}
      style={{ height }}
    >
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute top-0 left-[4.75rem] h-full w-px bg-border dark:bg-zinc-800" />

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
                    'shrink-0 text-right text-xs/6 font-medium',
                    'w-14',
                    status === 'active' && 'text-primary',
                    status === 'completed' && 'text-foreground dark:text-zinc-400',
                    status === 'pending' && 'text-muted dark:text-zinc-600'
                  )}
                >
                  {formatTime(item.timestamp)}
                </div>

                {/* Timeline dot */}
                <div className="relative flex h-6 shrink-0 items-center">
                  <div
                    className={clsx(
                      'size-2 rounded-full transition-all duration-300',
                      status === 'active' && 'bg-primary ring-4 ring-primary/20 dark:ring-primary/10',
                      status === 'completed' && 'bg-foreground/40 dark:bg-zinc-600',
                      status === 'pending' && 'bg-border dark:bg-zinc-800'
                    )}
                  />
                </div>

                {/* Icon (optional) */}
                {item.icon && (
                  <div
                    className={clsx(
                      'flex h-6 shrink-0 items-center',
                      status === 'active' && 'text-primary',
                      status === 'completed' && 'text-foreground dark:text-zinc-400',
                      status === 'pending' && 'text-muted dark:text-zinc-600'
                    )}
                  >
                    {item.icon}
                  </div>
                )}

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div
                    className={clsx(
                      'text-sm/6 transition-colors duration-300',
                      status === 'active' && 'font-medium text-foreground dark:text-zinc-100',
                      status === 'completed' && 'text-foreground dark:text-zinc-300',
                      status === 'pending' && 'text-muted dark:text-zinc-500'
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
