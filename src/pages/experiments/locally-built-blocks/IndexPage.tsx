import { type JSX } from 'react';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Alert } from '@/components/Feedback/Alert';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { SlotTimeline } from './components';
import { useSlotBlocks } from './hooks';

export function IndexPage(): JSX.Element {
  const {
    slotGroups,
    allExecutionClients,
    allConsensusClients,
    blockCountMap,
    maxBlockCount,
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
      <div className="space-y-6">
        <SlotTimeline
          slotGroups={slotGroups}
          allExecutionClients={allExecutionClients}
          allConsensusClients={allConsensusClients}
          blockCountMap={blockCountMap}
          maxBlockCount={maxBlockCount}
        />
      </div>
    </Container>
  );
}
