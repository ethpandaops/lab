import type { JSX } from 'react';
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/20/solid';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import type { StatsProps } from './Stats.types';

export function Stats({ stats, title, className, gridClassName }: StatsProps): JSX.Element {
  return (
    <div className={className}>
      {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}

      <dl
        className={clsx(
          gridClassName ??
            'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6',
          title && 'mt-5'
        )}
      >
        {stats.map(item => {
          const hasCustomIcon = item.icon && item.iconColor;
          const hasLegacyIcon = item.icon && !item.iconColor;

          return (
            <Card
              key={item.id}
              className="relative min-w-0 overflow-hidden"
              footer={
                item.link ? (
                  <div className="text-sm">
                    <Link
                      to={item.link.to}
                      className="font-medium text-primary transition-colors hover:text-primary/80"
                    >
                      {item.link.label}
                      <span className="sr-only"> {item.name} stats</span>
                    </Link>
                  </div>
                ) : undefined
              }
            >
              <dt>
                {/* Legacy icon: solid bg-primary square */}
                {hasLegacyIcon && (
                  <div className="absolute top-5 left-4 rounded-md bg-primary p-3 sm:top-6 sm:left-6">
                    <item.icon aria-hidden="true" className="size-6 text-white" />
                  </div>
                )}

                {/* Enhanced icon: tinted background with colored icon */}
                {hasCustomIcon ? (
                  <div className="mb-1.5 flex items-center gap-2">
                    <div
                      className="flex size-7 items-center justify-center rounded-sm"
                      style={{ backgroundColor: `${item.iconColor}18` }}
                    >
                      <item.icon aria-hidden="true" className="size-4" style={{ color: item.iconColor }} />
                    </div>
                    <p className="truncate text-xs font-medium tracking-wide text-muted uppercase">{item.name}</p>
                  </div>
                ) : (
                  <p className={clsx('truncate text-sm font-medium text-muted', hasLegacyIcon && 'ml-16')}>
                    {item.name}
                  </p>
                )}
              </dt>

              <dd className={clsx('flex items-baseline', hasLegacyIcon && 'ml-16')}>
                <p
                  className={clsx(
                    hasCustomIcon ? 'font-mono text-2xl/7 font-bold tabular-nums' : 'text-2xl font-semibold',
                    item.valueClassName ?? 'text-foreground'
                  )}
                >
                  {item.value}
                </p>
                {item.delta && !hasCustomIcon && (
                  <p
                    className={clsx(
                      item.delta.type === 'increase'
                        ? 'text-success'
                        : item.delta.type === 'decrease'
                          ? 'text-danger'
                          : 'text-muted',
                      'ml-2 flex items-baseline text-sm font-semibold'
                    )}
                  >
                    {item.delta.type === 'increase' ? (
                      <ArrowUpIcon aria-hidden="true" className="size-5 shrink-0 self-center text-success" />
                    ) : item.delta.type === 'decrease' ? (
                      <ArrowDownIcon aria-hidden="true" className="size-5 shrink-0 self-center text-danger" />
                    ) : null}

                    <span className="sr-only">
                      {' '}
                      {item.delta.type === 'increase'
                        ? 'Increased'
                        : item.delta.type === 'decrease'
                          ? 'Decreased'
                          : 'Changed'}{' '}
                      by{' '}
                    </span>
                    {item.delta.value}
                  </p>
                )}
              </dd>

              {/* Subtitle (used with enhanced icon style) */}
              {item.subtitle && <div className="mt-1.5 text-xs text-muted">{item.subtitle}</div>}

              {/* Bottom accent bar */}
              {item.accentColor && (
                <div className="absolute bottom-0 left-0 h-0.5 w-full" style={{ backgroundColor: item.accentColor }} />
              )}
            </Card>
          );
        })}
      </dl>
    </div>
  );
}
