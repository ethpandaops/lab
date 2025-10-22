import { type JSX } from 'react';
import { DatePicker as GrafanaDatePicker } from '@grafana/ui';
import clsx from 'clsx';
import type { DatePickerProps } from './DatePicker.types';
import './DatePicker.css';

/**
 * DatePicker component with a calendar view for selecting a date
 *
 * Wraps Grafana's DatePicker component with a clean, controlled interface.
 * The calendar can be controlled externally via the isOpen prop, or you can
 * manage visibility through a button or trigger element.
 *
 * @example
 * ```tsx
 * const [date, setDate] = useState(new Date());
 * const [open, setOpen] = useState(false);
 *
 * <Button onClick={() => setOpen(true)}>
 *   Select Date
 * </Button>
 * <DatePicker
 *   value={date}
 *   onChange={setDate}
 *   isOpen={open}
 *   onClose={() => setOpen(false)}
 * />
 * ```
 */
export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  isOpen = false,
  onClose,
  className,
}: DatePickerProps): JSX.Element {
  return (
    <div className={clsx('grafana-date-picker', className)}>
      <GrafanaDatePicker
        value={value}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
        isOpen={isOpen}
        onClose={onClose || (() => {})}
      />
    </div>
  );
}
