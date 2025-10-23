import type { ReactNode } from 'react';

export type RadioGroupVariant =
  | 'simple-list'
  | 'simple-inline'
  | 'description-list'
  | 'inline-description-list'
  | 'right-radio-list'
  | 'simple-right-radio-list'
  | 'table'
  | 'panel'
  | 'picker'
  | 'cards'
  | 'small-cards'
  | 'stacked-cards';

export interface RadioGroupProps {
  /**
   * Name attribute for the radio group
   */
  name: string;

  /**
   * Radio option children (composition API)
   */
  children: ReactNode;

  /**
   * Default selected value
   */
  defaultValue?: string;

  /**
   * Controlled selected value
   */
  value?: string;

  /**
   * Change handler called when selection changes
   */
  onChange?: (value: string) => void;

  /**
   * Visual variant of the radio group
   * @default 'simple-list'
   */
  variant?: RadioGroupVariant;

  /**
   * Legend/label for the radio group
   */
  legend?: string;

  /**
   * Description text below the legend
   */
  description?: string;

  /**
   * Accessible label when legend is not provided
   */
  'aria-label'?: string;

  /**
   * Disable all radio options
   * @default false
   */
  disabled?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export interface RadioOptionProps {
  /**
   * Unique identifier for the option
   */
  id: string;

  /**
   * Value to be submitted (defaults to id if not provided)
   */
  value?: string;

  /**
   * Display name/label for the option
   */
  name?: string;

  /**
   * Alternative title (used in some variants)
   */
  title?: string;

  /**
   * Description text for the option
   */
  description?: string;

  /**
   * Disable this specific option
   * @default false
   */
  disabled?: boolean;

  /**
   * Custom classes for the option (used in picker variant)
   */
  classes?: string;

  /**
   * Extra information (used in table/cards variants)
   */
  extraInfo?: string;

  /**
   * Additional information (used in table/stacked-cards variants)
   */
  additionalInfo?: string;

  /**
   * Child content to render inside the option
   * If provided, takes precedence over name/title
   */
  children?: ReactNode;
}
