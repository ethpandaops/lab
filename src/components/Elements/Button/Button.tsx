import { forwardRef, cloneElement, isValidElement } from 'react';
import { Button as HeadlessButton } from '@headlessui/react';
import clsx from 'clsx';
import type { ButtonProps } from './Button.types';

const baseStyles =
  'inline-flex items-center font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 focus:outline-hidden';

const variantStyles = {
  primary: clsx(
    'bg-primary text-white shadow-xs',
    'hover:bg-primary/90 disabled:hover:bg-primary',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    'dark:shadow-none dark:hover:bg-primary/80 dark:focus-visible:outline-primary'
  ),
  secondary: clsx(
    'bg-white text-gray-900 shadow-xs inset-ring inset-ring-gray-300',
    'hover:bg-gray-50 disabled:hover:bg-white',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900',
    'dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5',
    'dark:hover:bg-white/20 dark:disabled:hover:bg-white/10 dark:focus-visible:outline-white'
  ),
  soft: clsx(
    'bg-primary/10 text-primary shadow-xs',
    'hover:bg-primary/20 disabled:hover:bg-primary/10',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    'dark:bg-primary/20 dark:text-primary dark:shadow-none',
    'dark:hover:bg-primary/30 dark:disabled:hover:bg-primary/20 dark:focus-visible:outline-primary'
  ),
  outline: clsx(
    'bg-transparent text-foreground inset-ring-1 inset-ring-border',
    'hover:bg-muted/10 disabled:hover:bg-transparent',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border',
    'dark:text-foreground dark:inset-ring-border',
    'dark:hover:bg-white/20 dark:focus-visible:outline-border'
  ),
  danger: clsx(
    'bg-danger text-white shadow-xs',
    'hover:bg-danger/90 disabled:hover:bg-danger',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger',
    'dark:shadow-none dark:hover:bg-danger/80 dark:focus-visible:outline-danger'
  ),
  blank: clsx(
    'bg-transparent text-foreground',
    'hover:bg-muted/10 disabled:hover:bg-transparent',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
    'dark:text-foreground dark:hover:bg-white/10 dark:focus-visible:outline-foreground'
  ),
};

const sizeStyles = {
  normal: {
    xs: 'rounded-xs px-2 py-1 text-xs gap-1.5',
    sm: 'rounded-xs px-2 py-1 text-sm gap-1.5',
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

const iconOnlyStyles = {
  xs: 'rounded-full p-1',
  sm: 'rounded-full p-1.5',
  md: 'rounded-full p-2',
  lg: 'rounded-full p-2',
  xl: 'rounded-full p-2.5',
};

const iconSizeStyles = {
  xs: 'size-4',
  sm: 'size-5',
  md: 'size-5',
  lg: 'size-5',
  xl: 'size-5',
};

const iconMarginStyles = {
  leading: '-ml-0.5',
  trailing: '-mr-0.5',
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
      className,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const sizeStyle = iconOnly ? iconOnlyStyles[size] : sizeStyles[rounded][size];

    const buttonClassName = clsx(
      baseStyles,
      variantStyles[variant],
      sizeStyle,
      nowrap && 'whitespace-nowrap',
      className
    );

    // Render icon with appropriate styles
    const renderIcon = (icon: React.ReactNode, position: 'leading' | 'trailing') => {
      if (!icon || !isValidElement(icon)) return null;

      return cloneElement(icon, {
        'aria-hidden': 'true',
        className: clsx(iconSizeStyles[size], !iconOnly && iconMarginStyles[position]),
      } as Record<string, unknown>);
    };

    // For icon-only buttons
    if (iconOnly) {
      const icon = leadingIcon || trailingIcon;
      return (
        <HeadlessButton ref={ref} type={type} className={buttonClassName} {...props}>
          {renderIcon(icon, 'leading')}
        </HeadlessButton>
      );
    }

    return (
      <HeadlessButton ref={ref} type={type} className={buttonClassName} {...props}>
        {renderIcon(leadingIcon, 'leading')}
        {children}
        {renderIcon(trailingIcon, 'trailing')}
      </HeadlessButton>
    );
  }
);

Button.displayName = 'Button';
