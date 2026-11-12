import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { useNetwork } from '@/hooks/useNetwork';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import type {
  FctPeerForkReadinessByClClientDaily,
  FctPeerForkReadinessByElClientDaily,
} from '@/pages/ethereum/clients/api/client-models';
import { ANGLE_COLORS } from '@/pages/ethereum/clients/utils/angle-colors';
import { groupForkIdNext, groupNextForkDigests, upcomingFork } from '@/pages/ethereum/clients/utils/census';
import { formatShare, total } from '@/pages/ethereum/network/utils/network-census';

export interface ForkReadinessProps {
  /** Consensus ENRs of the latest day */
  consensus: FctPeerForkReadinessByClClientDaily[];
  /** Execution ENRs on this chain of the latest day */
  execution: FctPeerForkReadinessByElClientDaily[];
}

/** Share of ENRs advertising the next fork, as a definition term and value */
function Readiness({ label, ready, records }: { label: string; ready: number; records: number }): JSX.Element {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs/5 text-muted">
        <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: ANGLE_COLORS.enr }} />
        {label}
      </dt>
      <dd className="text-lg/7 font-semibold text-foreground tabular-nums">{formatShare(ready, records)}</dd>
      <dd className="text-xs/5 text-muted tabular-nums">of {records.toLocaleString()} in the ENR crawl</dd>
    </div>
  );
}

/**
 * How much of the ENR crawl advertises the network's next fork, linking to that fork's page for readiness by client.
 */
export function ForkReadiness({ consensus, execution }: ForkReadinessProps): JSX.Element {
  const { currentNetwork } = useNetwork();
  const { epoch } = useBeaconClock();
  const next = upcomingFork(currentNetwork, epoch);
  const cl = groupNextForkDigests(consensus, next);
  const el = groupForkIdNext(execution, currentNetwork);
  const ready = (groups: Array<{ isNext: boolean; count: number }>): number =>
    total(
      groups.filter(group => group.isNext),
      group => group.count
    );

  return (
    <Card
      rounded
      title={next ? next.name : 'No upgrade scheduled'}
      actions={
        <Link
          to={next ? '/ethereum/forks/$fork' : '/ethereum/forks'}
          params={next ? { fork: next.slug } : undefined}
          className="text-sm text-primary hover:underline"
        >
          {next ? 'Readiness by client' : 'Forks'}
        </Link>
      }
    >
      {next ? (
        <dl className="grid grid-cols-2 gap-4">
          <Readiness
            label="Consensus ENRs advertising it"
            ready={ready(cl)}
            records={total(consensus, row => row.node_count)}
          />
          <Readiness
            label="Execution ENRs advertising it"
            ready={ready(el)}
            records={total(execution, row => row.node_count)}
          />
        </dl>
      ) : (
        <p className="text-sm text-muted">Readiness shows here once the next fork is scheduled.</p>
      )}
    </Card>
  );
}
