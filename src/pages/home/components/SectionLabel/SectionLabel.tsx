import { type JSX } from 'react';

interface SectionLabelProps {
  label: string;
}

/** Section divider — primary-colored label with a hairline rule. */
export function SectionLabel({ label }: SectionLabelProps): JSX.Element {
  return (
    <div className="col-span-full flex items-center gap-4 pt-10 pb-2 first:pt-0">
      <span className="text-[10px]/3 font-bold tracking-[0.3em] text-primary uppercase">{label}</span>
      <div className="h-px flex-1 bg-border/40" />
    </div>
  );
}
