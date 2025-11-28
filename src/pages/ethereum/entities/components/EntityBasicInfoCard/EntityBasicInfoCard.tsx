import { Card } from '@/components/Layout/Card';

import type { EntityBasicInfoCardProps } from './EntityBasicInfoCard.types';

/**
 * Display basic information about an entity
 *
 * Shows:
 * - Entity name
 * - 12h attestation rate
 * - Validator count
 * - Total blocks proposed
 */
export function EntityBasicInfoCard({ stats }: EntityBasicInfoCardProps): React.JSX.Element {
  const rate24h = (stats.rate24h * 100).toFixed(2);

  return (
    <Card>
      <div className="flex flex-col gap-4">
        {/* Entity name header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">{stats.entity}</h2>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-3">
          {/* 12h Online Rate */}
          <div>
            <div className="text-sm text-muted">12h Online Rate</div>
            <div
              className={`text-xl font-semibold ${
                stats.rate24h >= 0.99 ? 'text-success' : stats.rate24h < 0.95 ? 'text-warning' : ''
              }`}
            >
              {rate24h}%
            </div>
          </div>

          {/* Validator Count */}
          <div>
            <div className="text-sm text-muted">Validator Count</div>
            <div className="text-xl font-semibold">{stats.validatorCount.toLocaleString()}</div>
          </div>

          {/* Proposals (12h) */}
          <div>
            <div className="text-sm text-muted">Proposals (12h)</div>
            <div className="text-xl font-semibold">{stats.blocksProposed24h.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
