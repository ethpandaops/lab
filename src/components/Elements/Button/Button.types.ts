import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'outline' | 'danger' | 'blank';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type ButtonRounded = 'normal' | 'full';

export interface ButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'children'> {
  /**
   * The visual style variant of the button
   * @default 'primary'
   */
  variant?: ButtonVariant;

  /**
   * The size of the button
   * @default 'md'
   */
  size?: ButtonSize;

  /**
   * The border radius style
   * - 'normal': Uses rounded-sm or rounded-md
   * - 'full': Uses rounded-full for pill-shaped buttons
   * @default 'normal'
   */
  rounded?: ButtonRounded;

  /**
   * Icon to display before the button text
   */
  leadingIcon?: ReactNode;

  /**
   * Icon to display after the button text
   */
  trailingIcon?: ReactNode;

  /**
   * Icon-only mode (circular button with just an icon)
   * When true, children will be ignored
   */
  iconOnly?: boolean;

  /**
   * Prevent text wrapping
   * @default false
   */
  nowrap?: boolean;

  /**
   * Button content
   */
  children?: ReactNode;
}
