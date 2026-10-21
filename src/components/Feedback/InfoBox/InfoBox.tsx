import type { JSX } from 'react';
import clsx from 'clsx';
import type { InfoBoxProps } from './InfoBox.types';

/**
 * InfoBox displays explanatory content (methodology notes, caveats) in a quiet tinted panel.
 */
export function InfoBox({ children, icon, hideIcon = false, className }: InfoBoxProps): JSX.Element {
  return (
    <div className={clsx('flex max-w-3xl gap-3', className)}>
      {!hideIcon && icon && <div className="size-5 shrink-0 text-muted">{icon}</div>}
      <div className="min-w-0 flex-1 space-y-2 font-serif text-lg/7 text-foreground/80 italic">{children}</div>
    </div>
  );
}
