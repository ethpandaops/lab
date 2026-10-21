import { type JSX } from 'react';
import clsx from 'clsx';
import type { CardProps, CardVariant } from './Card.types';

const variantStyles: Record<CardVariant, { container: string; header: string; main: string; footer: string }> = {
  default: {
    container: 'border-t border-border',
    header: '',
    main: '',
    footer: '',
  },
  muted: {
    container: 'border-t border-border',
    header: 'bg-surface dark:bg-background',
    main: '',
    footer: 'bg-surface dark:bg-background',
  },
  primary: {
    container: 'border-t border-border',
    header: 'bg-primary/5 dark:bg-primary/10',
    main: '',
    footer: '',
  },
  accent: {
    container: 'border-t border-border',
    header: 'bg-accent/5 dark:bg-accent/10',
    main: '',
    footer: 'bg-accent/5 dark:bg-accent/10',
  },
  elevated: {
    container: 'border-t border-border',
    header: 'bg-background dark:bg-background',
    main: '',
    footer: '',
  },
  surface: {
    container: 'border-t border-border',
    header: 'bg-surface dark:bg-background',
    main: 'bg-background dark:bg-background/50',
    footer: 'bg-surface dark:bg-background',
  },
};

/**
 * Core content container.
 *
 * Canvas variant: a card is a ruled section, not a box. A hairline across the top, a title row,
 * then content flush with the title's left edge. No background, outline or padding of its own.
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
          <h3 className="truncate text-base/7 font-semibold tracking-tight text-foreground">{title}</h3>
          {subtitle && <p className="text-sm/5 text-muted">{subtitle}</p>}
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
        isInteractive && 'cursor-pointer transition-colors duration-200 hover:border-primary/60',
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
      {headerContent && <div className={clsx('relative z-10 pt-4 pb-4', styles.header)}>{headerContent}</div>}
      <div
        data-slot="card-body"
        className={clsx('relative z-10 flex-1 pb-2 [--card-inset-y:0px] [--card-inset:0px]', styles.main)}
      >
        {children}
      </div>
      {footer && <div className={clsx('relative z-10 border-t border-border py-3', styles.footer)}>{footer}</div>}
    </div>
  );
}
