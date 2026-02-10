import { type ComponentType, type SVGProps } from 'react';

export type InstrumentSize = 'featured' | 'medium' | 'standard';

export interface Instrument {
  name: string;
  description: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  size: InstrumentSize;
}

export interface InstrumentSection {
  label: string;
  instruments: Instrument[];
}
