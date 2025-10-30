import { type JSX } from 'react';
import clsx from 'clsx';
import type { CardProps, CardVariant } from './Card.types';

const variantStyles: Record<CardVariant, { container: string; header: string; main: string; footer: string }> = {
  default: {
    container:
      'bg-surface shadow-sm dark:bg-surface dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-border',
    header: '',
    main: '',
    footer: '',
  },
  muted: {
    container:
      'bg-surface shadow-sm dark:bg-surface dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-border',
    header: 'bg-surface dark:bg-background',
    main: '',
    footer: 'bg-surface dark:bg-background',
  },
  primary: {
    container:
      'bg-surface shadow-sm dark:bg-surface dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-border',
    header: 'bg-primary/5 dark:bg-primary/10',
    main: '',
    footer: '',
  },
  accent: {
    container:
      'bg-surface shadow-sm dark:bg-surface dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-border',
    header: 'bg-accent/5 dark:bg-accent/10',
    main: '',
    footer: 'bg-accent/5 dark:bg-accent/10',
  },
  elevated: {
    container:
      'bg-surface shadow-sm dark:bg-surface dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-border',
    header: 'bg-background dark:bg-background',
    main: '',
    footer: '',
  },
  surface: {
    container:
      'bg-surface shadow-sm dark:bg-surface dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-border',
    header: 'bg-surface dark:bg-background',
    main: 'bg-background dark:bg-background/50',
    footer: 'bg-surface dark:bg-background',
  },
};

export function Card({
  children,
  header,
  footer,
  variant = 'default',
  className,
  isInteractive = false,
  onClick,
  featureImage,
  rounded = false,
  allowContentOverflow = false,
}: CardProps): JSX.Element {
  const styles = variantStyles[variant];

  return (
    <div
      className={clsx(
        'relative divide-y divide-border dark:divide-border',
        !allowContentOverflow && 'overflow-hidden',
        rounded && 'rounded-sm',
        styles.container,
        isInteractive &&
          'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs dark:hover:shadow-none',
        className
      )}
      onClick={isInteractive ? onClick : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      {featureImage && (
        <div className="pointer-events-none absolute inset-0 z-0 opacity-20 [&_img]:size-full [&_img]:object-cover">
          {featureImage}
        </div>
      )}
      {header && <div className={clsx('relative z-10 px-4 py-5 sm:px-6', styles.header)}>{header}</div>}
      <div className={clsx('relative z-10 px-4 py-5 sm:p-6', styles.main)}>{children}</div>
      {footer && <div className={clsx('relative z-10 px-4 py-4 sm:px-6', styles.footer)}>{footer}</div>}
    </div>
  );
}
