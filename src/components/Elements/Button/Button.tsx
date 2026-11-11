import { type JSX, isValidElement } from 'react';
import { Button as HeadlessButton } from '@headlessui/react';
import clsx from 'clsx';
import type { ButtonProps } from './Button.types';
import { buttonClassName } from './Button.styles';

// Icons are sized and placed from a box-less wrapper, so each icon stays a flex item of the button
const iconSizeStyles = {
  xs: '*:size-4', // 16px - proportional to xs
  sm: '*:size-4', // 16px - aligned with smaller button height
  md: '*:size-4', // 16px - aligned with smaller button height
  lg: '*:size-5', // 20px - proportional to lg
  xl: '*:size-5', // 20px - proportional to xl
};

const iconMarginStyles = {
  leading: '*:-ml-0.5',
  trailing: '*:-mr-0.5',
};

export function Button({
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
  ref,
  ...props
}: ButtonProps): JSX.Element {
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

    return (
      <span
        aria-hidden="true"
        className={clsx('contents', iconSizeStyles[size], !iconOnly && iconMarginStyles[position])}
      >
        {icon}
      </span>
    );
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
