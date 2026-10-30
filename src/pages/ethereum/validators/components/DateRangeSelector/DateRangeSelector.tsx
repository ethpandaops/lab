import type { ChangeEvent, JSX } from 'react';
import clsx from 'clsx';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';

type RangePreset = '7d' | '30d' | '90d' | '1y' | 'all' | 'custom';

interface DateRangeSelectorProps {
  /** Start of the first day (Unix seconds, UTC) */
  from: number;
  /** Start of the last day (Unix seconds, UTC); the day is included */
  to: number;
  onChange: (from: number, to: number) => void;
  /** Start of the earliest day with data, for "All" */
  earliest: number | undefined;
  disabled?: boolean;
  className?: string;
}

const DAY = 86_400;
const PRESET_DAYS: Partial<Record<RangePreset, number>> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };

const startOfDay = (ts: number): number => Math.floor(ts / DAY) * DAY;
const today = (): number => startOfDay(Date.now() / 1000);
const toInputValue = (ts: number): string => new Date(ts * 1000).toISOString().slice(0, 10);
const fromInputValue = (value: string): number => Date.parse(`${value}T00:00:00Z`) / 1000;

function currentPreset(from: number, to: number, earliest: number | undefined): RangePreset {
  if (to !== today()) return 'custom';
  if (earliest !== undefined && from <= earliest) return 'all';
  const days = (to - from) / DAY;
  const match = Object.entries(PRESET_DAYS).find(([, d]) => d === days);
  return (match?.[0] as RangePreset | undefined) ?? 'custom';
}

const dateInputClass = clsx(
  'h-8 rounded-sm border border-border bg-surface px-2 text-sm text-foreground tabular-nums',
  'transition-colors hover:border-primary/40 focus:border-primary focus:outline-hidden',
  'scheme-light dark:scheme-dark disabled:cursor-not-allowed disabled:opacity-50'
);

/**
 * Range presets back to the earliest available day, plus explicit from/to dates.
 */
export function DateRangeSelector({
  from,
  to,
  onChange,
  earliest,
  disabled = false,
  className,
}: DateRangeSelectorProps): JSX.Element {
  const preset = currentPreset(from, to, earliest);

  const selectPreset = (value: RangePreset): void => {
    const end = today();
    if (value === 'all') {
      if (earliest !== undefined) onChange(earliest, end);
      return;
    }
    const days = PRESET_DAYS[value];
    if (days !== undefined) onChange(end - days * DAY, end);
  };

  const min = earliest !== undefined ? toInputValue(earliest) : undefined;
  const max = toInputValue(today());

  return (
    <div className={clsx('flex flex-wrap items-center gap-2', className)}>
      <SegmentedControl<RangePreset>
        options={[
          { value: '7d', label: '7d', disabled },
          { value: '30d', label: '30d', disabled },
          { value: '90d', label: '90d', disabled },
          { value: '1y', label: '1y', disabled },
          { value: 'all', label: 'All', disabled: disabled || earliest === undefined },
        ]}
        value={preset}
        onChange={selectPreset}
        ariaLabel="Time range"
      />
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          aria-label="From"
          value={toInputValue(from)}
          min={min}
          max={toInputValue(to)}
          disabled={disabled}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            e.target.value && onChange(fromInputValue(e.target.value), to)
          }
          className={dateInputClass}
        />
        <span className="text-muted">–</span>
        <input
          type="date"
          aria-label="To"
          value={toInputValue(to)}
          min={toInputValue(from)}
          max={max}
          disabled={disabled}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            e.target.value && onChange(from, fromInputValue(e.target.value))
          }
          className={dateInputClass}
        />
      </div>
    </div>
  );
}
