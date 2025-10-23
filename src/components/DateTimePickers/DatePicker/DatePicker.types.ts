import type { DatePickerProps as ReactDatePickerPropsType } from 'react-datepicker';

/**
 * Props for the DatePicker component
 *
 * Wraps react-datepicker with custom styling and configuration
 */
export type DatePickerProps = ReactDatePickerPropsType & {
  /**
   * Additional CSS classes to apply to the wrapper div
   */
  wrapperClassName?: string;
};
