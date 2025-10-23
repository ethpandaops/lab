import { type JSX } from 'react';
import clsx from 'clsx';
import type { HeaderProps } from './Header.types';

const sizeStyles = {
  xs: {
    container: 'mb-2',
    title: 'mb-0.5 text-sm/tight font-bold text-foreground',
    description: 'text-xs text-muted',
    accent: 'mt-1 h-0.5 w-10 rounded-xs bg-linear-to-r from-primary to-accent',
  },
  sm: {
    container: 'mb-4',
    title: 'mb-1 text-2xl/tight font-bold text-foreground',
    description: 'text-sm text-muted',
    accent: 'mt-2 h-0.5 w-16 rounded-xs bg-linear-to-r from-primary to-accent',
  },
  md: {
    container: 'mb-8',
    title: 'mb-2 text-4xl/tight font-bold text-foreground',
    description: 'text-base text-muted',
    accent: 'mt-4 h-1 w-24 rounded-sm bg-linear-to-r from-primary to-accent',
  },
  lg: {
    container: 'mb-10',
    title: 'mb-2.5 text-5xl/tight font-bold text-foreground',
    description: 'text-lg text-muted',
    accent: 'mt-5 h-1 w-28 rounded-sm bg-linear-to-r from-primary to-accent',
  },
  xl: {
    container: 'mb-12',
    title: 'mb-3 text-6xl/tight font-bold text-foreground',
    description: 'text-xl text-muted',
    accent: 'mt-6 h-1.5 w-32 rounded-sm bg-linear-to-r from-primary to-accent',
  },
};

export function Header({ title, description, showAccent = true, size = 'md', className }: HeaderProps): JSX.Element {
  const styles = sizeStyles[size];

  return (
    <div className={clsx(styles.container, className)}>
      <h1 className={styles.title}>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
      {showAccent && <div className={styles.accent} />}
    </div>
  );
}
