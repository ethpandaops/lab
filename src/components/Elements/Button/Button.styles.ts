import clsx from 'clsx';
import type { ButtonProps } from './Button.types';

const baseStyles =
  'inline-flex items-center font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-hidden';

const variantStyles = {
  primary: clsx(
    'bg-primary text-on-fill',
    'hover:bg-primary-hover disabled:hover:bg-primary',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
  ),
  secondary: clsx(
    'bg-surface text-foreground inset-ring inset-ring-border',
    'hover:bg-surface-hover disabled:hover:bg-surface',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
  ),
  soft: clsx(
    'bg-primary-soft text-primary',
    'hover:bg-primary-soft-hover disabled:hover:bg-primary-soft',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
  ),
  outline: clsx(
    'bg-transparent text-foreground inset-ring-1 inset-ring-border',
    'hover:bg-muted-hover disabled:hover:bg-transparent',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border'
  ),
  danger: clsx(
    'bg-danger text-on-solid',
    'hover:bg-danger-hover disabled:hover:bg-danger',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger'
  ),
  blank: clsx(
    'bg-transparent text-foreground',
    'hover:bg-muted-10 disabled:hover:bg-transparent',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
  ),
};

const sizeStyles = {
  xs: 'px-2 py-1 text-xs gap-1.5',
  sm: 'px-2 py-1.5 text-sm gap-1.5', // Aligned with Input sm
  md: 'px-2.5 py-1.5 text-sm gap-1.5', // Aligned with Input md
  lg: 'px-3 py-2 text-sm gap-1.5', // Aligned with Input lg
  xl: 'px-3.5 py-2.5 text-sm gap-2',
};

const roundedStyles = {
  xs: 'rounded-xs',
  sm: 'rounded-sm',
  md: 'rounded-sm',
  lg: 'rounded-sm',
  xl: 'rounded-sm',
  full: 'rounded-full',
};

const iconOnlySizeStyles = {
  xs: 'p-1',
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-2',
  xl: 'p-2.5',
};

/**
 * Class names for the button look, for elements that must stay links (router `Link`, `<a>`) but
 * should read as a button. Keeps link-buttons from copying, and drifting from, the button styles.
 */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  rounded,
  iconOnly = false,
  className,
}: Pick<ButtonProps, 'variant' | 'size' | 'rounded' | 'iconOnly'> & { className?: string } = {}): string {
  const radius = rounded ?? 'sm';
  return clsx(
    baseStyles,
    variantStyles[variant],
    iconOnly ? iconOnlySizeStyles[size] : sizeStyles[size],
    roundedStyles[radius],
    className
  );
}
