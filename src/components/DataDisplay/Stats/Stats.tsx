import type { JSX } from 'react';
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/20/solid';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import type { StatsProps } from './Stats.types';

export function Stats({ stats, title, className }: StatsProps): JSX.Element {
  return (
    <div className={className}>
      {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}

      <dl className={clsx('grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', title && 'mt-5')}>
        {stats.map(item => (
          <Card
            key={item.id}
            className="relative min-w-0"
            footer={
              item.link ? (
                <div className="text-sm">
                  <Link to={item.link.to} className="font-medium text-primary transition-colors hover:text-primary/80">
                    {item.link.label}
                    <span className="sr-only"> {item.name} stats</span>
                  </Link>
                </div>
              ) : undefined
            }
          >
            <dt>
              {item.icon && (
                <div className="absolute top-5 left-4 rounded-md bg-primary p-3 sm:top-6 sm:left-6">
                  <item.icon aria-hidden="true" className="size-6 text-white" />
                </div>
              )}
              <p className={clsx('truncate text-sm font-medium text-muted', item.icon && 'ml-16')}>{item.name}</p>
            </dt>
            <dd className={clsx('flex items-baseline', item.icon && 'ml-16')}>
              <p className="text-2xl font-semibold text-foreground">{item.value}</p>
              {item.delta && (
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
          </Card>
        ))}
      </dl>
    </div>
  );
}
