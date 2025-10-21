import type { ForwardRefExoticComponent, SVGProps } from 'react';

export type DeltaType = 'increase' | 'decrease' | 'neutral';

export interface Stat {
  id: string | number;
  name: string;
  value: string;
  icon?: ForwardRefExoticComponent<SVGProps<SVGSVGElement>>;
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
}
