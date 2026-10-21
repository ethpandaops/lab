import { type JSX } from 'react';
import clsx from 'clsx';
import type { CardProps, CardVariant } from './Card.types';

const variantStyles: Record<CardVariant, { container: string; header: string; main: string; footer: string }> = {
  default: {
    container: 'border-t-2 border-foreground',
    header: '',
    main: '',
    footer: '',
  },
  muted: {
    container: 'border-t-2 border-foreground',
    header: 'bg-surface dark:bg-background',
    main: '',
    footer: 'bg-surface dark:bg-background',
  },
  primary: {
    container: 'border-t-2 border-foreground',
    header: 'bg-primary/5 dark:bg-primary/10',
    main: '',
    footer: '',
  },
  accent: {
    container: 'border-t-2 border-foreground',
    header: 'bg-accent/5 dark:bg-accent/10',
    main: '',
    footer: 'bg-accent/5 dark:bg-accent/10',
  },
  elevated: {
    container: 'border-t-2 border-foreground',
    header: 'bg-background dark:bg-background',
    main: '',
    footer: '',
  },
  surface: {
    container: 'border-t-2 border-foreground',
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
  rounded: _rounded = true,
  allowContentOverflow = false,
}: CardProps): JSX.Element {
  const styles = variantStyles[variant];
  const headerContent =
    title !== undefined ? (
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-2xl/8 font-medium tracking-tight text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 font-serif text-base/6 text-muted italic">{subtitle}</p>}
        </div>
        {actions && <div className="-my-1 -mr-1.5 flex shrink-0 items-center gap-0.5">{actions}</div>}
      </div>
    ) : (
      header
    );

  return (
    <div
      data-slot="card"
      className={clsx(
        'relative',
        !allowContentOverflow && 'overflow-hidden',

        styles.container,
        isInteractive && 'cursor-pointer transition-colors duration-200 hover:border-primary',
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
      {headerContent && <div className={clsx('relative z-10 pt-3 pb-5', styles.header)}>{headerContent}</div>}
      <div
        data-slot="card-body"
        className={clsx('relative z-10 flex-1 [--card-inset-y:0px] [--card-inset:0px]', styles.main)}
      >
        {children}
      </div>
      {footer && <div className={clsx('relative z-10 mt-4 border-t border-border pt-3', styles.footer)}>{footer}</div>}
    </div>
  );
}
