import type { ForwardRefExoticComponent, SVGProps } from 'react';

export type DeltaType = 'increase' | 'decrease' | 'neutral';

export interface Stat {
  id: string | number;
  name: string;
  value: string;
  icon?: ForwardRefExoticComponent<SVGProps<SVGSVGElement>>;
  /** Custom CSS class for the value text (e.g. 'text-red-500' for colored values) */
  valueClassName?: string;
  /** Subtitle text displayed below the value */
  subtitle?: string;
  /** Color string for the icon background tint and icon itself (e.g. '#ef4444' or 'rgb(245, 158, 11)') */
  iconColor?: string;
  /** Color string for the bottom accent bar (e.g. '#ef4444' or 'rgb(59, 130, 246)') */
  accentColor?: string;
  delta?: {
    value: string;
    type: DeltaType;
  };
  link?: {
    to: string;
    label: string;
  };
}

export interface StatsProps {
  stats: Stat[];
  title?: string;
  className?: string;
  /** Override the default grid layout classes */
  gridClassName?: string;
}
