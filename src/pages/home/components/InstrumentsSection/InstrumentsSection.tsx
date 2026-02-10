import { type JSX } from 'react';
import { useIsPageEnabled } from '@/hooks/useIsPageEnabled';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { SectionLabel } from '../SectionLabel';
import { InstrumentCard } from './InstrumentCard';
import { instrumentSections } from './instruments';
import { type Instrument } from './types';

/** Filters an instrument based on the network-aware page-enabled check. */
function EnabledInstrument({ instrument }: { instrument: Instrument }): JSX.Element | null {
  const enabled = useIsPageEnabled(instrument.to);
  if (!enabled) return null;
  return <InstrumentCard instrument={instrument} />;
}

/** Instrument panel grid — all platform pages organized by domain. */
export function InstrumentsSection(): JSX.Element {
  const gridRef = useScrollReveal<HTMLDivElement>();

  return (
    <div className="px-6 pt-6 pb-32 sm:px-12 lg:px-20">
      {/* Gradient separator — primary-tinted top rule */}
      <div className="mx-auto mb-6 h-px max-w-7xl bg-linear-to-r from-transparent via-primary/30 to-transparent" />

      <div ref={gridRef} className="mx-auto grid max-w-7xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {instrumentSections.map(section => (
          <SectionGroup key={section.label} label={section.label}>
            {section.instruments.map(instrument => (
              <EnabledInstrument key={instrument.to} instrument={instrument} />
            ))}
          </SectionGroup>
        ))}
      </div>
    </div>
  );
}

/** Renders a section label followed by its children inside the grid. */
function SectionGroup({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <>
      <SectionLabel label={label} />
      {children}
    </>
  );
}
