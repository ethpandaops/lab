import { type JSX } from 'react';
import clsx from 'clsx';
import type { LoadingContainerProps } from './LoadingContainer.types';

export function LoadingContainer({ className, shimmer = true }: LoadingContainerProps): JSX.Element {
  if (shimmer) {
    return (
      <div
        className={clsx(
          'animate-shimmer bg-linear-to-r from-border/30 via-surface/50 to-border/30 bg-[length:200%_100%] dark:from-border/30 dark:via-surface/50 dark:to-border/30',
          className
        )}
        aria-hidden="true"
      />
    );
  }

  return <div className={clsx('animate-pulse bg-border/30 dark:bg-border/30', className)} aria-hidden="true" />;
}
