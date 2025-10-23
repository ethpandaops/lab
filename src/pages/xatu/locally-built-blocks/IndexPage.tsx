import { type JSX } from 'react';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Alert } from '@/components/Feedback/Alert';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { SlotTimeline, ClientPairingMatrix } from './components';
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
        <Header
          title="Locally Built Blocks"
          description="Blocks built locally by sentry nodes. Useful for analyzing client block building capabilities."
        />
        <Alert variant="error" title="Failed to load data" description={error.message} />
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container>
        <Header
          title="Locally Built Blocks"
          description="Blocks built locally by sentry nodes. Useful for analyzing client block building capabilities."
        />
        <LoadingContainer />
      </Container>
    );
  }

  return (
    <Container>
      <div className="flex items-center gap-2">
        <Header
          title="Locally Built Blocks"
          description="Blocks built locally by sentry nodes. Useful for analyzing client block building capabilities."
        />
        {isFetching && (
          <div className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" title="Refreshing data..." />
        )}
      </div>

      <div className="mb-6">
        <Alert
          variant="info"
          title="About Locally Built Blocks"
          description="These blocks were built locally by ethPandaOps sentry nodes. They represent what each node would have proposed if selected as a block proposer. This data is useful for comparing different client implementations and their transaction selection strategies across various execution and consensus client pairings."
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
