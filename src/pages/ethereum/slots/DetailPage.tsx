import { type JSX } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Alert } from '@/components/Feedback/Alert';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { BlockArt } from '@/components/Charts/BlockArt';
import { ScrollAnchor } from '@/components/Navigation/ScrollAnchor';
import { SLOTS_PER_EPOCH } from '@/utils/beacon';
import { useSlotDetailData } from './hooks/useSlotDetailData';
import { SlotBasicInfoCard } from './components/SlotBasicInfoCard';
import { AttestationArrivalsChart } from './components/AttestationArrivalsChart';
import { AttestationParticipationCard } from './components/AttestationParticipationCard';
import { AttestationHeadCorrectnessCard } from './components/AttestationHeadCorrectnessCard';
import { BlockPropagationChart } from './components/BlockPropagationChart';
import { BlobPropagationChart } from './components/BlobPropagationChart';
import { MevBiddingTimelineChart } from './components/MevBiddingTimelineChart';
import { PreparedBlocksComparisonChart } from './components/PreparedBlocksComparisonChart';
import { BlockSizeEfficiencyChart } from './components/BlockSizeEfficiencyChart';
import { RelayDistributionChart } from './components/RelayDistributionChart';
import { BuilderCompetitionChart } from './components/BuilderCompetitionChart';

/**
 * Detail page for a specific slot.
 * Shows comprehensive slot data including block info, attestations, propagation, and more.
 */
