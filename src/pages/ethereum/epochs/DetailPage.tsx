import { useParams, useNavigate } from '@tanstack/react-router';
import { useMemo, useEffect } from 'react';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

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
import { Button } from '@/components/Elements/Button';
import { Tab } from '@/components/Navigation/Tab';
import { ScrollableTabs } from '@/components/Navigation/ScrollableTabs';
import { formatEpoch } from '@/utils';
import { weiToEth } from '@/utils/ethereum';
import { useNetworkChangeRedirect } from '@/hooks/useNetworkChangeRedirect';
import { useHashTabs } from '@/hooks/useHashTabs';
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
  const navigate = useNavigate();

  // Redirect to epochs index when network changes
  useNetworkChangeRedirect(context.redirectOnNetworkChange);

  // Parse and validate epoch parameter
  const parsed = parseInt(params.epoch, 10);
  const epoch = isNaN(parsed) || parsed < 0 ? null : parsed;

  // Fetch data for this epoch
  const { data, isLoading, error } = useEpochDetailData(epoch ?? 0);

  // Keyboard navigation
  useEffect(() => {
    if (epoch === null) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Only handle arrow keys if not in an input/textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.key === 'ArrowLeft' && epoch > 0) {
        event.preventDefault();
        navigate({ to: '/ethereum/epochs/$epoch', params: { epoch: String(epoch - 1) } });
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigate({ to: '/ethereum/epochs/$epoch', params: { epoch: String(epoch + 1) } });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [epoch, navigate]);

  // Hash-based tab routing
  const { selectedIndex, onChange } = useHashTabs([
    { hash: 'slots' },
    {
      hash: 'blocks',
      anchors: [
        'blob-count-chart',
        'gas-chart',
        'transaction-count-chart',
        'base-fee-chart',
        'block-size-chart',
        'block-arrival-times-chart',
      ],
    },
    { hash: 'validators', anchors: ['missed-attestations-chart'] },
    {
      hash: 'mev',
      anchors: [
        'mev-adoption-chart',
        'block-value-chart',
        'mev-builder-distribution-chart',
        'mev-relay-distribution-chart',
      ],
    },
  ]);

  // Calculate p95 block arrival time
  const p95BlockArrivalTime = useMemo(() => {
    if (!data) return null;
    const p90Values = data.blockArrivalTimeSeries.filter(d => d.p90 !== null).map(d => d.p90!);
    if (p90Values.length === 0) return null;
    return p90Values.reduce((sum, val) => sum + val, 0) / p90Values.length / 1000; // Convert to seconds
  }, [data]);

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

  const startSlot = epoch * 32;
  const endSlot = startSlot + 31;

  return (
    <Container>
      {/* Navigation Controls */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Button
          variant="secondary"
          size="sm"
          rounded="sm"
          leadingIcon={<ChevronLeftIcon />}
          disabled={epoch === 0}
          onClick={() => navigate({ to: '/ethereum/epochs/$epoch', params: { epoch: String(epoch - 1) } })}
          aria-label="Previous epoch"
        >
          Previous
        </Button>
        <div className="text-sm text-muted">Use ← → arrow keys to navigate</div>
        <Button
          variant="secondary"
          size="sm"
          rounded="sm"
          trailingIcon={<ChevronRightIcon />}
          onClick={() => navigate({ to: '/ethereum/epochs/$epoch', params: { epoch: String(epoch + 1) } })}
          aria-label="Next epoch"
        >
          Next
        </Button>
      </div>

      {/* Unified Header with all stats integrated */}
      <EpochHeader
        epoch={epoch}
        stats={data.stats}
        timestamp={data.stats.epochStartDateTime}
        p95BlockArrivalTime={p95BlockArrivalTime}
      />

      {/* Tabbed Content */}
      <div className="mt-8">
        <TabGroup selectedIndex={selectedIndex} onChange={onChange}>
          <ScrollableTabs>
            <Tab hash="slots">Slots</Tab>
            <Tab hash="blocks">Blocks</Tab>
            <Tab hash="validators">Validators</Tab>
            <Tab hash="mev">MEV</Tab>
          </ScrollableTabs>

          <TabPanels className="mt-6">
            {/* Slots Tab */}
            <TabPanel>
              <EpochSlotsTable slots={data.slots} />
            </TabPanel>

            {/* Blocks Tab */}
            <TabPanel>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <BlobCountChart
                  data={data.blockProductionTimeSeries.map(d => ({ x: d.slot, value: d.blobCount }))}
                  xAxis={{ name: 'Slot', min: startSlot, max: endSlot }}
                  anchorId="blob-count-chart"
                  relativeSlots={{ epoch }}
                  syncGroup="slot-number"
                />
                <GasUsedChart
                  data={data.blockProductionTimeSeries
                    .filter(d => d.gasUsed !== null)
                    .map(d => ({ x: d.slot, gasUsed: d.gasUsed!, gasLimit: d.gasLimit ?? undefined }))}
                  xAxis={{ name: 'Slot', min: startSlot, max: endSlot }}
                  anchorId="gas-chart"
                  relativeSlots={{ epoch }}
                  syncGroup="slot-number"
                />
                <TransactionCountChart
                  data={data.blockProductionTimeSeries
                    .filter(d => d.transactionCount !== null)
                    .map(d => ({ x: d.slot, value: d.transactionCount! }))}
                  xAxis={{ name: 'Slot', min: startSlot, max: endSlot }}
                  anchorId="transaction-count-chart"
                  relativeSlots={{ epoch }}
                  syncGroup="slot-number"
                />
                <BaseFeeChart
                  data={data.blockProductionTimeSeries
                    .filter(d => d.baseFeePerGas !== null)
                    .map(d => ({ x: d.slot, value: d.baseFeePerGas! }))}
                  xAxis={{ name: 'Slot', min: startSlot, max: endSlot }}
                  anchorId="base-fee-chart"
                  relativeSlots={{ epoch }}
                  syncGroup="slot-number"
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
                  syncGroup="slot-number"
                />
                <BlockArrivalTimesChart
                  data={data.blockArrivalTimeSeries.map(d => ({
                    x: d.slot,
                    min: d.min,
                    p05: d.p05,
                    p50: d.p50,
                    p90: d.p90,
                    max: d.max,
                  }))}
                  xAxis={{ name: 'Slot', min: startSlot, max: endSlot }}
                  anchorId="block-arrival-times-chart"
                  relativeSlots={{ epoch }}
                  syncGroup="slot-number"
                />
              </div>
            </TabPanel>

            {/* Validators Tab */}
            <TabPanel>
              <TopEntitiesChart
                data={data.missedAttestationsByEntity.map(m => ({ x: m.slot, entity: m.entity, count: m.count }))}
                xAxis={{ name: 'Slot', min: startSlot, max: endSlot }}
                yAxis={{ name: 'Missed' }}
                title="Offline Validators"
                topN={10}
                anchorId="missed-attestations-chart"
                emptyMessage="No offline validators detected in this epoch"
                relativeSlots={{ epoch }}
                syncGroup="slot-number"
              />
            </TabPanel>

            {/* MEV Tab */}
            <TabPanel>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <MevAdoptionChart
                  data={data.mevTimeSeries.map(d => ({ hasMev: d.hasMev }))}
                  anchorId="mev-adoption-chart"
                />
                <BlockValueChart
                  data={data.mevTimeSeries
                    .filter(d => d.blockValue !== null)
                    .map(d => ({ x: d.slot, value: weiToEth(d.blockValue!) }))}
                  xAxis={{ name: 'Slot', min: startSlot, max: endSlot }}
                  anchorId="block-value-chart"
                  relativeSlots={{ epoch }}
                  syncGroup="slot-number"
                />
                <MevBuilderDistributionChart data={data.mevTimeSeries} anchorId="mev-builder-distribution-chart" />
                <MevRelayDistributionChart data={data.mevTimeSeries} anchorId="mev-relay-distribution-chart" />
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </Container>
  );
}
