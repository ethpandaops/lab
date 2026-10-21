import type { JSX } from 'react';
import clsx from 'clsx';
import type { SegmentedControlProps } from './SegmentedControl.types';

/**
 * Single-choice control for short option sets such as time windows.
 *
 * Shares the 32px control height and rounded-sm radius with SelectMenu and Button so a row of
 * filters lines up. The selected segment uses the app-wide selected state (`bg-primary/15
 * text-primary`) rather than a solid fill.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>): JSX.Element {
  return (
    <div
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
              'h-full shrink-0 rounded-xs px-2.5 text-xs font-medium whitespace-nowrap transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50',
              isSelected ? 'bg-primary/15 text-primary' : 'text-muted hover:bg-muted/10 hover:text-foreground',
              'disabled:cursor-not-allowed disabled:text-muted/40 disabled:hover:bg-transparent'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
