import { EpochArt } from '@/components/Ethereum/EpochArt';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { BeaconchainLink } from '@/components/Ethereum/BeaconchainLink';
import clsx from 'clsx';
import type { EpochHeaderProps } from './EpochHeader.types';

/**
 * Unified epoch header - everything in a single card
 */
export function EpochHeader({ epoch, stats, timestamp, p95BlockArrivalTime }: EpochHeaderProps): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-sm border border-border bg-surface">
      {/* Tight header section - no padding, integrated into card */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-6">
            {/* EpochArt - smaller, on the left */}
            <div className="shrink-0">
              <EpochArt width={80} height={80} epochNumber={epoch} filledSlots={stats.canonicalBlockCount} />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Epoch {epoch}</h1>
              <div className="mt-1">
                <Timestamp timestamp={timestamp} format="custom" className="text-sm text-muted">
                  {ts =>
                    new Date(ts * 1000).toLocaleString('en-CA', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false,
                      timeZoneName: 'short',
                    })
                  }
                </Timestamp>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <BeaconchainLink epoch={epoch} />
          </div>
        </div>
      </div>

      {/* Stat panels */}
      <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
        <div className="rounded-sm border border-border bg-background p-4">
          <dt className="text-xs font-medium text-muted">Blocks</dt>
          <dd
            className={clsx(
              'mt-1 text-base/7 font-semibold',
              stats.canonicalBlockCount === 32 ? 'text-success' : 'text-foreground'
            )}
          >
            {stats.canonicalBlockCount} / 32
          </dd>
        </div>

        <div className="rounded-sm border border-border bg-background p-4">
          <dt className="text-xs font-medium text-muted">P95 Block Arrival</dt>
          <dd
            className={clsx(
              'mt-1 text-base/7 font-semibold tabular-nums',
              p95BlockArrivalTime !== null && p95BlockArrivalTime !== undefined
                ? p95BlockArrivalTime < 0.5
                  ? 'text-success'
                  : p95BlockArrivalTime > 1.0
                    ? 'text-warning'
                    : 'text-foreground'
                : 'text-foreground'
            )}
          >
            {p95BlockArrivalTime !== null && p95BlockArrivalTime !== undefined
              ? `${p95BlockArrivalTime.toFixed(2)}s`
              : '-'}
          </dd>
        </div>

        <div className="rounded-sm border border-border bg-background p-4">
          <dt className="text-xs font-medium text-muted">Attestation Participation</dt>
          <dd
            className={clsx(
              'mt-1 text-base/7 font-semibold tabular-nums',
              stats.participationRate >= 0.99
                ? 'text-success'
                : stats.participationRate < 0.95
                  ? 'text-warning'
                  : 'text-foreground'
            )}
          >
            {(stats.participationRate * 100).toFixed(2)}%
          </dd>
        </div>

        <div className="rounded-sm border border-border bg-background p-4">
          <dt className="text-xs font-medium text-muted">Missed Attestations</dt>
          <dd
            className={clsx(
              'mt-1 text-base/7 font-semibold tabular-nums',
              stats.missedAttestations > 1000 ? 'text-warning' : 'text-foreground'
            )}
          >
            {stats.missedAttestations.toLocaleString()}
          </dd>
        </div>
      </div>
    </div>
  );
}
