import type { JSX } from 'react';
import { useCallback } from 'react';
import clsx from 'clsx';

/** Preset time range options */
type TimeRangePreset = '7d' | '1m' | '6m' | '1y' | 'custom';

interface DateRangeSelectorProps {
  /** Start timestamp (Unix seconds) */
  from: number;
  /** End timestamp (Unix seconds) */
  to: number;
  /** Callback when range changes */
  onChange: (from: number, to: number) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

const PRESETS: { label: string; value: TimeRangePreset; days: number }[] = [
  { label: '7d', value: '7d', days: 7 },
  { label: '1m', value: '1m', days: 30 },
  { label: '6m', value: '6m', days: 180 },
  { label: '1y', value: '1y', days: 365 },
];

/**
 * Get the start of today (UTC) so the current day is always included
 */
function getTodayStart(): number {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return Math.floor(now.getTime() / 1000);
}

/**
 * Get the current preset based on the from/to values
 */
function getCurrentPreset(from: number, to: number): TimeRangePreset {
  const todayStart = getTodayStart();
  const diff = to - from;
  const tolerance = 86400; // 1 day tolerance

  // Check if 'to' is close to today (within tolerance)
  if (Math.abs(to - todayStart) > tolerance) {
    return 'custom';
  }

  for (const preset of PRESETS) {
    const expectedDiff = preset.days * 86400;
    if (Math.abs(diff - expectedDiff) < tolerance) {
      return preset.value;
    }
  }

  return 'custom';
}

/**
 * Format timestamp to date input value (YYYY-MM-DD)
 */
function formatDateInput(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

/**
 * Parse date input value to timestamp (start of day UTC)
 */
function parseDateInput(value: string): number {
  return Math.floor(new Date(value + 'T00:00:00Z').getTime() / 1000);
}

/**
 * Date range selector with preset buttons and custom date inputs
 */
export function DateRangeSelector({
  from,
  to,
  onChange,
  disabled = false,
  className,
}: DateRangeSelectorProps): JSX.Element {
  const currentPreset = getCurrentPreset(from, to);

  const handlePresetClick = useCallback(
    (days: number) => {
      const to = getTodayStart();
      const from = to - days * 86400;
      onChange(from, to);
    },
    [onChange]
  );

  const handleFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newFrom = parseDateInput(e.target.value);
      onChange(newFrom, to);
    },
    [to, onChange]
  );

  const handleToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTo = parseDateInput(e.target.value);
      onChange(from, newTo);
    },
    [from, onChange]
  );

  return (
    <div className={clsx('space-y-2', className)}>
      <label className="block text-sm/6 font-medium text-foreground">Time Range</label>

      {/* Preset buttons */}
      <div className="flex gap-2">
        {PRESETS.map(preset => (
          <button
            key={preset.value}
            type="button"
            onClick={() => handlePresetClick(preset.days)}
            disabled={disabled}
            className={clsx(
              'rounded-sm border px-3 py-1.5 text-sm/6 font-medium transition-colors',
              currentPreset === preset.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-surface text-muted hover:border-primary/50 hover:text-foreground',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label htmlFor="date-from" className="mb-1 block text-xs text-muted">
            From
          </label>
          <input
            type="date"
            id="date-from"
            value={formatDateInput(from)}
            onChange={handleFromChange}
            disabled={disabled}
            className={clsx(
              'w-full rounded-sm border border-border bg-surface px-2 py-1.5 text-sm/6 text-foreground',
              'focus:border-primary focus:ring-2 focus:ring-primary/50 focus:outline-none',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          />
        </div>
        <span className="mt-5 text-muted">-</span>
        <div className="flex-1">
          <label htmlFor="date-to" className="mb-1 block text-xs text-muted">
            To
          </label>
          <input
            type="date"
            id="date-to"
            value={formatDateInput(to)}
            onChange={handleToChange}
            disabled={disabled}
            className={clsx(
              'w-full rounded-sm border border-border bg-surface px-2 py-1.5 text-sm/6 text-foreground',
              'focus:border-primary focus:ring-2 focus:ring-primary/50 focus:outline-none',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          />
        </div>
      </div>
    </div>
  );
}

export { getCurrentPreset, formatDateInput, parseDateInput };
