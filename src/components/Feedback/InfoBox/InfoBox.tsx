import type { JSX } from 'react';
import clsx from 'clsx';
import { ChevronRightIcon } from '@heroicons/react/16/solid';
import type { InfoBoxProps } from './InfoBox.types';

/**
 * InfoBox displays explanatory content (methodology notes, caveats).
 *
 * With `summary`, the note collapses behind a single quiet line the reader can open, so method
 * text is available without sitting above the data on every visit.
 */
export function InfoBox({ children, summary, icon, hideIcon = false, className }: InfoBoxProps): JSX.Element {
  const body = <div className="min-w-0 flex-1 space-y-2 text-sm/6 text-foreground/80">{children}</div>;

  if (summary) {
    return (
      <details className={clsx('group', className)}>
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm text-muted transition-colors select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
          <ChevronRightIcon aria-hidden="true" className="size-4 transition-transform group-open:rotate-90" />
          {summary}
        </summary>
        <div className="mt-2 max-w-3xl pl-5">{body}</div>
      </details>
    );
  }

  return (
    <div className={clsx('flex gap-3 rounded-sm bg-muted/10 px-4 py-3', className)}>
      {!hideIcon && icon && <div className="size-5 shrink-0 text-muted">{icon}</div>}
      {body}
    </div>
  );
}
