import clsx from 'clsx';

import type { EntityBasicInfoCardProps } from './EntityBasicInfoCard.types';

/**
 * Unified entity header card
 *
 * Combines the entity identity with key health metrics in a single card.
 * Header section shows entity name + health status badge.
 * Stat panels below show detailed metrics with health-based color coding.
 */
export function EntityBasicInfoCard({
  stats,
  activeValidatorCount,
  totalValidatorCount,
}: EntityBasicInfoCardProps): React.JSX.Element {
  const rate24h = (stats.rate24h * 100).toFixed(2);
  const validatorCount = activeValidatorCount ?? stats.validatorCount;

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-surface">
      {/* Header section */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{stats.entity}</h1>
            <p className="mt-1 text-sm text-muted">Validator entity overview</p>
          </div>

          {/* Health status badge */}
          <div
            className={clsx(
              'inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums',
              stats.rate24h >= 0.99
                ? 'bg-success/10 text-success ring-1 ring-success/20'
                : stats.rate24h >= 0.95
                  ? 'bg-warning/10 text-warning ring-1 ring-warning/20'
                  : 'bg-danger/10 text-danger ring-1 ring-danger/20'
            )}
          >
            <span
              className={clsx(
                'size-2 rounded-full',
                stats.rate24h >= 0.99 ? 'bg-success' : stats.rate24h >= 0.95 ? 'bg-warning' : 'bg-danger'
              )}
            />
            {rate24h}% online
          </div>
        </div>
      </div>

      {/* Stat panels */}
      <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
        {/* Active Validators */}
        <div className="rounded-sm border border-border bg-background p-4">
          <dt className="text-xs font-medium text-muted">Active Validators</dt>
          <dd className="mt-1 font-mono text-lg/7 font-semibold text-foreground tabular-nums">
            {validatorCount.toLocaleString()}
          </dd>
          {totalValidatorCount !== undefined && totalValidatorCount > validatorCount && (
            <div className="mt-0.5 text-xs text-muted">of {totalValidatorCount.toLocaleString()} total</div>
          )}
        </div>

        {/* 12h Online Rate */}
        <div className="rounded-sm border border-border bg-background p-4">
          <dt className="text-xs font-medium text-muted">12h Online Rate</dt>
          <dd
            className={clsx(
              'mt-1 font-mono text-lg/7 font-semibold tabular-nums',
              stats.rate24h >= 0.99 ? 'text-success' : stats.rate24h < 0.95 ? 'text-warning' : 'text-foreground'
            )}
          >
            {rate24h}%
          </dd>
        </div>

        {/* Proposals (12h) */}
        <div className="rounded-sm border border-border bg-background p-4">
          <dt className="text-xs font-medium text-muted">Proposals (12h)</dt>
          <dd className="mt-1 font-mono text-lg/7 font-semibold text-foreground tabular-nums">
            {stats.blocksProposed24h.toLocaleString()}
          </dd>
        </div>

        {/* Missed Attestations (12h) */}
        <div className="rounded-sm border border-border bg-background p-4">
          <dt className="text-xs font-medium text-muted">Missed Attestations (12h)</dt>
          <dd
            className={clsx(
              'mt-1 font-mono text-lg/7 font-semibold tabular-nums',
              stats.missedAttestations24h === 0
                ? 'text-success'
                : stats.missedAttestations24h > 1000
                  ? 'text-warning'
                  : 'text-foreground'
            )}
          >
            {stats.missedAttestations24h.toLocaleString()}
          </dd>
        </div>
      </div>
    </div>
  );
}
