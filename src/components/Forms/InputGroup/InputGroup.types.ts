import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export type InputGroupVariant = 'default' | 'inset' | 'overlapping' | 'pill' | 'bottom-border';

export interface InputGroupProps extends Omit<ComponentPropsWithoutRef<'input'>, 'size'> {
  /**
   * Input label
   */
  label?: string;

  /**
   * Help text displayed below the input
   */
  helpText?: string;

  /**
   * Error message - when provided, input shows error state
   */
  error?: string;

  /**
   * Optional text displayed in the top-right corner
   */
  cornerHint?: string;

  /**
   * Icon displayed on the left inside the input
   */
  leadingIcon?: ReactNode;

  /**
   * Icon displayed on the right inside the input
   */
  trailingIcon?: ReactNode;

  /**
   * Add-on displayed outside the left border
   */
  leadingAddon?: ReactNode;

  /**
   * Add-on displayed outside the right border
   */
  trailingAddon?: ReactNode;

  /**
   * Text add-on displayed inside the left border
   */
  inlineLeadingAddon?: string;

  /**
   * Text add-on displayed inside the right border
   */
  inlineTrailingAddon?: string;

  /**
   * Dropdown selector displayed inside the left border
   */
  leadingDropdown?: ReactNode;

  /**
   * Dropdown selector displayed inside the right border
   */
  trailingDropdown?: ReactNode;

  /**
   * Button displayed on the right outside the border
   */
  trailingButton?: ReactNode;

  /**
   * Keyboard shortcut displayed inside the right border
   */
  keyboardShortcut?: string;

  /**
   * Visual style variant
   * - default: Standard input with label above
   * - inset: Label inside the input border
   * - overlapping: Label overlaps the top border
   * - pill: Rounded-full pill shape
   * - bottom-border: Gray background with bottom border only
   * @default 'default'
   */
  variant?: InputGroupVariant;

  /**
   * Additional wrapper class name
   */
  wrapperClassName?: string;
}
