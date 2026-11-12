import { type JSX } from 'react';
import clsx from 'clsx';
import type { CardProps, CardVariant } from './Card.types';

const variantStyles: Record<CardVariant, { container: string; header: string; main: string; footer: string }> = {
  default: {
    container: 'bg-surface outline -outline-offset-1 outline-border',
    header: '',
    main: '',
    footer: '',
  },
  muted: {
    container: 'bg-surface outline -outline-offset-1 outline-border',
    header: 'bg-panel',
    main: '',
    footer: 'bg-panel',
  },
  primary: {
    container: 'bg-surface outline -outline-offset-1 outline-border',
    header: 'bg-primary-wash',
    main: '',
    footer: '',
  },
  accent: {
    container: 'bg-surface outline -outline-offset-1 outline-border',
    header: 'bg-accent-wash',
    main: '',
    footer: 'bg-accent-wash',
  },
  elevated: {
    container: 'bg-surface outline -outline-offset-1 outline-border',
    header: 'bg-background',
    main: '',
    footer: '',
  },
  surface: {
    container: 'bg-surface outline -outline-offset-1 outline-border',
    header: 'bg-panel',
    main: 'bg-well',
    footer: 'bg-panel',
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
  rounded = true,
  allowContentOverflow = false,
}: CardProps): JSX.Element {
  const styles = variantStyles[variant];
  const headerContent =
    title !== undefined ? (
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm/6 font-semibold wrap-break-word text-foreground">{title}</h3>
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
        'relative divide-y divide-border',
        !allowContentOverflow && 'overflow-hidden',
        rounded && 'rounded-sm',
        styles.container,
        isInteractive && 'cursor-pointer transition-colors duration-200 hover:outline-primary-40',
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
      <div
        data-slot="card-body"
        className={clsx('relative z-10 flex-1 p-4 card-inset empty:hidden sm:p-5', styles.main)}
      >
        {children}
      </div>
      {footer && <div className={clsx('relative z-10 px-4 py-3 sm:px-5', styles.footer)}>{footer}</div>}
    </div>
  );
}
