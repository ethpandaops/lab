import { Card } from '@/components/Layout/Card';

import type { EntityBasicInfoCardProps } from './EntityBasicInfoCard.types';

/**
 * Display basic information about an entity
 *
 * Shows:
 * - Entity name
 * - 7-day and 30-day attestation rates
 * - Total attestations
 * - Total blocks proposed
 */
export function EntityBasicInfoCard({ stats }: EntityBasicInfoCardProps): React.JSX.Element {
  const rate7d = (stats.rate7d * 100).toFixed(2);
  const rate30d = (stats.rate30d * 100).toFixed(2);

  return (
    <Card>
      <div className="flex flex-col gap-4">
        {/* Entity name header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">{stats.entity}</h2>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-4">
          {/* 7d Online Rate */}
          <div>
            <div className="text-sm text-muted">7d Online Rate</div>
            <div
              className={`text-xl font-semibold ${
                stats.rate7d >= 0.99 ? 'text-success' : stats.rate7d < 0.95 ? 'text-warning' : ''
              }`}
            >
              {rate7d}%
            </div>
          </div>

          {/* 30d Online Rate */}
          <div>
            <div className="text-sm text-muted">30d Online Rate</div>
            <div
              className={`text-xl font-semibold ${
                stats.rate30d >= 0.99 ? 'text-success' : stats.rate30d < 0.95 ? 'text-warning' : ''
              }`}
            >
              {rate30d}%
            </div>
          </div>

          {/* Total Attestations (30 days) */}
          <div>
            <div className="text-sm text-muted">Total Attestations (30d)</div>
            <div className="text-xl font-semibold">{stats.totalAttestations30d.toLocaleString()}</div>
          </div>

          {/* Proposals (30 days) */}
          <div>
            <div className="text-sm text-muted">Proposals (30d)</div>
            <div className="text-xl font-semibold">{stats.blocksProposed30d.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
