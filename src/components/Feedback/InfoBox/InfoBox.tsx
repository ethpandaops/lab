import type { JSX } from 'react';
import clsx from 'clsx';
import type { InfoBoxProps } from './InfoBox.types';

/**
 * InfoBox displays educational or descriptive content in a visually distinct container.
 * Features a subtle corner fold aesthetic reminiscent of technical documentation.
 */
export function InfoBox({ children, icon, hideIcon = false, className }: InfoBoxProps): JSX.Element {
  return (
    <div className={clsx('group relative', className)}>
      {/* Corner fold decoration - subtle */}
      <div className="absolute -top-px -right-px z-10">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-primary/60">
          <path d="M0 0 L20 0 L20 20 Z" fill="currentColor" fillOpacity="0.08" />
          <path d="M0 0 L20 20" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
        </svg>
      </div>

      {/* Main container */}
      <div className={clsx('relative overflow-hidden rounded-lg', 'bg-muted/30', 'border border-border/40')}>
        {/* Left accent strip */}
        <div className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-primary/70 via-primary/40 to-primary/20" />

        {/* Content */}
        <div className={clsx('relative flex gap-4 p-4 pl-5', !hideIcon && icon && 'items-start')}>
          {!hideIcon && icon && (
            <div className="shrink-0 text-primary/70">
              <div className="size-5">{icon}</div>
            </div>
          )}
          <div className="text-muted-foreground min-w-0 flex-1 space-y-2.5 text-sm/relaxed [&>p:first-child]:text-foreground/80">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
