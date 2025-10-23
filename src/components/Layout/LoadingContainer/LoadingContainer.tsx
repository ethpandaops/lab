import { type JSX } from 'react';
import clsx from 'clsx';
import type { LoadingContainerProps } from './LoadingContainer.types';

export function LoadingContainer({ className, shimmer = true }: LoadingContainerProps): JSX.Element {
  if (shimmer) {
    return (
      <div
        className={clsx(
          'animate-shimmer bg-linear-to-r from-border via-surface to-border bg-[length:200%_100%] dark:from-border dark:via-surface dark:to-border',
          className
        )}
        aria-hidden="true"
      />
    );
  }

  return <div className={clsx('animate-pulse bg-border dark:bg-border', className)} aria-hidden="true" />;
}
