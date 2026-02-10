import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import { type Instrument } from './types';

interface InstrumentCardProps {
  instrument: Instrument;
}

/**
 * Instrument card — three distinct visual tiers.
 * Featured: dramatic with icon glow + gradient bg.
 * Medium: clean panel with top accent.
 * Standard: compact tool-style, icon + name inline.
 */
export function InstrumentCard({ instrument }: InstrumentCardProps): JSX.Element {
  const { size } = instrument;

  if (size === 'featured') return <FeaturedCard instrument={instrument} />;
  if (size === 'medium') return <MediumCard instrument={instrument} />;
  return <StandardCard instrument={instrument} />;
}

/** Featured — hero-level card with icon glow and gradient background. */
function FeaturedCard({ instrument }: InstrumentCardProps): JSX.Element {
  const { name, description, to, icon: Icon } = instrument;

  return (
    <Link
      to={to}
      data-reveal
      className={clsx(
        'group relative col-span-1 row-span-1 flex overflow-hidden rounded-lg sm:col-span-2 lg:col-span-2 lg:row-span-2',
        'translate-y-4 opacity-0 transition-all duration-500 ease-out',
        'border border-border/30 bg-linear-to-br from-surface via-surface to-primary/[0.04]',
        'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/[0.1]',
        'data-[revealed]:translate-y-0 data-[revealed]:opacity-100',
        'data-[revealed]:delay-[calc(var(--reveal-index,0)*70ms)]'
      )}
    >
      {/* Corner accent — L-shaped border highlight */}
      <div className="pointer-events-none absolute top-0 left-0 h-12 w-px bg-linear-to-b from-primary to-transparent" />
      <div className="pointer-events-none absolute top-0 left-0 h-px w-12 bg-linear-to-r from-primary to-transparent" />

      <div className="flex w-full flex-col justify-between gap-10 p-8 sm:p-10 lg:p-12">
        <div className="flex flex-col gap-4">
          {/* Icon with radial glow */}
          <div className="relative inline-flex self-start">
            <div className="absolute -inset-4 rounded-full bg-primary/10 blur-xl transition-all duration-500 group-hover:bg-primary/20 group-hover:blur-2xl" />
            <Icon className="relative size-8 text-primary transition-colors duration-300 sm:size-9" />
          </div>

          <h3 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl">{name}</h3>

          <p className="max-w-md text-sm/6 font-light text-muted sm:text-base/7">{description}</p>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium text-muted/60 transition-all duration-300 group-hover:gap-3 group-hover:text-primary">
          <span>Explore</span>
          <span className="transition-transform duration-300 group-hover:translate-x-0.5">&rarr;</span>
        </div>
      </div>
    </Link>
  );
}

/** Medium — clean panel with top primary accent line. */
function MediumCard({ instrument }: InstrumentCardProps): JSX.Element {
  const { name, description, to, icon: Icon } = instrument;

  return (
    <Link
      to={to}
      data-reveal
      className={clsx(
        'group relative col-span-1 flex overflow-hidden rounded-lg sm:col-span-2',
        'translate-y-4 opacity-0 transition-all duration-500 ease-out',
        'border border-border/30 bg-surface',
        'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/[0.06]',
        'data-[revealed]:translate-y-0 data-[revealed]:opacity-100',
        'data-[revealed]:delay-[calc(var(--reveal-index,0)*70ms)]'
      )}
    >
      {/* Top accent line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-primary/60 via-primary/20 to-transparent" />

      <div className="flex w-full flex-col justify-between gap-5 p-6 sm:p-7">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Icon className="size-5 shrink-0 text-primary" />
            <h3 className="text-base font-bold tracking-tight text-foreground sm:text-lg">{name}</h3>
          </div>
          <p className="text-sm/5 font-light text-muted">{description}</p>
        </div>

        <span className="text-xs text-muted/50 transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary">
          &rarr;
        </span>
      </div>
    </Link>
  );
}

/** Standard — compact tool-style with inline icon and title. */
function StandardCard({ instrument }: InstrumentCardProps): JSX.Element {
  const { name, description, to, icon: Icon } = instrument;

  return (
    <Link
      to={to}
      data-reveal
      className={clsx(
        'group relative col-span-1 flex overflow-hidden rounded-lg',
        'translate-y-4 opacity-0 transition-all duration-500 ease-out',
        'border border-transparent bg-surface/60',
        'hover:border-border/40 hover:bg-surface',
        'data-[revealed]:translate-y-0 data-[revealed]:opacity-100',
        'data-[revealed]:delay-[calc(var(--reveal-index,0)*70ms)]'
      )}
    >
      <div className="flex w-full flex-col gap-1.5 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <Icon className="size-[18px] shrink-0 text-primary/80 transition-colors duration-200 group-hover:text-primary" />
          <h3 className="text-sm font-semibold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
            {name}
          </h3>
          <span className="ml-auto text-xs text-transparent transition-all duration-300 group-hover:text-primary">
            &rarr;
          </span>
        </div>
        <p className="line-clamp-2 pl-[30px] text-xs/4 font-light text-muted/80">{description}</p>
      </div>
    </Link>
  );
}
