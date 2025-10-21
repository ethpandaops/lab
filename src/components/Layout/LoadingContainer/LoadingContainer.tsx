import { type JSX } from 'react';
import clsx from 'clsx';
import type { LoadingContainerProps } from './LoadingContainer.types';

export function LoadingContainer({ className, shimmer = true }: LoadingContainerProps): JSX.Element {
  if (shimmer) {
    return (
      <div
        className={clsx(
          'animate-shimmer bg-linear-to-r from-zinc-200 via-zinc-100 to-zinc-200 bg-[length:200%_100%] dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800',
          className
        )}
        aria-hidden="true"
      />
    );
  }

  return <div className={clsx('animate-pulse bg-zinc-200 dark:bg-zinc-800', className)} aria-hidden="true" />;
}
