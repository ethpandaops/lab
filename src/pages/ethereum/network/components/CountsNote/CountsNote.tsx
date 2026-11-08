import type { JSX } from 'react';
import { useNetwork } from '@/hooks/useNetwork';

/**
 * How the counts are made, and so how far to trust them: what the sentries miss, what rotating peer IDs add, which
 * execution nodes count, and on testnets how few vantage points there are.
 */
export function CountsNote({
  execution = false,
}: {
  /** Whether the page counts execution nodes too */ execution?: boolean;
}): JSX.Element {
  const { currentNetwork } = useNetwork();
  const testnet = !!currentNetwork && currentNetwork.name !== 'mainnet';

  return (
    <ul className="flex list-disc flex-col gap-1 pl-4 text-xs/5 text-muted">
      <li>
        Consensus peers are the peer IDs our libp2p sentries connected to. Nodes that never reach a sentry are missing,
        so counts are a lower bound, while a client that rotates its peer ID on restart counts once per ID.
      </li>
      {execution && <li>Execution nodes are those our discovery crawler found advertising this chain’s fork ID.</li>}
      {testnet && (
        <li className="text-foreground">
          {currentNetwork.display_name} is watched from a single vantage point or a few, so these counts cover less of
          the network than on mainnet.
        </li>
      )}
    </ul>
  );
}
