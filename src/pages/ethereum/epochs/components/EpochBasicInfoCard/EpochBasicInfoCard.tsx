import { Card } from '@/components/Layout/Card';

import type { EpochBasicInfoCardProps } from './EpochBasicInfoCard.types';

/**
 * Display basic information about an epoch
 *
 * Shows:
 * - Epoch number and timestamp
 * - Block counts (canonical, missed, orphaned)
 * - Attestation participation
 * - Average block first seen time
 */
export function EpochBasicInfoCard({ stats }: EpochBasicInfoCardProps): React.JSX.Element {
  const participationPercent = (stats.participationRate * 100).toFixed(2);

  return (
    <Card>
      <div className="flex flex-col gap-4">
        {/* Stats grid - more compact */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-4">
          {/* Blocks */}
          <div>
            <div className="text-sm text-muted">Blocks</div>
            <div className="text-xl font-semibold">
              <span className="text-success">{stats.canonicalBlockCount}</span>
              <span className="text-muted"> / 32</span>
            </div>
          </div>

          {/* Attestation Participation */}
          <div>
            <div className="text-sm text-muted">Participation</div>
            <div
              className={`text-xl font-semibold ${
                stats.participationRate >= 0.99 ? 'text-success' : stats.participationRate < 0.95 ? 'text-warning' : ''
              }`}
            >
              {participationPercent}%
            </div>
          </div>

          {/* Missed Attestations */}
          <div>
            <div className="text-sm text-muted">Missed Attestations</div>
            <div className={`text-xl font-semibold ${stats.missedAttestations > 0 ? 'text-warning' : 'text-muted'}`}>
              {stats.missedAttestations.toLocaleString()}
            </div>
          </div>

          {/* Avg Block First Seen */}
          {stats.averageBlockFirstSeenTime !== null && (
            <div>
              <div className="text-sm text-muted">Avg Block Seen</div>
              <div className="text-xl font-semibold">{(stats.averageBlockFirstSeenTime / 1000).toFixed(2)}s</div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