export function DetailPage(): JSX.Element {
  const { slot: slotParam } = useParams({ from: '/ethereum/slots/$slot' });

  // Parse slot number from URL parameter
  const slot = parseInt(slotParam, 10);

  // Calculate epoch from slot
  const epoch = Math.floor(slot / SLOTS_PER_EPOCH);

  // Fetch all slot data
  const { data, isLoading, error } = useSlotDetailData(slot);

  // Validate slot number
  if (isNaN(slot) || slot < 0) {
    return (
      <Container>
        <Header title="Invalid Slot" description="The slot number provided is not valid" />
        <Alert
          variant="error"
          title="Invalid slot number"
          description={`"${slotParam}" is not a valid slot number. Please provide a positive integer.`}
        />
        <Link to="/ethereum/slots" className="mt-4 inline-block text-primary hover:underline">
          ← Back to slots
        </Link>
      </Container>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Container>
        <Header title={`Slot ${slot}`} description={`Epoch ${epoch}`} />
        <div className="space-y-6">
          {/* Basic info skeleton */}
          <LoadingContainer className="h-64 rounded-sm" />

          {/* Chart grid skeleton */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <LoadingContainer className="col-span-1 h-96 rounded-sm lg:col-span-2" />
            <LoadingContainer className="col-span-1 h-96 rounded-sm" />
            <LoadingContainer className="col-span-1 h-96 rounded-sm lg:col-span-2" />
          </div>
        </div>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container>
        <Header title={`Slot ${slot}`} description={`Epoch ${epoch}`} />
        <Alert variant="error" title="Error loading slot data" description={error.message} />
        <Link to="/ethereum/slots" className="mt-4 inline-block text-primary hover:underline">
          ← Back to slots
        </Link>
      </Container>
    );
  }

  // No data state
  if (!data || data.blockHead.length === 0) {
    return (
      <Container>
        <Header title={`Slot ${slot}`} description={`Epoch ${epoch}`} />
        <Alert
          variant="warning"
          title="No data available"
          description={`No data has been recorded for slot ${slot}. This slot may not have occurred yet, or data collection may not have been active.`}
        />
        <Link to="/ethereum/slots" className="mt-4 inline-block text-primary hover:underline">
          ← Back to slots
        </Link>
      </Container>
    );
  }

  // Get total expected validators from attestation correctness data
  // This is more accurate than summing committee validators (which would double-count)
  const totalExpectedValidators = data.attestationCorrectness[0]?.votes_max ?? 0;

  // Transform attestation data for chart
  const attestationData = data.attestations.map(item => ({
    chunk_slot_start_diff: item.chunk_slot_start_diff ?? 0,
    attestation_count: item.attestation_count ?? 0,
  }));

  // Transform block propagation data for chart
  const blockPropagationData = data.blockPropagation.map(item => ({
    seen_slot_start_diff: item.seen_slot_start_diff ?? 0,
    node_id: item.node_id ?? '',
    meta_client_geo_continent_code: item.meta_client_geo_continent_code,
  }));

  // Transform blob propagation data for chart
  const blobPropagationData = data.blobPropagation.map(item => ({
    blob_index: item.blob_index ?? 0,
    seen_slot_start_diff: item.seen_slot_start_diff ?? 0,
    node_id: item.node_id ?? '',
    meta_client_geo_continent_code: item.meta_client_geo_continent_code,
  }));

  // Transform attestation correctness data for chart
  const attestationCorrectnessData =
    data.attestationCorrectness.length > 0
      ? {
          votes_head: data.attestationCorrectness[0].votes_head ?? 0,
          votes_max: data.attestationCorrectness[0].votes_max ?? 0,
          votes_other: data.attestationCorrectness[0].votes_other ?? 0,
        }
      : null;

  // Transform MEV bidding data for chart
  const mevBiddingData = data.mevBidding.map(item => ({
    chunk_slot_start_diff: item.chunk_slot_start_diff ?? 0,
    value: item.value ?? '0',
    builder_pubkey: item.builder_pubkey ?? '',
    relay_names: item.relay_names,
    block_hash: item.block_hash,
    earliest_bid_date_time: item.earliest_bid_date_time,
  }));

  // Get winning MEV data from blockMev
  const winningMevValue = data.blockMev[0]?.value ?? undefined;
  const winningBuilder = data.blockMev[0]?.builder_pubkey ?? undefined;
  const winningRelay = data.blockMev[0]?.relay_names?.[0] ?? undefined;
  const winningBidTimestamp = data.blockMev[0]?.earliest_bid_date_time ?? undefined;

  // Transform proposed block data for PreparedBlocksComparisonChart
  const proposedBlock =
    data.blockMev.length > 0
      ? {
          execution_payload_value: data.blockMev[0]?.value || '0',
          consensus_payload_value: '0', // MEV value already includes all components
          execution_payload_gas_used: data.blockHead[0]?.execution_payload_gas_used || 0,
        }
      : undefined;

  return (
    <Container>
      {/* Header with BlockArt on the same row */}
      <div className="mb-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <Header title="Slot Detail" description="Detailed slot analysis and visualization" />
          <Link to="/ethereum/slots" className="mt-4 inline-block text-primary hover:underline">
            ← Back to slots
          </Link>
        </div>

        {/* BlockArt - p5.js 3D cube */}
        <div className="flex items-center justify-center lg:justify-end">
          <BlockArt
            width={180}
            height={180}
            blockHash={data.blockHead[0]?.block_root}
            blockNumber={data.blockHead[0]?.execution_payload_block_number ?? slot}
          />
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic slot information card */}
        <SlotBasicInfoCard slot={slot} epoch={epoch} data={data} />

        {/* Attestations Section */}
        <ScrollAnchor id="attestations">
          <Header size="xs" title="Attestations" showAccent={false} />
        </ScrollAnchor>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <AttestationArrivalsChart
            attestationData={attestationData}
            totalExpectedValidators={totalExpectedValidators}
          />
          <AttestationParticipationCard correctnessData={attestationCorrectnessData} />
          <AttestationHeadCorrectnessCard correctnessData={attestationCorrectnessData} />
        </div>

        {/* Block Propagation Section */}
        <ScrollAnchor id="block-propagation">
          <Header size="xs" title="Block Propagation" showAccent={false} />
        </ScrollAnchor>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <BlockPropagationChart blockPropagationData={blockPropagationData} />
          <BlobPropagationChart blobPropagationData={blobPropagationData} />
        </div>

        {/* Execution Section */}
        <ScrollAnchor id="execution">
          <Header size="xs" title="Execution" showAccent={false} />
        </ScrollAnchor>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <BlockSizeEfficiencyChart blockHead={data.blockHead[0]} />
        </div>

        {/* MEV Section - Only show if there's MEV data */}
        {(mevBiddingData.length > 0 ||
          data.relayBids.length > 0 ||
          data.builderBids.length > 0 ||
          data.preparedBlocks.length > 0) && (
          <>
            <ScrollAnchor id="mev">
              <Header size="xs" title="MEV" showAccent={false} />
            </ScrollAnchor>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {mevBiddingData.length > 0 && (
                <MevBiddingTimelineChart
                  biddingData={mevBiddingData}
                  winningMevValue={winningMevValue}
                  winningBuilder={winningBuilder}
                />
              )}
              {data.relayBids.length > 0 && (
                <RelayDistributionChart relayData={data.relayBids} winningRelay={winningRelay} />
              )}
              {data.builderBids.length > 0 && (
                <BuilderCompetitionChart builderData={data.builderBids} winningBuilder={winningBuilder} />
              )}
              {data.preparedBlocks.length > 0 && (
                <PreparedBlocksComparisonChart
                  preparedBlocks={data.preparedBlocks}
                  proposedBlock={proposedBlock}
                  winningBidTimestamp={winningBidTimestamp}
                  slotStartTime={data.blockHead[0]?.slot_start_date_time}
                />
              )}
            </div>
          </>
        )}
      </div>
    </Container>
  );
}
