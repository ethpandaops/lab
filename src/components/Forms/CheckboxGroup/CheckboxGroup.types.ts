export interface CheckboxOption {
  /**
   * Unique identifier for the checkbox
   */
  id: string;
  /**
   * Name attribute for the checkbox
   */
  name: string;
  /**
   * Label text
   */
  label: string;
  /**
   * Description text (block or inline depending on variant)
   */
  description?: string;
  /**
   * Whether the checkbox is checked by default
   */
  defaultChecked?: boolean;
  /**
   * Whether the checkbox is disabled
   */
  disabled?: boolean;
  /**
   * Whether the checkbox is in indeterminate state
   */
  indeterminate?: boolean;
  /**
   * Checked state (for controlled components)
   */
  checked?: boolean;
  /**
   * onChange handler
   */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export type CheckboxGroupVariant = 'list' | 'list-inline' | 'list-right' | 'simple';

export interface CheckboxGroupProps {
  /**
   * Legend/heading for the checkbox group
   */
  legend?: string;
  /**
   * Whether to visually hide the legend (but keep it for screen readers)
   */
  srOnlyLegend?: boolean;
  /**
   * Array of checkbox options
   */
  options: CheckboxOption[];
  /**
   * Layout variant
   * - list: Checkbox on left with description below label
   * - list-inline: Checkbox on left with description inline with label
   * - list-right: Checkbox on right with description below label
   * - simple: Simple list with heading and checkbox on right
   */
  variant?: CheckboxGroupVariant;
  /**
   * Additional CSS classes
   */
  className?: string;
}
