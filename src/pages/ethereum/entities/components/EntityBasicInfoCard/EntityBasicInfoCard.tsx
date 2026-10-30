import { Badge } from '@/components/Elements/Badge';
import { Card } from '@/components/Layout/Card';
import { Stats } from '@/components/DataDisplay/Stats';

import type { EntityBasicInfoCardProps } from './EntityBasicInfoCard.types';

/**
 * Unified entity header card
 *
 * Combines the entity identity with key health metrics in a single card.
 * Header shows the entity name with a health status badge.
 * The stat strip below shows detailed metrics with health-based color coding.
 */
export function EntityBasicInfoCard({
  stats,
  activeValidatorCount,
  totalValidatorCount,
}: EntityBasicInfoCardProps): React.JSX.Element {
  const rate24h = (stats.rate24h * 100).toFixed(2);
  const validatorCount = activeValidatorCount ?? stats.validatorCount;

  return (
    <Card
      title={stats.entity}
      actions={
        <Badge
          color={
            stats.rate24h >= 0.99 ? 'green' : stats.rate24h >= 0.95 ? 'gray' : stats.rate24h >= 2 / 3 ? 'orange' : 'red'
          }
          dot
        >
          {rate24h}% online
        </Badge>
      }
    >
      <Stats
        gridClassName="grid grid-cols-2 sm:grid-cols-4"
        stats={[
          {
            id: 'active-validators',
            name: 'Active Validators',
            value: validatorCount.toLocaleString(),
            subtitle:
              totalValidatorCount !== undefined && totalValidatorCount > validatorCount
                ? `of ${totalValidatorCount.toLocaleString()} total`
                : undefined,
          },
          {
            id: 'online-rate',
            name: '12h Online Rate',
            value: `${rate24h}%`,
            valueClassName:
              stats.rate24h >= 0.99
                ? 'text-success'
                : stats.rate24h < 2 / 3
                  ? 'text-danger'
                  : stats.rate24h < 0.95
                    ? 'text-warning'
                    : 'text-foreground',
          },
          {
            id: 'proposals',
            name: 'Proposals (12h)',
            value: stats.blocksProposed24h.toLocaleString(),
          },
          {
            id: 'missed-attestations',
            name: 'Missed Attestations (12h)',
            value: stats.missedAttestations24h.toLocaleString(),
            valueClassName:
              stats.missedAttestations24h === 0
                ? 'text-success'
                : stats.missedAttestations24h > 1000
                  ? 'text-warning'
                  : 'text-foreground',
          },
        ]}
      />
    </Card>
  );
}
