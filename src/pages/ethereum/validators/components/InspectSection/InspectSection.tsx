import type { JSX, ReactNode } from 'react';

interface InspectSectionProps {
  title: string;
  /** Secondary line beside the title, such as the date range */
  meta?: ReactNode;
  /** Line under the heading for a caveat about the section's data */
  note?: ReactNode;
  /** Controls aligned right of the title */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Titled group of cards on the inspect page.
 */
export function InspectSection({ title, meta, note, actions, children }: InspectSectionProps): JSX.Element {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-lg/7 font-semibold tracking-tight text-foreground">{title}</h2>
          {meta && <div className="text-sm text-muted">{meta}</div>}
        </div>
        {actions}
      </div>
      {note && <p className="-mt-2 text-sm text-muted">{note}</p>}
      {children}
    </section>
  );
}
