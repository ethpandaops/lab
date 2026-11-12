import { type JSX, useMemo } from 'react';
import { Container } from '@/components/Layout/Container';
import { useNetwork } from '@/hooks/useNetwork';
import { useNow } from '@/hooks/useNow';
import { groupNetworks } from '@/utils/networks';
import { NetworksTable } from './components/NetworksTable';

/** Start page: every network's head and indexing state. */
export function IndexPage(): JSX.Element {
  const { networks } = useNetwork();
  const groups = useMemo(() => groupNetworks(networks), [networks]);
  const now = Math.floor(useNow() / 1000);

  return (
    <Container>
      <div className="mb-6">
        <h1 className="font-display text-2xl/8 font-bold tracking-tight text-foreground">The Lab</h1>
        <p className="mt-1 text-sm/6 text-muted">Ethereum network data from ethPandaOps</p>
      </div>
      <div className="flex flex-col gap-4">
        {groups.map(group => (
          <NetworksTable key={group.id} group={group} now={now} />
        ))}
      </div>
    </Container>
  );
}
