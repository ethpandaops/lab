import type { JSX } from 'react';
import clsx from 'clsx';

export interface NodeStatusProps {
  online: boolean;
  /** Show "Online" / "Offline" beside the dot */
  showLabel?: boolean;
  className?: string;
}

/**
 * Live dot for a node; offline nodes get a hollow muted dot. The labelled form pulses while online.
 */
export function NodeStatus({ online, showLabel = false, className }: NodeStatusProps): JSX.Element {
  return (
    <span
      className={clsx('inline-flex items-center gap-1.5', className)}
      title={showLabel ? undefined : online ? 'Online' : 'Offline'}
    >
      <span className="relative flex size-2 shrink-0">
        {online && showLabel && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60" />
        )}
        <span
          className={clsx(
            'relative inline-flex size-2 rounded-full',
            online ? 'bg-success' : 'border border-muted bg-transparent'
          )}
        />
      </span>
      {showLabel && (
        <span className={clsx('text-xs/5 font-medium', online ? 'text-foreground' : 'text-muted')}>
          {online ? 'Online' : 'Offline'}
        </span>
      )}
    </span>
  );
}
