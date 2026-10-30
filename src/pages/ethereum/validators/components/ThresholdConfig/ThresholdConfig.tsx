import type { JSX } from 'react';
import clsx from 'clsx';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { Popover, PopoverButton, PopoverPanel } from '@/components/Overlays/Popover';

export interface ThresholdValues {
  inclusionRate: number;
  correctnessRate: number;
  syncParticipation: number;
  minBalance: number;
  inclusionDelay: number;
  blockProductionRate: number;
}

interface ThresholdConfigProps {
  /** Current threshold values */
  values: ThresholdValues;
  /** Callback when thresholds change */
  onChange: (values: ThresholdValues) => void;
  /** Whether the config is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

const DEFAULT_THRESHOLDS: ThresholdValues = {
  inclusionRate: 95,
  correctnessRate: 98,
  syncParticipation: 95,
  minBalance: 31.95,
  inclusionDelay: 1.5,
  blockProductionRate: 95,
};

interface ThresholdInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  disabled?: boolean;
}

/**
 * Individual threshold input with slider
 */
function ThresholdInput({ label, value, onChange, min, max, step, unit, disabled }: ThresholdInputProps): JSX.Element {
  return (
    <div className="flex items-center gap-4">
      <label className="w-36 shrink-0 text-sm text-muted">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className={clsx('h-2 flex-1 cursor-pointer appearance-none rounded-full bg-muted/20', disabled && 'opacity-50')}
      />
      <div className="w-24 text-right">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || min)}
          disabled={disabled}
          className={clsx(
            'w-full rounded-sm border border-border bg-surface px-2 py-1 text-right text-sm text-foreground tabular-nums',
            'focus:border-primary focus:ring-1 focus:ring-primary/50 focus:outline-none',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        />
        <span className="ml-1 text-xs text-muted">{unit}</span>
      </div>
    </div>
  );
}

/**
 * "Thresholds" button opening the pass/fail settings used by the performance scorecard.
 */
export function ThresholdConfig({ values, onChange, disabled = false, className }: ThresholdConfigProps): JSX.Element {
  const isCustom = (Object.keys(DEFAULT_THRESHOLDS) as (keyof ThresholdValues)[]).some(
    key => values[key] !== DEFAULT_THRESHOLDS[key]
  );
  const field = (key: keyof ThresholdValues): Pick<ThresholdInputProps, 'value' | 'onChange' | 'disabled'> => ({
    value: values[key],
    onChange: v => onChange({ ...values, [key]: v }),
    disabled,
  });

  return (
    <Popover className={clsx('relative', className)}>
      <PopoverButton
        variant="secondary"
        size="sm"
        leadingIcon={<AdjustmentsHorizontalIcon className="size-4" />}
        trailingIcon={
          isCustom ? <span className="size-1.5 rounded-full bg-primary" aria-label="Customised" /> : undefined
        }
      >
        Thresholds
      </PopoverButton>
      <PopoverPanel anchor="bottom end" className="z-20 mt-2 w-md space-y-4 p-4">
        <ThresholdInput
          label="Attestation inclusion"
          min={0}
          max={100}
          step={0.5}
          unit="%"
          {...field('inclusionRate')}
        />
        <ThresholdInput label="Vote correctness" min={0} max={100} step={0.5} unit="%" {...field('correctnessRate')} />
        <ThresholdInput
          label="Sync participation"
          min={0}
          max={100}
          step={0.5}
          unit="%"
          {...field('syncParticipation')}
        />
        <ThresholdInput label="Minimum balance" min={0} max={32} step={0.01} unit="ETH" {...field('minBalance')} />
        <div className="flex justify-end border-t border-border pt-3">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_THRESHOLDS)}
            disabled={disabled || !isCustom}
            className="text-sm text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset to defaults
          </button>
        </div>
      </PopoverPanel>
    </Popover>
  );
}

export { DEFAULT_THRESHOLDS };
