import { type JSX, useRef, useCallback } from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import clsx from 'clsx';
import type { ScrollAreaProps, ScrollBarProps } from './ScrollArea.types';

/**
 * ScrollArea component that augments native scroll functionality with custom styling.
 * Built on Radix UI ScrollArea primitive for cross-browser consistency.
 */
export function ScrollArea({
  className,
  children,
  orientation = 'vertical',
  scrollHorizontalWithWheel = false,
  ...props
}: ScrollAreaProps): JSX.Element {
  const viewportRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!scrollHorizontalWithWheel || !viewportRef.current) return;

      // Only convert if there's vertical scroll delta and no horizontal
      if (e.deltaY !== 0 && e.deltaX === 0) {
        e.preventDefault();
        viewportRef.current.scrollLeft += e.deltaY;
      }
    },
    [scrollHorizontalWithWheel]
  );

  const showVertical = orientation === 'vertical' || orientation === 'both';
  const showHorizontal = orientation === 'horizontal' || orientation === 'both';

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={clsx('relative', className)}
      onWheel={handleWheel}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit]"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {showVertical && <ScrollBar orientation="vertical" />}
      {showHorizontal && <ScrollBar orientation="horizontal" />}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

/**
 * ScrollBar component for custom styled scrollbars within ScrollArea.
 */
export function ScrollBar({ className, orientation = 'vertical', ...props }: ScrollBarProps): JSX.Element {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={clsx(
        'flex touch-none p-px transition-colors select-none',
        orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent',
        orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent',
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}
