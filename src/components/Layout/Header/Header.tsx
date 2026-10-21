import { type JSX } from 'react';
import clsx from 'clsx';
import type { HeaderProps } from './Header.types';

const sizeStyles = {
  xs: {
    container: 'mb-2',
    title: 'text-sm/5 font-semibold text-foreground',
    description: 'text-xs text-muted',
  },
  sm: {
    container: 'mb-4',
    title: 'text-lg/7 font-semibold tracking-tight text-foreground',
    description: 'text-sm/6 text-muted',
  },
  md: {
    container: 'mb-10 border-b border-border pb-8',
    title: 'font-serif text-5xl/[1.05] font-medium tracking-tight text-foreground',
    description: 'mt-3 max-w-3xl font-serif text-xl/8 text-muted',
  },
  lg: {
    container: 'mb-8',
    title: 'text-3xl/9 font-semibold tracking-tight text-foreground',
    description: 'mt-1.5 max-w-3xl text-base/7 text-muted',
  },
  xl: {
    container: 'mb-10',
    title: 'text-4xl/10 font-semibold tracking-tight text-foreground',
    description: 'mt-2 max-w-3xl text-lg/8 text-muted',
  },
};

/**
 * Page and section heading. Hierarchy comes from size and weight alone; there is no decorative
 * accent bar.
 */
export function Header({ title, description, size = 'md', className }: HeaderProps): JSX.Element {
  const styles = sizeStyles[size];

  return (
    <div className={clsx(styles.container, className)}>
      <h1 className={styles.title}>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  );
}
