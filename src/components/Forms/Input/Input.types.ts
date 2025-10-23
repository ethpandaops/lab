import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type { ButtonProps } from '@/components/Elements/Button/Button.types';

export type InputSize = 'sm' | 'md' | 'lg';

/**
 * Props for Input.Leading and Input.Trailing slot components
 */
export interface InputSlotProps {
  /**
   * Content to render in the slot
   * Can be:
   * - Icon component (e.g., <EnvelopeIcon />)
   * - Text addon (e.g., "$", "USD")
   * - Select element
   * - Button component
   */
  children: ReactNode;
  /**
   * Optional className for styling
   */
  className?: string;
  /**
   * Explicit type hint for the slot content
   * Helps with layout decisions and avoids fragile type detection
   * @default undefined (auto-detect)
   */
  type?: 'icon' | 'text' | 'select' | 'button';
}

/**
 * Props for Input.Field component
 */
export interface InputFieldProps extends Omit<ComponentPropsWithoutRef<'input'>, 'size'> {
  /**
   * Optional className for styling
   */
  className?: string;
  /**
   * Hint for mobile keyboards about what type of data to expect
   * Improves mobile UX by showing appropriate keyboard layout
   * @default undefined
   */
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  /**
   * Ref to the input element (React 19+ pattern)
   */
  ref?: React.Ref<HTMLInputElement>;
}

/**
 * Props for add-ons that can appear inside or outside the input border
 */
export interface AddonProps {
  /**
   * The content to display (text or React element)
   */
  content: ReactNode;
  /**
   * Whether the addon appears inside the input border (inline) or outside (external)
   * @default false (external)
   */
  inline?: boolean;
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

export interface InputProps {
  /**
   * Compound component children (Input.Leading, Input.Field, Input.Trailing)
   *
   * @example
   * ```tsx
   * <Input>
   *   <Input.Leading><EnvelopeIcon /></Input.Leading>
   *   <Input.Field placeholder="you@example.com" />
   * </Input>
   * ```
   */
  children?: ReactNode;

  /**
   * The size of the input
   * @default 'md'
   */
  size?: InputSize;

  /**
   * Whether the input has an error state
   * Automatically applies error styling (red border, red text)
   * @default false
   */
  error?: boolean;

  /**
   * Error message to display below the input
   */
  errorMessage?: string;

  /**
   * Make addons inline by default (inside border)
   * When true, addons appear inside the input border
   * @default false
   */
  inline?: boolean;

  /**
   * Label text for the input
   * Used with labelVariant to control label positioning
   */
  label?: string;

  /**
   * Label positioning variant
   * - 'standard': Label appears above the input (default)
   * - 'inset': Label appears inside the input at the top
   * - 'overlapping': Label overlaps the input border
   * @default 'standard'
   */
  labelVariant?: 'standard' | 'inset' | 'overlapping';

  /**
   * Additional wrapper className
   */
  wrapperClassName?: string;

  /**
   * Label className (only applies when labelVariant is 'standard')
   */
  labelClassName?: string;

  /**
   * Helper text displayed below the input
   */
  helperText?: string;

  /**
   * HTML id attribute for the input
   */
  id?: string;

  /**
   * Whether the input is required
   */
  required?: boolean;

  /**
   * Corner hint text displayed next to the label (e.g., "Optional", "Required")
   */
  cornerHint?: string;
}
