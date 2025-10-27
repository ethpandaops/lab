import { Link, useParams } from '@tanstack/react-router';
import { useMemo } from 'react';

import { Alert } from '@/components/Feedback/Alert';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { ScrollAnchor } from '@/components/Navigation/ScrollAnchor';

import {
  BaseFeeChart,
  BlobCountChart,
  BlockSizeChart,
  BlockValueChart,
  EpochBasicInfoCard,
  EpochSlotsTable,
  GasChart,
  MevAdoptionChart,
  MevBuilderDistributionChart,
  MevRelayDistributionChart,
  MissedAttestationsBySlotChart,
  TransactionCountChart,
} from './components';
import { useEpochDetailData } from './hooks';

/**
 * Format a Unix timestamp as relative time
 */
function formatRelativeTime(unixSeconds: number): string {
  const now = Date.now();
  const timestamp = unixSeconds * 1000;
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  return `${diffDays}d ago`;
}

/**
 * Epoch detail page - comprehensive analysis of a single epoch
 *
 * Shows:
 * - Basic epoch statistics
 * - Missed attestations by entity time series chart
 * - Comprehensive table of all slots in the epoch
 *
 * Validates epoch parameter and handles errors
 */
export function DetailPage(): React.JSX.Element {
  const params = useParams({ from: '/ethereum/epochs/$epoch' });

  // Parse and validate epoch parameter
  const epoch = useMemo(() => {
    const parsed = parseInt(params.epoch, 10);
    if (isNaN(parsed) || parsed < 0) {
      return null;
    }
    return parsed;
  }, [params.epoch]);

  // Fetch data for this epoch
  const { data, isLoading, error } = useEpochDetailData(epoch ?? 0);

  // Handle invalid epoch
  if (epoch === null) {
    return (
      <Container>
        <Header title="Invalid Epoch" description="The epoch parameter must be a valid non-negative integer" />
        <Alert variant="error" title="Invalid Epoch" description={`"${params.epoch}" is not a valid epoch number.`} />
        <Link to="/ethereum/epochs" className="mt-4 inline-block text-primary hover:underline">
          ← Back to Epochs
        </Link>
      </Container>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Container>
        <Header title={`Epoch ${epoch}`} description="Loading epoch data..." />
        <LoadingContainer className="h-96" />
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container>
        <Header title={`Epoch ${epoch}`} description="Error loading epoch data" />
        <Alert variant="error" title="Error Loading Epoch Data" description={error.message} />
        <Link to="/ethereum/epochs" className="mt-4 inline-block text-primary hover:underline">
          ← Back to Epochs
        </Link>
      </Container>
    );
  }

  // No data state
  if (!data) {
    return (
      <Container>
        <Header title={`Epoch ${epoch}`} description="No data available" />
        <Alert
          variant="info"
          title="No Data Available"
          description="No data was found for this epoch. It may not have occurred yet or data may not be available."
        />
        <Link to="/ethereum/epochs" className="mt-4 inline-block text-primary hover:underline">
          ← Back to Epochs
        </Link>
      </Container>
    );
  }

  const timestamp = new Date(data.stats.epochStartDateTime * 1000);
  const relativeTime = formatRelativeTime(data.stats.epochStartDateTime);

  return (
    <Container>
      {/* Header */}
      <Header
        title={`Epoch ${epoch}`}
        description={`${timestamp.toLocaleString()} (${relativeTime}) · Detailed analysis of all ${data.slots.length} slots in this epoch`}
      />

      {/* Back link */}
      <Link to="/ethereum/epochs" className="mb-6 inline-block text-sm text-primary hover:underline">
        ← Back to Epochs
      </Link>

      {/* Basic Info Card */}
      <div className="mt-6">
        <ScrollAnchor id="epoch-overview">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Epoch Overview</h2>
        </ScrollAnchor>
        <EpochBasicInfoCard stats={data.stats} />
      </div>

      {/* Metrics Charts - Grid Layout */}
      <div className="mt-8">
        <ScrollAnchor id="metrics">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Metrics</h2>
        </ScrollAnchor>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <BlobCountChart data={data.blockProductionTimeSeries} anchorId="blob-count-chart" />
          <GasChart data={data.blockProductionTimeSeries} anchorId="gas-chart" />
          <TransactionCountChart data={data.blockProductionTimeSeries} anchorId="transaction-count-chart" />
          <BaseFeeChart data={data.blockProductionTimeSeries} anchorId="base-fee-chart" />
          <BlockSizeChart data={data.blockSizeTimeSeries} anchorId="block-size-chart" />
        </div>
      </div>

      {/* MEV */}
      <div className="mt-8">
        <ScrollAnchor id="mev">
          <h2 className="mb-4 text-xl font-semibold text-foreground">MEV</h2>
        </ScrollAnchor>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MevAdoptionChart data={data.mevTimeSeries} anchorId="mev-adoption-chart" />
          <BlockValueChart data={data.mevTimeSeries} anchorId="block-value-chart" />
          <MevBuilderDistributionChart data={data.mevTimeSeries} anchorId="mev-builder-distribution-chart" />
          <MevRelayDistributionChart data={data.mevTimeSeries} anchorId="mev-relay-distribution-chart" />
        </div>
      </div>

      {/* Attestations */}
      <div className="mt-8">
        <ScrollAnchor id="attestations">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Attestations</h2>
        </ScrollAnchor>
        <MissedAttestationsBySlotChart
          epoch={epoch}
          missedAttestationsByEntity={data.missedAttestationsByEntity}
          topEntitiesCount={10}
          anchorId="missed-attestations-chart"
        />
      </div>

      {/* Slots Table */}
      <div className="mt-8">
        <ScrollAnchor id="slot-details">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Slot Details</h2>
        </ScrollAnchor>
        <EpochSlotsTable slots={data.slots} />
      </div>
    </Container>
  );
}
