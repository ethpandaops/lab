import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import { EpochArt } from '@/components/Ethereum/EpochArt';
import { getRelativeTime } from '@/utils/time';
import type { EpochHeaderProps } from './EpochHeader.types';

/**
 * Unified epoch header - everything in a single card
 */
export function EpochHeader({ epoch, stats, timestamp }: EpochHeaderProps): React.JSX.Element {
  const participationPercent = (stats.participationRate * 100).toFixed(2);
  const avgBlockSeconds = stats.averageBlockFirstSeenTime ? stats.averageBlockFirstSeenTime / 1000 : null;

  // Format as ISO 8601 with timezone
  const isoTimestamp = new Date(timestamp * 1000).toLocaleString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });

  return (
    <>
      {/* Breadcrumbs */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-muted">
        <Link to="/ethereum/epochs" className="hover:text-foreground">
          Epochs
        </Link>
        <ChevronRightIcon className="size-4" />
        <span className="text-foreground">{epoch}</span>
      </nav>

      {/* Single unified card */}
      <div className="rounded-sm border border-border bg-surface p-6">
        {/* Header with art */}
        <div className="mb-6 flex items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Epoch {epoch}</h1>
            <p className="mt-2 font-mono text-sm text-muted">{isoTimestamp}</p>
          </div>

          {/* EpochArt - smaller */}
          <div className="shrink-0">
            <EpochArt width={120} height={120} epochNumber={epoch} filledSlots={stats.canonicalBlockCount} />
          </div>
        </div>

        {/* Stats Grid - single row, all stats side by side */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7">
          {/* Age */}
          <div>
            <dt className="text-xs font-medium text-muted">Age</dt>
            <dd className="mt-1 text-base/7 font-semibold text-foreground">{getRelativeTime(timestamp)}</dd>
          </div>
          {/* Blocks */}
          <div>
            <dt className="text-xs font-medium text-muted">Blocks</dt>
            <dd className="mt-1 text-base/7 font-semibold text-foreground">
              {stats.canonicalBlockCount} / 32
              {stats.canonicalBlockCount === 32 && <span className="ml-1 text-xs text-success">✓</span>}
              {stats.canonicalBlockCount < 32 && (
                <span className="ml-1 text-xs text-warning">(-{32 - stats.canonicalBlockCount})</span>
              )}
            </dd>
          </div>

          {/* Avg Block Seen */}
          {avgBlockSeconds !== null && (
            <div>
              <dt className="text-xs font-medium text-muted">Avg Block Seen</dt>
              <dd
                className={`mt-1 text-base/7 font-semibold tabular-nums ${
                  avgBlockSeconds < 0.5 ? 'text-success' : avgBlockSeconds > 1.0 ? 'text-warning' : 'text-foreground'
                }`}
              >
                {avgBlockSeconds.toFixed(2)}s
              </dd>
            </div>
          )}

          {/* Participation Rate */}
          <div>
            <dt className="text-xs font-medium text-muted">Participation</dt>
            <dd
              className={`mt-1 text-base/7 font-semibold tabular-nums ${
                stats.participationRate >= 0.99
                  ? 'text-success'
                  : stats.participationRate < 0.95
                    ? 'text-warning'
                    : 'text-foreground'
              }`}
            >
              {participationPercent}%
            </dd>
          </div>

          {/* Missed Attestations */}
          <div>
            <dt className="text-xs font-medium text-muted">Missed Attestations</dt>
            <dd
              className={`mt-1 text-base/7 font-semibold tabular-nums ${
                stats.missedAttestations > 1000 ? 'text-warning' : 'text-foreground'
              }`}
            >
              {stats.missedAttestations.toLocaleString()}
            </dd>
          </div>

          {/* Missed Attestations Percentage */}
          <div>
            <dt className="text-xs font-medium text-muted">Missed %</dt>
            <dd className="mt-1 text-sm text-foreground tabular-nums">
              {((stats.missedAttestations / 1000000) * 100).toFixed(3)}%
            </dd>
          </div>
        </div>
      </div>
    </>
  );
}
