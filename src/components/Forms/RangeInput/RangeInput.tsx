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
        className={clsx(
          'w-full cursor-pointer appearance-none rounded-sm bg-transparent',
          // Track styles
          '[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-sm [&::-webkit-slider-runnable-track]:bg-border',
          '[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-sm [&::-moz-range-track]:bg-border',
          // Thumb styles - with vertical centering
          '[&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:transition-colors',
          '[&::-webkit-slider-thumb]:hover:bg-primary/80',
          '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:transition-colors',
          '[&::-moz-range-thumb]:hover:bg-primary/80',
          // Focus styles
          'focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
        )}
      />
    </div>
  );
}
