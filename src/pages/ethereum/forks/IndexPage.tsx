import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { useForks } from '@/hooks/useForks';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { useNetwork } from '@/hooks/useNetwork';
import { ForksTimeline } from './components/ForksTimeline';
import { ForksHeader } from './components/ForksHeader';

/**
 * Forks landing page - displays Ethereum consensus layer fork information.
 *
 * Shows:
 * - Currently active fork and next upcoming fork
 * - Timeline of all forks
 * - Blob schedule changes
 */
export function IndexPage(): React.JSX.Element {
  const { allForks, activeFork, nextFork, isLoading } = useForks();
  const { epoch: currentEpoch } = useBeaconClock();
  const { currentNetwork } = useNetwork();

  if (isLoading) {
    return (
      <Container>
        <Header title="Forks" description="View Ethereum consensus layer fork history and upcoming network upgrades" />
        <LoadingContainer className="h-96" />
      </Container>
    );
  }

  return (
    <Container>
      <Header title="Forks" description="View Ethereum consensus layer fork history and upcoming network upgrades" />

      <div className="space-y-6">
        {/* Header with current and next fork */}
        <ForksHeader activeFork={activeFork} nextFork={nextFork} currentEpoch={currentEpoch} allForks={allForks} />

        {/* Timeline of all forks and blob schedule */}
        <ForksTimeline
          forks={allForks}
          currentEpoch={currentEpoch}
          blobSchedule={currentNetwork?.blob_schedule}
          genesisTime={currentNetwork?.genesis_time}
        />
      </div>
    </Container>
  );
}
