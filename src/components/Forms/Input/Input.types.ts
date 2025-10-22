import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type { ButtonProps } from '@/components/Elements/Button/Button.types';

export type InputSize = 'sm' | 'md' | 'lg';

export type InputVariant = 'default' | 'error' | 'gray';

/**
 * Props for inline add-ons that appear inside the input border
 */
export interface InlineAddonProps {
  /**
   * The content to display (text or React element)
   */
  content: ReactNode;
  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * Props for external add-ons that appear outside the input border
 */
export interface ExternalAddonProps {
  /**
   * The content to display (text or React element)
   */
  content: ReactNode;
  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * Props for select dropdowns that can be inline with the input
 */
export interface SelectAddonProps {
  /**
   * The ID for the select element
   */
  id: string;
  /**
   * The name for the select element
   */
  name: string;
  /**
   * The options for the select dropdown
   */
  options: Array<{ value: string; label: string }>;
  /**
   * Optional default value
   */
  defaultValue?: string;
  /**
   * Optional value for controlled component
   */
  value?: string;
  /**
   * Optional onChange handler
   */
  onChange?: (value: string) => void;
  /**
   * ARIA label for accessibility
   */
  'aria-label'?: string;
  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * Props for trailing button action
 */
export interface TrailingButtonProps extends Omit<ButtonProps, 'size'> {
  /**
   * Button text or content
   */
  children: ReactNode;
}

export interface InputProps extends Omit<ComponentPropsWithoutRef<'input'>, 'size'> {
  /**
   * The size of the input
   * @default 'md'
   */
  size?: InputSize;

  /**
   * The visual variant of the input
   * @default 'default'
   */
  variant?: InputVariant;

  /**
   * Whether the input has an error state
   * @default false
   */
  error?: boolean;

  /**
   * Error message to display below the input
   */
  errorMessage?: string;

  /**
   * Leading icon element (displayed inside input on the left)
   */
  leadingIcon?: ReactNode;

  /**
   * Trailing icon element (displayed inside input on the right)
   */
  trailingIcon?: ReactNode;

  /**
   * External add-on displayed before the input (outside border)
   * Example: "https://" in a separate box
   */
  leadingAddon?: ExternalAddonProps;

  /**
   * External add-on displayed after the input (outside border)
   */
  trailingAddon?: ExternalAddonProps;

  /**
   * Inline add-on displayed before the input (inside border)
   * Example: "https://" or "$" inside the input border
   */
  leadingAddonInline?: InlineAddonProps;

  /**
   * Inline add-on displayed after the input (inside border)
   * Example: "USD" inside the input border
   */
  trailingAddonInline?: InlineAddonProps;

  /**
   * Select dropdown displayed before the input (inline with border)
   */
  leadingSelect?: SelectAddonProps;

  /**
   * Select dropdown displayed after the input (inline with border)
   */
  trailingSelect?: SelectAddonProps;

  /**
   * Button displayed after the input
   */
  trailingButton?: TrailingButtonProps;

  /**
   * Inset label displayed inside the input at the top
   */
  insetLabel?: string;

  /**
   * Overlapping label displayed above the input border
   */
  overlappingLabel?: string;

  /**
   * Keyboard shortcut hint displayed on the right inside the input
   * Example: "⌘K"
   */
  keyboardShortcut?: string;

  /**
   * Use gray background with bottom border only
   * @default false
   */
  grayBackground?: boolean;

  /**
   * Additional wrapper className
   */
  wrapperClassName?: string;

  /**
   * Label element (for standard label positioning)
   */
  label?: string;

  /**
   * Label className
   */
  labelClassName?: string;

  /**
   * Helper text displayed below the input
   */
  helperText?: string;
}
