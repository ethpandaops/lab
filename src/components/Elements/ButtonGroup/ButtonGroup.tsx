import { type JSX } from 'react';
import { clsx } from 'clsx';
import type { ButtonGroupProps } from './ButtonGroup.types';

export function ButtonGroup({
  children,
  className = '',
  rounded = true,
  ref,
  ...props
}: ButtonGroupProps): JSX.Element {
  return (
    <span
      ref={ref}
      className={clsx(
        'isolate inline-flex',
        rounded && 'rounded-sm',
        // Rounded corners (only when rounded prop is true): only the group's outer corners
        rounded && '*:first:rounded-l-sm *:first:rounded-r-none! *:last:rounded-l-none! *:last:rounded-r-sm',
        rounded && '*:not-first:not-last:rounded-none!',
        // Square corners (when rounded prop is false)
        !rounded && '*:rounded-none!',
        // Negative margin for overlapping borders
        '*:not-first:-ml-px',
        // Focus z-index
        '*:focus:z-10',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
