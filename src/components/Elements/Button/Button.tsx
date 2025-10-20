import { forwardRef, cloneElement, isValidElement } from 'react';
import type { ButtonProps } from './Button.types';

const baseClasses = 'inline-flex items-center font-semibold disabled:cursor-not-allowed disabled:opacity-50';

const variantClasses = {
  primary: {
    base: 'bg-primary text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:shadow-none dark:hover:bg-primary/80 dark:focus-visible:outline-primary disabled:hover:bg-primary',
  },
  secondary: {
    base: 'bg-white text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20 dark:focus-visible:outline-white disabled:hover:bg-white dark:disabled:hover:bg-white/10',
  },
  soft: {
    base: 'bg-primary/10 text-primary shadow-xs hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:bg-primary/20 dark:text-primary dark:shadow-none dark:hover:bg-primary/30 dark:focus-visible:outline-primary disabled:hover:bg-primary/10 dark:disabled:hover:bg-primary/20',
  },
  outline: {
    base: 'bg-transparent text-foreground inset-ring-1 inset-ring-border hover:bg-muted/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border dark:text-foreground dark:inset-ring-border dark:hover:bg-white/20 dark:focus-visible:outline-border disabled:hover:bg-transparent',
  },
  danger: {
    base: 'bg-danger text-white shadow-xs hover:bg-danger/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger dark:shadow-none dark:hover:bg-danger/80 dark:focus-visible:outline-danger disabled:hover:bg-danger',
  },
  blank: {
    base: 'bg-transparent text-foreground hover:bg-muted/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground dark:text-foreground dark:hover:bg-white/10 dark:focus-visible:outline-foreground disabled:hover:bg-transparent',
  },
};

const sizeClasses = {
  normal: {
    xs: 'rounded-sm px-2 py-1 text-xs gap-1.5',
    sm: 'rounded-sm px-2 py-1 text-sm gap-1.5',
    md: 'rounded-md px-2.5 py-1.5 text-sm gap-1.5',
    lg: 'rounded-md px-3 py-2 text-sm gap-1.5',
    xl: 'rounded-md px-3.5 py-2.5 text-sm gap-2',
  },
  full: {
    xs: 'rounded-full px-2.5 py-1 text-xs gap-1.5',
    sm: 'rounded-full px-2.5 py-1 text-sm gap-1.5',
    md: 'rounded-full px-3 py-1.5 text-sm gap-1.5',
    lg: 'rounded-full px-3.5 py-2 text-sm gap-1.5',
    xl: 'rounded-full px-4 py-2.5 text-sm gap-2',
  },
};

const iconOnlyClasses = {
  xs: 'rounded-full p-1',
  sm: 'rounded-full p-1.5',
  md: 'rounded-full p-2',
  lg: 'rounded-full p-2',
  xl: 'rounded-full p-2.5',
};

const iconSizeClasses = {
  xs: 'size-4',
  sm: 'size-5',
  md: 'size-5',
  lg: 'size-5',
  xl: 'size-5',
};

const leadingIconMarginClasses = {
  xs: '-ml-0.5',
  sm: '-ml-0.5',
  md: '-ml-0.5',
  lg: '-ml-0.5',
  xl: '-ml-0.5',
};

const trailingIconMarginClasses = {
  xs: '-mr-0.5',
  sm: '-mr-0.5',
  md: '-mr-0.5',
  lg: '-mr-0.5',
  xl: '-mr-0.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      rounded = 'normal',
      leadingIcon,
      trailingIcon,
      iconOnly = false,
      nowrap = false,
      className = '',
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const variantClass = variantClasses[variant].base;
    const sizeClass = iconOnly ? iconOnlyClasses[size] : sizeClasses[rounded][size];
    const nowrapClass = nowrap ? 'whitespace-nowrap' : '';

    const classes = [baseClasses, variantClass, sizeClass, nowrapClass, className].filter(Boolean).join(' ');

    // For icon-only buttons
    if (iconOnly) {
      const icon = leadingIcon || trailingIcon;
      return (
        <button ref={ref} type={type} className={classes} {...props}>
          {icon &&
            isValidElement(icon) &&
            cloneElement(icon, {
              'aria-hidden': 'true',
              className: iconSizeClasses[size],
            } as Record<string, unknown>)}
        </button>
      );
    }

    return (
      <button ref={ref} type={type} className={classes} {...props}>
        {leadingIcon &&
          isValidElement(leadingIcon) &&
          cloneElement(leadingIcon, {
            'aria-hidden': 'true',
            className: `${iconSizeClasses[size]} ${leadingIconMarginClasses[size]}`,
          } as Record<string, unknown>)}
        {children}
        {trailingIcon &&
          isValidElement(trailingIcon) &&
          cloneElement(trailingIcon, {
            'aria-hidden': 'true',
            className: `${iconSizeClasses[size]} ${trailingIconMarginClasses[size]}`,
          } as Record<string, unknown>)}
      </button>
    );
  }
);

Button.displayName = 'Button';
