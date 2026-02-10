import { type JSX } from 'react';

/** Scroll hint — minimal label + animated pulse line. */
export function ScrollIndicator(): JSX.Element {
  return (
    <div className="flex animate-fade-in-delay-6 flex-col items-center gap-3 pb-10">
      <span className="text-[10px]/3 font-semibold tracking-[0.3em] text-muted/60 uppercase">Scroll</span>
      <div className="h-8 w-px animate-scroll-travel bg-linear-to-b from-primary/50 to-transparent" />
    </div>
  );
}
