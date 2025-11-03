import { useParams } from '@tanstack/react-router';
import { useMemo } from 'react';

import { Alert } from '@/components/Feedback/Alert';
import { BaseFeeChart } from '@/components/Ethereum/BaseFeeChart';
import { BlobCountChart } from '@/components/Ethereum/BlobCountChart';
import { BlockArrivalTimesChart } from '@/components/Ethereum/BlockArrivalTimesChart';
import { BlockSizeChart } from '@/components/Ethereum/BlockSizeChart';
import { BlockValueChart } from '@/components/Ethereum/BlockValueChart';
import { GasUsedChart } from '@/components/Ethereum/GasUsedChart';
import { MevAdoptionChart } from '@/components/Ethereum/MevAdoptionChart';
import { MevBuilderDistributionChart } from '@/components/Ethereum/MevBuilderDistributionChart';
import { MevRelayDistributionChart } from '@/components/Ethereum/MevRelayDistributionChart';
import { TopEntitiesChart } from '@/components/Ethereum/TopEntitiesChart';
import { TransactionCountChart } from '@/components/Ethereum/TransactionCountChart';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { ScrollAnchor } from '@/components/Navigation/ScrollAnchor';
import { formatEpoch } from '@/utils';
import { weiToEth } from '@/utils/ethereum';
import { useNetworkChangeRedirect } from '@/hooks/useNetworkChangeRedirect';
import { Route } from '@/routes/ethereum/epochs/$epoch';

