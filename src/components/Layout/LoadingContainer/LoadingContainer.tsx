import { type JSX } from 'react';
import clsx from 'clsx';
import type { LoadingContainerProps } from './LoadingContainer.types';

export function LoadingContainer({ className, shimmer = true }: LoadingContainerProps): JSX.Element {
  if (shimmer) {
    return (
      <div
        className={clsx(
          'animate-shimmer rounded-xs bg-linear-to-r from-border/30 via-surface/50 to-border/30 bg-[length:200%_100%]',
          className
        )}
        aria-hidden="true"
      />
    );
  }

  return <div className={clsx('animate-pulse rounded-xs bg-border/30', className)} aria-hidden="true" />;
}
