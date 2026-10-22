import { forwardRef, cloneElement, isValidElement } from 'react';
import { Button as HeadlessButton } from '@headlessui/react';
import clsx from 'clsx';
import type { ButtonProps } from './Button.types';
import { buttonClassName } from './Button.styles';
import './Button.css';

const iconSizeStyles = {
  xs: 'size-4', // 16px - proportional to xs
  sm: 'size-4', // 16px - aligned with smaller button height
  md: 'size-4', // 16px - aligned with smaller button height
  lg: 'size-5', // 20px - proportional to lg
  xl: 'size-5', // 20px - proportional to xl
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
      rounded,
      leadingIcon,
      trailingIcon,
      iconOnly = false,
      nowrap = false,
      hyper = false,
      className,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const classes = buttonClassName({
      variant,
      size,
      rounded,
      iconOnly,
      className: clsx(
        nowrap && 'whitespace-nowrap',
        hyper && (variant === 'blank' ? 'button-hyper-blank' : 'button-hyper'),
        className
      ),
    });

    // Render icon with appropriate styles
    const renderIcon = (icon: React.ReactNode, position: 'leading' | 'trailing'): React.ReactNode | null => {
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
        <HeadlessButton ref={ref} type={type} className={classes} {...props}>
          {renderIcon(icon, 'leading')}
        </HeadlessButton>
      );
    }

    return (
      <HeadlessButton ref={ref} type={type} className={classes} {...props}>
        {renderIcon(leadingIcon, 'leading')}
        {children}
        {renderIcon(trailingIcon, 'trailing')}
      </HeadlessButton>
    );
  }
);

Button.displayName = 'Button';
