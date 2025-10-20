export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * Indeterminate state (partially checked)
   */
  indeterminate?: boolean;
}