import { EpochHeader, EpochSlotsTable } from './components';
import { useEpochDetailData } from './hooks';

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
  const context = Route.useRouteContext();

  // Redirect to epochs index when network changes
  useNetworkChangeRedirect(context.redirectOnNetworkChange);

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

  // Calculate epoch slot boundaries (32 slots per epoch)
  const startSlot = (epoch ?? 0) * 32;
  const endSlot = startSlot + 31;

  // Memoize xAxis config (shared across most charts) - must be before conditional returns
  const slotXAxis = useMemo(() => ({ name: 'Slot', min: startSlot, max: endSlot }), [startSlot, endSlot]);

  // Memoize relativeSlots config (shared across charts) - must be before conditional returns
  const relativeSlots = useMemo(() => ({ epoch: epoch ?? 0 }), [epoch]);

  // Memoize all chart data transformations - must be before conditional returns
  // Use empty arrays when data is not available to maintain hook order
  const blobCountData = useMemo(
    () => data?.blockProductionTimeSeries.map(d => ({ x: d.slot, value: d.blobCount })) ?? [],
    [data?.blockProductionTimeSeries]
  );

  const gasUsedData = useMemo(
    () =>
      data?.blockProductionTimeSeries
        .filter(d => d.gasUsed !== null)
        .map(d => ({ x: d.slot, gasUsed: d.gasUsed!, gasLimit: d.gasLimit ?? undefined })) ?? [],
    [data?.blockProductionTimeSeries]
  );

  const transactionCountData = useMemo(
    () =>
      data?.blockProductionTimeSeries
        .filter(d => d.transactionCount !== null)
        .map(d => ({ x: d.slot, value: d.transactionCount! })) ?? [],
    [data?.blockProductionTimeSeries]
  );

  const baseFeeData = useMemo(
    () =>
      data?.blockProductionTimeSeries
        .filter(d => d.baseFeePerGas !== null)
        .map(d => ({ x: d.slot, value: d.baseFeePerGas! })) ?? [],
    [data?.blockProductionTimeSeries]
  );

  const blockSizeData = useMemo(
    () =>
      data?.blockSizeTimeSeries.map(d => ({
        x: d.slot,
        consensusSize: d.consensusSize,
        consensusSizeCompressed: d.consensusSizeCompressed,
        executionSize: d.executionSize,
        executionSizeCompressed: d.executionSizeCompressed,
      })) ?? [],
    [data?.blockSizeTimeSeries]
  );

  const blockArrivalData = useMemo(
    () =>
      data?.blockArrivalTimeSeries.map(d => ({
        x: d.slot,
        min: d.min,
        p05: d.p05,
        p50: d.p50,
        p90: d.p90,
        max: d.max,
      })) ?? [],
    [data?.blockArrivalTimeSeries]
  );

  const mevAdoptionData = useMemo(
    () => data?.mevTimeSeries.map(d => ({ hasMev: d.hasMev })) ?? [],
    [data?.mevTimeSeries]
  );

  const blockValueData = useMemo(
    () =>
      data?.mevTimeSeries
        .filter(d => d.blockValue !== null)
        .map(d => ({ x: d.slot, value: weiToEth(d.blockValue!) })) ?? [],
    [data?.mevTimeSeries]
  );

  const missedAttestationsData = useMemo(
    () => data?.missedAttestationsByEntity.map(m => ({ x: m.slot, entity: m.entity, count: m.count })) ?? [],
    [data?.missedAttestationsByEntity]
  );

  const yAxisMissed = useMemo(() => ({ name: 'Missed' }), []);

  // Handle invalid epoch
  if (epoch === null) {
    return (
      <Container>
        <Header title="Invalid Epoch" description="The epoch parameter must be a valid non-negative integer" />
        <Alert variant="error" title="Invalid Epoch" description={`"${params.epoch}" is not a valid epoch number.`} />
      </Container>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Container>
        <Header title={`Epoch ${formatEpoch(epoch)}`} description="Loading epoch data..." />
        <LoadingContainer className="h-96" />
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container>
        <Header title={`Epoch ${formatEpoch(epoch)}`} description="Error loading epoch data" />
        <Alert variant="error" title="Error Loading Epoch Data" description={error.message} />
      </Container>
    );
  }

  // No data state
  if (!data) {
    return (
      <Container>
        <Header title={`Epoch ${formatEpoch(epoch)}`} description="No data available" />
        <Alert
          variant="info"
          title="No Data Available"
          description="No data was found for this epoch. It may not have occurred yet or data may not be available."
        />
      </Container>
    );
  }

  return (
    <Container>
      {/* Unified Header with breadcrumbs, title, and stats */}
      <EpochHeader epoch={epoch} stats={data.stats} timestamp={data.stats.epochStartDateTime} />

      {/* Metrics Charts - Grid Layout */}
      <div className="mt-8">
        <ScrollAnchor id="metrics">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Metrics</h2>
        </ScrollAnchor>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <BlobCountChart
            data={blobCountData}
            xAxis={slotXAxis}
            anchorId="blob-count-chart"
            relativeSlots={relativeSlots}
            syncGroup="slot-number"
          />
          <GasUsedChart
            data={gasUsedData}
            xAxis={slotXAxis}
            anchorId="gas-chart"
            relativeSlots={relativeSlots}
            syncGroup="slot-number"
          />
          <TransactionCountChart
            data={transactionCountData}
            xAxis={slotXAxis}
            anchorId="transaction-count-chart"
            relativeSlots={relativeSlots}
            syncGroup="slot-number"
          />
          <BaseFeeChart
            data={baseFeeData}
            xAxis={slotXAxis}
            anchorId="base-fee-chart"
            relativeSlots={relativeSlots}
            syncGroup="slot-number"
          />
          <BlockSizeChart
            data={blockSizeData}
            xAxis={slotXAxis}
            anchorId="block-size-chart"
            relativeSlots={relativeSlots}
            syncGroup="slot-number"
          />
          <BlockArrivalTimesChart
            data={blockArrivalData}
            xAxis={slotXAxis}
            anchorId="block-arrival-times-chart"
            relativeSlots={relativeSlots}
            syncGroup="slot-number"
          />
        </div>
      </div>

      {/* MEV */}
      <div className="mt-8">
        <ScrollAnchor id="mev">
          <h2 className="mb-4 text-xl font-semibold text-foreground">MEV</h2>
        </ScrollAnchor>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MevAdoptionChart data={mevAdoptionData} anchorId="mev-adoption-chart" />
          <BlockValueChart
            data={blockValueData}
            xAxis={slotXAxis}
            anchorId="block-value-chart"
            relativeSlots={relativeSlots}
            syncGroup="slot-number"
          />
          <MevBuilderDistributionChart data={data.mevTimeSeries} anchorId="mev-builder-distribution-chart" />
          <MevRelayDistributionChart data={data.mevTimeSeries} anchorId="mev-relay-distribution-chart" />
        </div>
      </div>

      {/* Attestations */}
      <div className="mt-8">
        <ScrollAnchor id="attestations">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Attestations</h2>
        </ScrollAnchor>
        <TopEntitiesChart
          data={missedAttestationsData}
          xAxis={slotXAxis}
          yAxis={yAxisMissed}
          title="Offline Validators"
          topN={10}
          anchorId="missed-attestations-chart"
          emptyMessage="No offline validators detected in this epoch"
          relativeSlots={relativeSlots}
          syncGroup="slot-number"
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
