import { type ReactNode } from 'react';

export interface SelectMenuOption<T> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface SelectMenuProps<T> {
  /**
   * Currently selected option
   */
  value: T;

  /**
   * Callback when selection changes
   */
  onChange: (value: T) => void;

  /**
   * Array of options to display
   */
  options: SelectMenuOption<T>[];

  /**
   * Whether to show the label above the selector
   * @default false
   */
  showLabel?: boolean;

  /**
   * Label text
   */
  label?: string;

  /**
   * Placeholder when no value is selected
   */
  placeholder?: string;

  /**
   * Custom class name for the container
   */
  className?: string;

  /**
   * Whether the select is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Allow the selector to expand to fit content instead of full width
   * @default false
   */
  expandToFit?: boolean;

  /**
   * Apply rounded corners (rounded-lg)
   * @default false
   */
  rounded?: boolean;
}
