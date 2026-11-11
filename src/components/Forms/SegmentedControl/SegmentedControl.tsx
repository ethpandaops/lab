import { type JSX, useLayoutEffect, useRef } from 'react';
import clsx from 'clsx';
import type { SegmentedControlProps } from './SegmentedControl.types';

/**
 * Single-choice control for short option sets such as time windows.
 *
 * Shares the 32px control height and rounded-sm radius with SelectMenu and Button so a row of
 * filters lines up. The selected segment uses the app-wide selected state (`bg-primary-15
 * text-primary`) rather than a solid fill. When the options overflow a narrow screen, the control
 * narrows to the whole segments around the selected one and scrolls sideways to the rest, so no
 * segment is cut in half.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>): JSX.Element {
  const groupRef = useRef<HTMLDivElement>(null);
  // Scrolls only the control, never the page, so the selection is visible without moving the reader
  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const fit = (): void => {
      group.style.width = '';
      const buttons = [...group.querySelectorAll('button')];
      const selected = buttons.findIndex(button => button.getAttribute('aria-pressed') === 'true');
      if (selected < 0 || group.scrollWidth <= group.clientWidth) {
        group.scrollLeft = 0;
        return;
      }
      // Segment edges from the start of the scrolled content
      const origin = group.getBoundingClientRect().left - group.scrollLeft;
      const edges = buttons.map(button => {
        const rect = button.getBoundingClientRect();
        return { left: rect.left - origin, right: rect.right - origin };
      });
      const start = edges[0];
      const selectedEdge = edges[selected];
      if (!start || !selectedEdge) return;
      const inset = start.left;
      const room = group.clientWidth - 2 * inset;
      // As many whole segments as fit, from as early as the selected one allows
      let left = selectedEdge.left;
      for (const edge of edges.slice(0, selected).reverse()) {
        if (selectedEdge.right - edge.left > room) break;
        left = edge.left;
      }
      let right = selectedEdge.right;
      for (const edge of edges.slice(selected + 1)) {
        if (edge.right - left > room) break;
        right = edge.right;
      }
      group.style.width = `${right - left + 2 * inset}px`;
      group.scrollLeft = left - inset;
    };
    fit();
    // Refit when the screen width changes, not on the height changes of a mobile browser's toolbar
    let width = window.innerWidth;
    const onResize = (): void => {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      fit();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [value, options.length]);

  return (
    <div
      ref={groupRef}
      role="group"
      aria-label={ariaLabel}
      className={clsx(
        'inline-flex h-8 max-w-full items-center gap-0.5 overflow-x-auto rounded-sm bg-surface p-0.5 ring-1 ring-border ring-inset',
        className
      )}
    >
      {options.map(option => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={clsx(
              'h-full shrink-0 rounded-xs px-2.5 text-xs font-medium whitespace-nowrap transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-50',
              isSelected ? 'bg-primary-15 text-primary' : 'text-muted hover:bg-muted-10 hover:text-foreground',
              'disabled:cursor-not-allowed disabled:text-muted-40 disabled:hover:bg-transparent'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
