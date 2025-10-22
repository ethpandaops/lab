/**
 * Props for the DatePicker component
 */
export interface DatePickerProps {
  /**
   * The selected date value
   */
  value: Date;
  /**
   * Callback fired when the date changes
   */
  onChange: (date: Date) => void;
  /**
   * Minimum selectable date
   */
  minDate?: Date;
  /**
   * Maximum selectable date
   */
  maxDate?: Date;
  /**
   * Controls the open state of the date picker calendar
   */
  isOpen?: boolean;
  /**
   * Callback fired when the calendar is closed
   */
  onClose?: () => void;
  /**
   * Additional CSS classes
   */
  className?: string;
}
