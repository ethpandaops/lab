import type { JSX } from 'react';
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/16/solid';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import type { StatsProps } from './Stats.types';

/**
 * Headline numbers rendered as one KPI strip: a single hairline panel split into cells by
 * internal rules, rather than a separate card per number.
 *
 * Each cell draws its rule on its right and bottom edges; the panel clips the rules that fall on
 * its outer edge, so any column count (and an incomplete last row) gets clean dividers.
 */
export function Stats({ stats, title, className, gridClassName }: StatsProps): JSX.Element {
  return (
    <div className={className}>
      {title && <h3 className="mb-3 text-sm/6 font-semibold text-foreground">{title}</h3>}

      <dl
        className={clsx(
          gridClassName ??
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6',
          'gap-0! overflow-hidden border-t-2 border-b border-t-foreground border-b-border'
        )}
      >
        {stats.map(item => {
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="relative flex min-w-0 flex-col px-6 py-5 shadow-[1px_0_0_0_var(--color-border),0_1px_0_0_var(--color-border)] first:pl-0"
            >
              <dt className="flex min-w-0 items-center gap-1.5 text-2xs/4 font-semibold tracking-[0.12em] text-muted uppercase">
                {Icon && (
                  <Icon
                    aria-hidden="true"
                    className="size-3.5 shrink-0"
                    style={item.iconColor ? { color: item.iconColor } : undefined}
                  />
                )}
                <span className="truncate">{item.name}</span>
              </dt>

              <dd className="mt-1 flex min-w-0 items-baseline gap-2">
                <span
                  className={clsx(
                    'mt-1 truncate font-serif text-5xl/[1.1] font-normal tracking-tight lining-nums tabular-nums',
                    item.valueClassName ?? 'text-foreground'
                  )}
                >
                  {item.value}
                </span>
                {item.delta && (
                  <span
                    className={clsx(
                      'flex shrink-0 items-center text-xs font-medium tabular-nums',
                      item.delta.type === 'increase'
                        ? 'text-success'
                        : item.delta.type === 'decrease'
                          ? 'text-danger'
                          : 'text-muted'
                    )}
                  >
                    {item.delta.type === 'increase' ? (
                      <ArrowUpIcon aria-hidden="true" className="size-3.5" />
                    ) : item.delta.type === 'decrease' ? (
                      <ArrowDownIcon aria-hidden="true" className="size-3.5" />
                    ) : null}
                    <span className="sr-only">
                      {item.delta.type === 'increase'
                        ? 'Increased'
                        : item.delta.type === 'decrease'
                          ? 'Decreased'
                          : 'Changed'}{' '}
                      by{' '}
                    </span>
                    {item.delta.value}
                  </span>
                )}
              </dd>

              {item.subtitle && <div className="mt-0.5 truncate text-xs/5 text-muted">{item.subtitle}</div>}

              {item.link && (
                <Link
                  to={item.link.to}
                  className="mt-2 text-xs font-medium text-primary transition-colors hover:text-primary/80"
                >
                  {item.link.label}
                  <span className="sr-only"> {item.name} stats</span>
                </Link>
              )}

              {item.accentColor && (
                <div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: item.accentColor }} />
              )}
            </div>
          );
        })}
      </dl>
    </div>
  );
}
