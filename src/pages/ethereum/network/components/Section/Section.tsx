import type { JSX, ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

export interface SectionProps {
  title: string;
  /** Page the section summarises, linked beside its title */
  more?: { to: string; label: string };
  children: ReactNode;
}

/**
 * A titled section of a network page, with an optional link to the page that shows all of it.
 */
export function Section({ title, more, children }: SectionProps): JSX.Element {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base/7 font-semibold text-foreground">{title}</h2>
        {more && (
          <Link to={more.to} className="text-sm whitespace-nowrap text-primary hover:underline">
            {more.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
