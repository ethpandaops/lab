import type { JSX } from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './DatePicker.css';
import { clsx } from 'clsx';
import type { DatePickerProps } from './DatePicker.types';

/**
 * DatePicker component
 *
 * A themed date picker component using react-datepicker.
 * Supports inline display by default and integrates with the app's theme system.
 *
 * @example
 * ```tsx
 * const [date, setDate] = useState<Date | null>(new Date());
 * <DatePicker selected={date} onChange={setDate} />
 * ```
 */
export function DatePicker({ wrapperClassName, inline = true, ...props }: DatePickerProps): JSX.Element {
  return (
    <div className={clsx('date-picker-wrapper', wrapperClassName)}>
      <ReactDatePicker inline={inline} {...props} />
    </div>
  );
}
