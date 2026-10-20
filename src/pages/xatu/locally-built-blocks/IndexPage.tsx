import { type JSX } from 'react';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Alert } from '@/components/Feedback/Alert';
import { SlotTimeline, ClientPairingMatrix, LocallyBuiltBlocksSkeleton } from './components';
import { useSlotBlocks } from './hooks';

export function IndexPage(): JSX.Element {
  const {
    slotGroups,
    allExecutionClients,
    allConsensusClients,
    blockCountMap,
    maxBlockCount,
    clientPairingMap,
    maxPairingCount,
    allBlocks,
    isLoading,
    isFetching,
    error,
  } = useSlotBlocks();

  if (error) {
    return (
      <Container>
        <Header title="Locally Built Blocks" />
        <Alert variant="error" title="Failed to load data" description={error.message} />
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container>
        <Header title="Locally Built Blocks" />
        <div className="mb-6">
          <Alert
            variant="info"
            title="About Locally Built Blocks"
            description="These blocks were built locally by ethPandaOps sentry nodes. They represent what each node would have proposed if selected as a block proposer."
          />
        </div>
        <LocallyBuiltBlocksSkeleton />
      </Container>
    );
  }

  return (
    <Container>
      <div className="flex items-center gap-2">
        <Header title="Locally Built Blocks" />
        {isFetching && (
          <div className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" title="Refreshing data..." />
        )}
      </div>

      <div className="mb-6">
        <Alert
          variant="info"
          title="About Locally Built Blocks"
          description="These blocks were built locally by ethPandaOps sentry nodes. They represent what each node would have proposed if selected as a block proposer."
        />
      </div>

      <div className="space-y-6">
        <SlotTimeline
          slotGroups={slotGroups}
          allExecutionClients={allExecutionClients}
          allConsensusClients={allConsensusClients}
          blockCountMap={blockCountMap}
          maxBlockCount={maxBlockCount}
        />
        <ClientPairingMatrix
          executionClients={allExecutionClients}
          consensusClients={allConsensusClients}
          pairingMap={clientPairingMap}
          maxPairingCount={maxPairingCount}
          allBlocks={allBlocks}
        />
      </div>
    </Container>
  );
}
