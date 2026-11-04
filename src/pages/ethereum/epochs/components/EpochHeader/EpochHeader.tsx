import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { BlockExplorerLink } from '@/components/Ethereum/BlockExplorerLink';
import { Card } from '@/components/Layout/Card';
import { Stats } from '@/components/DataDisplay/Stats';
import type { EpochHeaderProps } from './EpochHeader.types';

/**
 * Unified epoch header - everything in a single card
 */
export function EpochHeader({ epoch, stats, timestamp }: EpochHeaderProps): React.JSX.Element {
  return (
    <Card
      title={`Epoch ${epoch}`}
      subtitle={
        <Timestamp timestamp={timestamp} format="custom" className="text-xs text-muted">
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
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <BlockExplorerLink type="beaconchain" epoch={epoch} />
          <BlockExplorerLink type="dora" epoch={epoch} />
          <BlockExplorerLink type="tracoor" epoch={epoch} />
        </div>
      }
    >
      <Stats
        gridClassName="grid grid-cols-2 sm:grid-cols-3"
        stats={[
          {
            id: 'blocks',
            name: 'Blocks',
            value: `${stats.canonicalBlockCount} / 32`,
            valueClassName: stats.canonicalBlockCount === 32 ? 'text-success' : 'text-foreground',
          },
          {
            id: 'participation',
            name: 'Attestation Participation',
            value: `${(stats.participationRate * 100).toFixed(2)}%`,
          },
          {
            id: 'missed-attestations',
            name: 'Missed Attestations',
            value: stats.missedAttestations.toLocaleString(),
          },
        ]}
      />
    </Card>
  );
}
