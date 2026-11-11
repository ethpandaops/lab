import type { JSX, ReactNode } from 'react';
import clsx from 'clsx';

interface BlockProps {
  children: ReactNode;
  className?: string;
}

/** The frame every Foundations block renders in, on the page background of the toolbar's theme. */
export function Block({ children, className }: BlockProps): JSX.Element {
  return (
    <div className={clsx('my-6 rounded-sm bg-background p-4 font-sans text-sm text-foreground', className)}>
      {children}
    </div>
  );
}
