export interface CheckboxProps {
  /**
   * Whether the checkbox is checked
   */
  checked?: boolean;

  /**
   * Default checked state for uncontrolled component
   */
  defaultChecked?: boolean;

  /**
   * Callback when the checkbox state changes
   */
  onChange?: (checked: boolean) => void;

  /**
   * Whether the checkbox is disabled
   */
  disabled?: boolean;

  /**
   * Indeterminate state (partially checked)
   */
  indeterminate?: boolean;

  /**
   * HTML name attribute for forms
   */
  name?: string;

  /**
   * HTML value attribute for forms
   */
  value?: string;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * HTML id attribute
   */
  id?: string;

  /**
   * Auto focus the checkbox on mount
   */
  autoFocus?: boolean;

  /**
   * Tab index for keyboard navigation
   */
  tabIndex?: number;

  /**
   * ARIA label for accessibility
   */
  'aria-label'?: string;

  /**
   * ARIA described by for accessibility
   */
  'aria-describedby'?: string;
}
