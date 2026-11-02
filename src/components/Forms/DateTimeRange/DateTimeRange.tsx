import { type JSX, useState } from 'react';
import { Input } from '@/components/Forms/Input';
import { FilterField } from '@/components/Forms/FilterBar';

export interface DateTimeRangeProps {
  label: string;
  /** Unix seconds; undefined leaves that end open */
  from: number | undefined;
  to: number | undefined;
  onChange: (from: number | undefined, to: number | undefined) => void;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Unix seconds as a datetime-local value, in local time */
function toInput(seconds: number | undefined): string {
  if (seconds === undefined) return '';
  const date = new Date(seconds * 1000);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromInput(value: string): number | undefined {
  const ms = value === '' ? Number.NaN : new Date(value).getTime();
  return Number.isNaN(ms) ? undefined : Math.floor(ms / 1000);
}

/**
 * From and to date-time inputs for one time range filter in a FilterBar dialog, in local time.
 */
export function DateTimeRange({ label, from, to, onChange }: DateTimeRangeProps): JSX.Element {
  const field = (
    bound: 'From' | 'To',
    value: number | undefined,
    set: (v: number | undefined) => void
  ): JSX.Element => <EndInput label={`${label} ${bound.toLowerCase()}`} value={value} onChange={set} />;
  return (
    <FilterField label={label}>
      <div className="grid grid-cols-2 gap-2">
        {field('From', from, value => onChange(value, to))}
        {field('To', to, value => onChange(from, value))}
      </div>
    </FilterField>
  );
}

/** Keeps the typed text, so a half-entered date is not wiped while it does not parse yet */
function EndInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}): JSX.Element {
  const [text, setText] = useState(() => toInput(value));
  // Follow changes made outside this input, such as clearing every filter
  if (fromInput(text) !== value && toInput(fromInput(text)) !== toInput(value)) setText(toInput(value));

  return (
    <Input size="sm">
      <Input.Field
        type="datetime-local"
        aria-label={label}
        value={text}
        onChange={event => {
          setText(event.target.value);
          onChange(fromInput(event.target.value));
        }}
      />
    </Input>
  );
}
