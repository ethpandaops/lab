import type { JSX } from 'react';
import { useState } from 'react';
import clsx from 'clsx';
import { ChevronDownIcon, ChevronUpIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

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
      <label className="w-40 text-sm text-muted">{label}</label>
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
 * Collapsible threshold configuration panel
 */
export function ThresholdConfig({ values, onChange, disabled = false, className }: ThresholdConfigProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleReset = (): void => {
    onChange(DEFAULT_THRESHOLDS);
  };

  const isCustom =
    values.inclusionRate !== DEFAULT_THRESHOLDS.inclusionRate ||
    values.correctnessRate !== DEFAULT_THRESHOLDS.correctnessRate ||
    values.syncParticipation !== DEFAULT_THRESHOLDS.syncParticipation ||
    values.minBalance !== DEFAULT_THRESHOLDS.minBalance ||
    values.inclusionDelay !== DEFAULT_THRESHOLDS.inclusionDelay ||
    values.blockProductionRate !== DEFAULT_THRESHOLDS.blockProductionRate;

  return (
    <div className={clsx('rounded-sm border border-border bg-surface', className)}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface/80"
      >
        <div className="flex items-center gap-2">
          <AdjustmentsHorizontalIcon className="size-4 text-muted" />
          <span className="text-sm font-medium text-foreground">Pass/Fail Thresholds</span>
          {isCustom && (
            <span className="rounded-xs bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">Custom</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="size-4 text-muted" />
        ) : (
          <ChevronDownIcon className="size-4 text-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4 border-t border-border px-4 py-4">
          <ThresholdInput
            label="Attestation Inclusion"
            value={values.inclusionRate}
            onChange={v => onChange({ ...values, inclusionRate: v })}
            min={0}
            max={100}
            step={0.5}
            unit="%"
            disabled={disabled}
          />
          <ThresholdInput
            label="Vote Correctness"
            value={values.correctnessRate}
            onChange={v => onChange({ ...values, correctnessRate: v })}
            min={0}
            max={100}
            step={0.5}
            unit="%"
            disabled={disabled}
          />
          <ThresholdInput
            label="Sync Participation"
            value={values.syncParticipation}
            onChange={v => onChange({ ...values, syncParticipation: v })}
            min={0}
            max={100}
            step={0.5}
            unit="%"
            disabled={disabled}
          />
          <ThresholdInput
            label="Minimum Balance"
            value={values.minBalance}
            onChange={v => onChange({ ...values, minBalance: v })}
            min={0}
            max={32}
            step={0.01}
            unit="ETH"
            disabled={disabled}
          />
          <ThresholdInput
            label="Block Production"
            value={values.blockProductionRate}
            onChange={v => onChange({ ...values, blockProductionRate: v })}
            min={0}
            max={100}
            step={0.5}
            unit="%"
            disabled={disabled}
          />
          <ThresholdInput
            label="Inclusion Delay"
            value={values.inclusionDelay}
            onChange={v => onChange({ ...values, inclusionDelay: v })}
            min={1}
            max={4}
            step={0.1}
            unit="slots"
            disabled={disabled}
          />

          <div className="flex justify-end border-t border-border pt-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={disabled || !isCustom}
              className={clsx(
                'text-sm text-muted transition-colors hover:text-foreground',
                (disabled || !isCustom) && 'cursor-not-allowed opacity-50'
              )}
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { DEFAULT_THRESHOLDS };
