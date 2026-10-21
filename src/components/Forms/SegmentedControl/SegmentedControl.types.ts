import type { ReactNode } from 'react';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Shown but not selectable, e.g. a filter with no matching rows */
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  /** Mutually exclusive options, rendered left to right */
  options: readonly SegmentedControlOption<T>[];
  /** Currently selected value */
  value: T;
  /** Called with the option the user picks */
  onChange: (value: T) => void;
  /** Accessible name for the group, e.g. "Time window" */
  ariaLabel?: string;
  className?: string;
}
