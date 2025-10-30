import clsx from 'clsx';
import type { RangeInputProps } from './RangeInput.types';

/**
 * RangeInput component - A styled range slider with label
 *
 * Provides a consistent way to render range sliders throughout the application
 * with proper labeling and value display.
 *
 * @example
 * ```tsx
 * <RangeInput
 *   id="volume"
 *   label="Volume"
 *   value={volume}
 *   min={0}
 *   max={100}
 *   step={5}
 *   suffix="%"
 *   onChange={setVolume}
 * />
 * ```
 */
export function RangeInput({
  id,
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  suffix,
  onChange,
  className,
}: RangeInputProps): React.JSX.Element {
  return (
    <div className={clsx(className)}>
      <label htmlFor={id} className="block text-xs text-muted">
        {label}: {value}
        {suffix}
      </label>
      <input
        type="range"
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
