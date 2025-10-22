import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type { Button as HeadlessButton } from '@headlessui/react';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'outline' | 'danger' | 'blank';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type ButtonRounded = 'normal' | 'full';

export interface ButtonProps extends ComponentPropsWithoutRef<typeof HeadlessButton> {
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
   * - 'normal': Uses rounded-xs or rounded-md
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
   * Enable hyper mode with pulsating border animation
   * @default false
   */
  hyper?: boolean;

  /**
   * Button content
   */
  children?: ReactNode;
}
