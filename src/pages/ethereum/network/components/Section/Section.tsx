import type { JSX, ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

export interface SectionProps {
  title: string;
  /** Page the section summarises, linked beside its title */
  more?: { to: string; label: string };
  /** Controls and links beside the title */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * A titled section of a network page, with an optional link to the page that shows all of it and controls beside
 * its title.
 */
export function Section({ title, more, actions, children }: SectionProps): JSX.Element {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-base/7 font-semibold text-foreground">{title}</h2>
        {more && (
          <Link to={more.to} className="text-sm whitespace-nowrap text-primary hover:underline">
            {more.label}
          </Link>
        )}
        {actions}
      </div>
      {children}
    </section>
  );
}
