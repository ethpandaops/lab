import { Link, useParams } from '@tanstack/react-router';
import { useMemo } from 'react';

import { Alert } from '@/components/Feedback/Alert';
import { BaseFeeChart } from '@/components/Ethereum/BaseFeeChart';
import { BlobCountChart } from '@/components/Ethereum/BlobCountChart';
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
        <Header title={`Epoch ${formatEpoch(epoch)}`} description="No data available" />
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

  // Calculate epoch slot boundaries (32 slots per epoch)
  const startSlot = epoch * 32;
  const endSlot = startSlot + 31;

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
            data={data.blockProductionTimeSeries.map(d => ({ x: d.slot, value: d.blobCount }))}
            xAxis={{ name: 'Slot', min: startSlot, max: endSlot }}
            anchorId="blob-count-chart"
            relativeSlots={{ epoch }}
          />
          <GasUsedChart
            data={data.blockProductionTimeSeries
              .filter(d => d.gasUsed !== null)
              .map(d => ({ x: d.slot, gasUsed: d.gasUsed!, gasLimit: d.gasLimit ?? undefined }))}
            xAxis={{ name: 'Slot', min: startSlot, max: endSlot }}
            anchorId="gas-chart"
            relativeSlots={{ epoch }}
          />
          <TransactionCountChart
            data={data.blockProductionTimeSeries
              .filter(d => d.transactionCount !== null)
              .map(d => ({ x: d.slot, value: d.transactionCount! }))}
            xAxis={{ name: 'Slot', min: startSlot, max: endSlot }}
            anchorId="transaction-count-chart"
            relativeSlots={{ epoch }}
          />
          <BaseFeeChart
            data={data.blockProductionTimeSeries
              .filter(d => d.baseFeePerGas !== null)
              .map(d => ({ x: d.slot, value: d.baseFeePerGas! }))}
            xAxis={{ name: 'Slot', min: startSlot, max: endSlot }}
            anchorId="base-fee-chart"
            relativeSlots={{ epoch }}
          />
          <BlockSizeChart
            data={data.blockSizeTimeSeries.map(d => ({
              x: d.slot,
              consensusSize: d.consensusSize,
              consensusSizeCompressed: d.consensusSizeCompressed,
              executionSize: d.executionSize,
              executionSizeCompressed: d.executionSizeCompressed,
            }))}
            xAxis={{ name: 'Slot', min: startSlot, max: endSlot }}
            anchorId="block-size-chart"
            relativeSlots={{ epoch }}
          />
        </div>
      </div>

      {/* MEV */}
      <div className="mt-8">
        <ScrollAnchor id="mev">
          <h2 className="mb-4 text-xl font-semibold text-foreground">MEV</h2>
        </ScrollAnchor>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MevAdoptionChart data={data.mevTimeSeries.map(d => ({ hasMev: d.hasMev }))} anchorId="mev-adoption-chart" />
          <BlockValueChart
            data={data.mevTimeSeries
              .filter(d => d.blockValue !== null)
              .map(d => ({ x: d.slot, value: weiToEth(d.blockValue!) }))}
            xAxis={{ name: 'Slot', min: startSlot, max: endSlot }}
            anchorId="block-value-chart"
            relativeSlots={{ epoch }}
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
          data={data.missedAttestationsByEntity.map(m => ({ x: m.slot, entity: m.entity, count: m.count }))}
          xAxis={{ name: 'Slot', min: startSlot, max: endSlot }}
          yAxis={{ name: 'Missed' }}
          title="Offline Validators"
          topN={10}
          anchorId="missed-attestations-chart"
          emptyMessage="No offline validators detected in this epoch"
          relativeSlots={{ epoch }}
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
