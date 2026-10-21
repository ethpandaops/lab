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

/**
 * Core content container.
 *
 * Every card shares one anatomy: a compact header row (title, optional subtitle, right-aligned
 * actions) separated by a single rule from a body whose inset matches the header, so titles and
 * content line up on the same left edge.
 */
export function Card({
  children,
  title,
  subtitle,
  actions,
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
  const headerContent =
    title !== undefined ? (
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm/6 font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs/5 text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="-my-1 -mr-1.5 flex shrink-0 items-center gap-0.5">{actions}</div>}
      </div>
    ) : (
      header
    );

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
      {headerContent && <div className={clsx('relative z-10 px-4 py-3 sm:px-5', styles.header)}>{headerContent}</div>}
      <div className={clsx('relative z-10 flex-1 p-4 sm:p-5', styles.main)}>{children}</div>
      {footer && <div className={clsx('relative z-10 px-4 py-3 sm:px-5', styles.footer)}>{footer}</div>}
    </div>
  );
}
