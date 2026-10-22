import { type JSX, useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Layout/Container';
import { useNetwork } from '@/hooks/useNetwork';
import { groupNetworks } from '@/utils/networks';
import { NetworksTable } from './components/NetworksTable';
import { LatestBlocks } from './components/LatestBlocks';

/** Current unix time, updating every second */
function useNow(): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Start page: every network's head and indexing state, then the newest blocks on the selected network. */
export function IndexPage(): JSX.Element {
  const { networks } = useNetwork();
  const groups = useMemo(() => groupNetworks(networks), [networks]);
  const now = useNow();

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
        <LatestBlocks now={now} />
      </div>
    </Container>
  );
}
