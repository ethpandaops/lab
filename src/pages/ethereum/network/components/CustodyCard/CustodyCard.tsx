import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { ShareTable } from '@/pages/ethereum/clients/components/ShareTable';
import { ANGLE_COLORS } from '@/pages/ethereum/clients/utils/angle-colors';
import { CUSTODY_BUCKETS } from '@/pages/ethereum/clients/utils/census';
import type { FctPeerCountByClClientDaily } from '@/pages/ethereum/clients/api/client-models';
import { formatDataDate } from '@/pages/ethereum/clients/utils/client-versions';
import { dayStart, total } from '../../utils/network-census';

export interface CustodyCardProps {
  /** Consensus peer rows of one day */
  rows: FctPeerCountByClClientDaily[];
  day: string | null;
}

/**
 * Consensus peers by how many column groups they say they custody. Custody grows with the validators attached, so
 * the buckets show roughly where stake runs.
 */
export function CustodyCard({ rows, day }: CustodyCardProps): JSX.Element {
  const known = total(rows, row => row.custody_known_peer_count);

  return (
    <Card
      rounded
      title="Custody groups advertised"
      subtitle={day ? `Consensus peers that reported a count on ${formatDataDate(dayStart(day))}` : undefined}
    >
      {known === 0 ? (
        <p className="text-sm text-muted">No consensus peer reported its custody.</p>
      ) : (
        <ShareTable
          labelHeader="Custody"
          labelClassName="w-40 sm:w-56"
          countHeader="Peers"
          rows={CUSTODY_BUCKETS.map(bucket => {
            const count = total(rows, row => row[bucket.key]);
            return {
              key: bucket.key,
              label: (
                <span className="flex flex-col">
                  <span className="text-sm/5 text-foreground">{bucket.label}</span>
                  <span className="text-xs/4 whitespace-normal text-muted">{bucket.meaning}</span>
                </span>
              ),
              share: (count / known) * 100,
              count,
              color: ANGLE_COLORS.peers,
            };
          })}
        />
      )}
    </Card>
  );
}
