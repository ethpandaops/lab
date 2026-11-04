import { type JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearch, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  QuestionMarkCircleIcon,
  EyeIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Alert } from '@/components/Feedback/Alert';
import { Card } from '@/components/Layout/Card';
import { Tab } from '@/components/Navigation/Tab';
import { ScrollableTabs } from '@/components/Navigation/ScrollableTabs';
import { Button } from '@/components/Elements/Button';
import { SLOTS_PER_EPOCH, slotToTimestamp, getForkForSlot, isForkAtOrAfter } from '@/utils/beacon';
import { formatEpoch } from '@/utils';
import { useNetworkChangeRedirect } from '@/hooks/useNetworkChangeRedirect';
import { useTabState } from '@/hooks/useTabState';
import { useNetwork } from '@/hooks/useNetwork';
import { Route } from '@/routes/ethereum/slots/$slot';
import {
  dimBlockBlobSubmitterServiceListOptions,
  fctBlockBlobHeadServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import { useSlotDetailData } from './hooks/useSlotDetailData';
import { useSlotPayloadData } from './hooks/useSlotPayloadData';
import { useAllAttestationVotes } from './hooks/useAllAttestationVotes';
import { useSlotTableCoverage, noDataBefore } from './hooks/useSlotTableCoverage';
import { SlotBasicInfoCard } from './components/SlotBasicInfoCard';
import { SlotPayloadCard } from './components/SlotPayloadCard';
import { SlotDownloadModal } from './components/SlotDownloadModal';
import { AttestationArrivalsChart } from './components/AttestationArrivalsChart';
import { AttestationVotesBreakdownTable } from './components/AttestationVotesBreakdownTable';
import { AttestationsByEntity } from '@/components/Ethereum/AttestationsByEntity';
import { BlockPropagationChart } from './components/BlockPropagationChart';
import { BlockClassificationCDFChart } from './components/BlockClassificationCDFChart';
import { BlobPropagationChart } from './components/BlobPropagationChart';
import { BlobDataColumnSpreadChart } from './components/BlobDataColumnSpreadChart';
import { MevBiddingTimelineChart } from './components/MevBiddingTimelineChart';
import { PreparedBlocksComparisonChart } from './components/PreparedBlocksComparisonChart';
import { RelayDistributionChart } from './components/RelayDistributionChart';
import { BuilderCompetitionChart } from './components/BuilderCompetitionChart';
import { CopyToClipboard } from '@/components/Elements/CopyToClipboard';
import { ForkLabel } from '@/components/Ethereum/ForkLabel';
import { BlobPosterLogo } from '@/components/Ethereum/BlobPosterLogo';
import type { ForkVersion } from '@/utils/beacon';
import { SlotDetailSkeleton } from './components/SlotDetailSkeleton';
import { EngineTimingsCard } from './components/EngineTimingsCard';
import { SlotColumnCompletionCard } from './components/SlotColumnCompletionCard';
import { SlotProgressTimeline } from './components/SlotProgressTimeline';
import { useSlotEngineTimings } from './hooks/useSlotEngineTimings';
import { useSlotColumnCompletion } from './hooks/useSlotColumnCompletion';
import { NodeResourcesPanel } from './components/NodeResources';

/**
 * Detail page for a specific slot.
 * Shows comprehensive slot data organized in tabs: Overview, Attestations, Propagation, Execution, and MEV.
 */
export function DetailPage(): JSX.Element {
  const { slot: slotParam } = useParams({ from: '/ethereum/slots/$slot' });
  const search = useSearch({ from: '/ethereum/slots/$slot' });
  const context = Route.useRouteContext();
  const navigate = useNavigate();

  // Handle contributor filter change - updates URL params
  const handleContributorChange = useCallback(
    (contributor: string | undefined) => {
      navigate({
        to: '/ethereum/slots/$slot',
        params: { slot: slotParam },
        search: {
          tab: search.tab,
          contributor: contributor || undefined,
        },
        replace: true,
      });
    },
    [navigate, slotParam, search.tab]
  );

  // Redirect to slots index when network changes
  useNetworkChangeRedirect(context.redirectOnNetworkChange);

  // Parse slot number from URL parameter
  const slot = parseInt(slotParam, 10);

  // Calculate epoch from slot
  const epoch = Math.floor(slot / SLOTS_PER_EPOCH);

  // Get current network
  const { currentNetwork } = useNetwork();

  // Gloas (ePBS) slots get a dedicated Payload tab
  const isGloas = isForkAtOrAfter(getForkForSlot(slot, currentNetwork), 'gloas');
  const { data: payloadData } = useSlotPayloadData(slot, isGloas);
  // The chart draws one series per builder, which stops scaling somewhere
  // around a dozen. The strongest bidders keep individual series and the
  // auction frontier table supplies the "best bid" line — bounded by the
  // 50ms chunk grid no matter how many builders compete.
  const payloadBidRaceData = useMemo(() => {
    const TOP_BUILDERS = 10;

    const frontierRows = payloadData.bidFrontier.map(bid => ({
      chunk_slot_start_diff: bid.chunk_slot_start_diff ?? 0,
      value: bid.value ?? '0',
      builder_pubkey: 'best bid',
      block_hash: bid.block_hash,
    }));

    const peakByBuilder = new Map<number, bigint>();
    for (const bid of payloadData.bidRace) {
      if (bid.builder_index === undefined || !bid.value) continue;
      try {
        const value = BigInt(bid.value);
        if (value > (peakByBuilder.get(bid.builder_index) ?? -1n)) {
          peakByBuilder.set(bid.builder_index, value);
        }
      } catch {
        // ignore malformed values
      }
    }
    const topBuilders = new Set(
      [...peakByBuilder.entries()]
        .sort((a, b) => (a[1] > b[1] ? -1 : 1))
        .slice(0, TOP_BUILDERS)
        .map(([index]) => index)
    );

    const rows = payloadData.bidRace
      .filter(bid => bid.builder_index !== undefined && topBuilders.has(bid.builder_index))
      .map(bid => ({
        chunk_slot_start_diff: bid.chunk_slot_start_diff ?? 0,
        value: bid.value ?? '0',
        builder_pubkey: `builder-${bid.builder_index}`,
        block_hash: bid.block_hash,
      }));

    // Only draw the frontier alongside individual builders when it adds
    // information (i.e. some builders were cut from the top list).
    if (peakByBuilder.size > topBuilders.size) {
      rows.push(...frontierRows);
    }

    return rows;
  }, [payloadData.bidRace, payloadData.bidFrontier]);

  // Download modal (beacon block + blob sidecars)
  const [downloadOpen, setDownloadOpen] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Only handle arrow keys if not in an input/textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.key === 'ArrowLeft' && slot > 0) {
        event.preventDefault();
        navigate({ to: '/ethereum/slots/$slot', params: { slot: String(slot - 1) } });
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigate({ to: '/ethereum/slots/$slot', params: { slot: String(slot + 1) } });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slot, navigate]);

  // Which tables cover this slot: settled attestation tables where they reach it, and where each table starts
  const slotTimestamp = currentNetwork ? slotToTimestamp(slot, currentNetwork.genesis_time) : 0;
  const coverage = useSlotTableCoverage(slotTimestamp);

  // Fetch all slot data
  const { data, isLoading, error } = useSlotDetailData(slot, coverage);

  const columnCompletion = useSlotColumnCompletion(slot);

  // Fetch engine API timing data (reference nodes only for accurate benchmarks)
  const { data: engineTimingsData, isLoading: engineTimingsLoading } = useSlotEngineTimings({
    slot,
    referenceNodesOnly: true,
  });

  // Fetch ALL attestation votes (with pagination)
  const { data: allAttestationVotes, isLoading: attestationVotesLoading } = useAllAttestationVotes(
    slotTimestamp,
    coverage.settled.int_attestation_attested,
    !!currentNetwork && slotTimestamp > 0 && !coverage.isLoading
  );

  // Fetch blob submitters (depends on execution block number from block head)
  const executionBlockNumber = data?.blockHead[0]?.execution_payload_block_number;
  const { data: blobSubmittersData } = useQuery({
    ...dimBlockBlobSubmitterServiceListOptions({
      query: {
        block_number_eq: executionBlockNumber,
      },
    }),
    enabled: !!executionBlockNumber,
  });
  const blobSubmitters = blobSubmittersData?.dim_block_blob_submitter ?? [];

  // Fetch the slot's blobs from the head table (real-time, one row per blob with
  // its versioned hash + KZG commitment) — drives the blobs listing.
  const { data: blobHeadData } = useQuery({
    ...fctBlockBlobHeadServiceListOptions({
      query: { slot_start_date_time_eq: slotTimestamp, page_size: 100 },
    }),
    enabled: !!currentNetwork && slotTimestamp > 0,
  });
  const blobDetails = (blobHeadData?.fct_block_blob_head ?? [])
    .slice()
    .sort((a, b) => (a.blob_index ?? 0) - (b.blob_index ?? 0));

  // Tab state management with URL search params
  const { selectedIndex, onChange } = useTabState([
    { id: 'timeline' },
    { id: 'block' },
    { id: 'attestations', anchors: ['missed-attestations'] },
    { id: 'propagation' },
    { id: 'blobs' },
    ...(isGloas ? [{ id: 'payload' }] : []),
    { id: 'execution' },
    { id: 'mev' },
    { id: 'resources' },
  ]);

  // Validate slot number
  if (isNaN(slot) || slot < 0) {
    return (
      <Container>
        <Header title="Invalid Slot" />
        <Alert
          variant="error"
          title="Invalid slot number"
          description={`"${slotParam}" is not a valid slot number. Please provide a positive integer.`}
        />
      </Container>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Container>
        <SlotDetailSkeleton slot={slot} epoch={epoch} />
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container>
        <Header title={`Slot ${slot}`} description={`Epoch ${formatEpoch(epoch)}`} />
        <Alert variant="error" title="Error loading slot data" description={error.message} />
      </Container>
    );
  }

  // Check if we have ANY useful data for this slot
  // Even missed slots can have attestation data, committee info, etc.
  const hasAnyData =
    data &&
    (data.blockHead.length > 0 ||
      data.block.length > 0 ||
      data.attestations.length > 0 ||
      data.committees.length > 0 ||
      data.blockPropagation.length > 0 ||
      data.attestationCorrectness.length > 0 ||
      data.missedAttestations.length > 0);

  // No data state - only show when we have absolutely no data for this slot
  if (!data || !hasAnyData) {
    return (
      <Container>
        <Header title={`Slot ${slot}`} description={`Epoch ${formatEpoch(epoch)}`} />
        <Alert
          variant="warning"
          title="No data available"
          description="This slot may not have occurred yet, or data collection may not have been active."
        />
      </Container>
    );
  }

  // Determine if this is a missed slot (no block was proposed)
  const isMissedSlot = data.blockHead.length === 0 && data.block.length === 0;

  // Get the effective block data - prefer canonical (blockHead) but fall back to orphaned block
  // Will be undefined for missed slots
  const rawEffectiveBlockData = data.blockHead[0] ?? data.block[0];
  // Gloas (ePBS): the beacon block no longer carries the payload, so its
  // execution_payload_* columns arrive zero-filled. Overlay the real facts
  // from fct_block_payload (bid commitment + envelope contents) and null the
  // fields that genuinely no longer exist on the CL side.
  const effectiveBlockData =
    isGloas && rawEffectiveBlockData
      ? {
          ...rawEffectiveBlockData,
          execution_payload_block_hash: payloadData.payload?.block_hash ?? undefined,
          execution_payload_parent_hash: payloadData.payload?.parent_block_hash ?? undefined,
          execution_payload_transactions_count: payloadData.payload?.transactions_count ?? undefined,
          execution_payload_transactions_total_bytes: payloadData.payload?.transactions_total_bytes ?? undefined,
          execution_payload_transactions_total_bytes_compressed: undefined,
          execution_payload_gas_limit: payloadData.payload?.gas_limit ?? undefined,
          execution_payload_gas_used: undefined,
          execution_payload_base_fee_per_gas: undefined,
          execution_payload_blob_gas_used: undefined,
          execution_payload_excess_blob_gas: undefined,
          execution_payload_block_number: undefined,
          execution_payload_fee_recipient: undefined,
          execution_payload_state_root: undefined,
        }
      : rawEffectiveBlockData;

  // Get total expected validators from attestation correctness data
  // This is more accurate than summing committee validators (which would double-count)
  const totalExpectedValidators = data.attestationCorrectness[0]?.votes_max ?? 0;

  // Attestation data for chart (keep full data with block_root)
  const attestationData = data.attestations;

  // Transform block propagation data for chart
  const blockPropagationData = data.blockPropagation.map(item => ({
    seen_slot_start_diff: item.seen_slot_start_diff ?? 0,
    node_id: item.node_id ?? '',
    meta_client_geo_continent_code: item.meta_client_geo_continent_code,
    meta_client_geo_city: item.meta_client_geo_city,
    meta_client_geo_country: item.meta_client_geo_country,
    username: item.username,
    classification: item.classification,
  }));

  // Transform blob/data column propagation data for chart
  // For Fulu+, use data column data; for pre-Fulu, use blob data
  const blobPropagationData =
    data.dataColumnPropagation.length > 0
      ? data.dataColumnPropagation.map(item => ({
          column_index: item.column_index ?? 0,
          seen_slot_start_diff: item.seen_slot_start_diff ?? 0,
          node_id: item.node_id ?? '',
          meta_client_geo_continent_code: item.meta_client_geo_continent_code,
        }))
      : data.blobPropagation.map(item => ({
          blob_index: item.blob_index ?? 0,
          seen_slot_start_diff: item.seen_slot_start_diff ?? 0,
          node_id: item.node_id ?? '',
          meta_client_geo_continent_code: item.meta_client_geo_continent_code,
        }));

  // Total across every entity, not just the 10 charted
  const missedAttestationsSubtitle =
    data.totalMissedAttestations > 0
      ? `${data.totalMissedAttestations.toLocaleString()} missed attestations in total`
      : undefined;
  const livenessStart = coverage.dataStart('fct_attestation_liveness_by_entity');
  const attestedStart = coverage.dataStart('int_attestation_attested');
  const arrivalsStart = coverage.dataStart('fct_attestation_first_seen_chunked_50ms');
  const mevStart = coverage.dataStart('fct_block_mev');

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
  const winningBidMicros = data.blockMev[0]?.earliest_bid_date_time ?? undefined;

  // Transform proposed block data for PreparedBlocksComparisonChart
  const proposedBlock =
    data.blockMev.length > 0
      ? {
          execution_payload_value: data.blockMev[0]?.value || '0',
          consensus_payload_value: '0', // MEV value already includes all components
          execution_payload_gas_used: effectiveBlockData?.execution_payload_gas_used || 0,
        }
      : undefined;

  // Check if MEV data exists
  const hasMevData =
    mevBiddingData.length > 0 ||
    data.relayBids.length > 0 ||
    data.builderBids.length > 0 ||
    data.preparedBlocks.length > 0;

  // Get blob count for display
  const blobCount = data.blobCount[0]?.blob_count ?? 0;

  // Download modal inputs: canonical block root (the modal self-fetches blobs)
  const downloadBlockRoot = data.blockHead[0]?.block_root ?? data.block[0]?.block_root;

  return (
    <Container>
      {currentNetwork && (
        <SlotDownloadModal
          open={downloadOpen}
          onClose={() => setDownloadOpen(false)}
          network={currentNetwork.name}
          slot={slot}
          slotStartDateTime={slotToTimestamp(slot, currentNetwork.genesis_time)}
          blockRoot={downloadBlockRoot}
        />
      )}

      {/* Navigation Controls */}
      <div className="mb-6 flex items-center justify-between gap-2 sm:gap-4">
        <Button
          variant="secondary"
          size="sm"
          rounded="sm"
          leadingIcon={<ChevronLeftIcon />}
          disabled={slot === 0}
          onClick={() => navigate({ to: '/ethereum/slots/$slot', params: { slot: String(slot - 1) } })}
          aria-label="Previous slot"
        >
          Previous
        </Button>
        <div className="flex-1" />
        {currentNetwork && (downloadBlockRoot || blobCount > 0) && (
          <Button
            variant="secondary"
            size="sm"
            rounded="sm"
            leadingIcon={<ArrowDownTrayIcon />}
            onClick={() => setDownloadOpen(true)}
            aria-label="Download"
          >
            <span className="hidden sm:inline">Download</span>
          </Button>
        )}
        {currentNetwork &&
          (() => {
            const slotTimestamp = slotToTimestamp(slot, currentNetwork.genesis_time);
            return (
              <Link
                to="/ethereum/data-availability/custody"
                search={{
                  slot,
                  epoch,
                  hour: Math.floor(slotTimestamp / 3600) * 3600,
                  date: new Date(slotTimestamp * 1000).toISOString().split('T')[0],
                }}
                aria-label="View Custody"
                title="View Custody"
                className="flex items-center gap-1.5 rounded-sm border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent transition-all hover:border-accent/50 hover:bg-accent/20"
              >
                <EyeIcon className="size-4" />
                <span className="hidden sm:inline">View Custody</span>
              </Link>
            );
          })()}
        <Button
          variant="secondary"
          size="sm"
          rounded="sm"
          trailingIcon={<ChevronRightIcon />}
          onClick={() => navigate({ to: '/ethereum/slots/$slot', params: { slot: String(slot + 1) } })}
          aria-label="Next slot"
        >
          Next
        </Button>
      </div>

      {/* Orphaned/Reorged Block Alert */}
      {!isMissedSlot && data.isOrphaned && (
        <Alert
          variant="warning"
          title="Orphaned Block"
          description="This block was proposed but later removed from the canonical chain due to a reorganization. The data shown is from the orphaned block."
          className="mb-6"
        />
      )}

      <SlotBasicInfoCard
        slot={slot}
        epoch={epoch}
        data={data}
        isMissedSlot={isMissedSlot}
        dataStart={coverage.dataStart}
      />

      {/* Tabbed Content */}
      <div className="mt-8">
        <TabGroup selectedIndex={selectedIndex} onChange={onChange}>
          <ScrollableTabs>
            <Tab>Timeline</Tab>
            <Tab>Block</Tab>
            <Tab>Attestations</Tab>
            <Tab>Propagation</Tab>
            <Tab>Blobs</Tab>
            {isGloas && <Tab>Payload</Tab>}
            <Tab>Execution</Tab>
            <Tab>MEV</Tab>
            <Tab>Node Resources</Tab>
          </ScrollableTabs>

          {/* At least a viewport tall, so a tab still loading does not shorten the page and lose the scroll position */}
          <TabPanels className="mt-6 min-h-screen">
            {/* Timeline Tab - First-seen timing visualization */}
            <TabPanel>
              <SlotProgressTimeline
                slot={slot}
                blockPropagation={data.blockPropagation}
                headPropagation={data.headPropagation}
                blobPropagation={data.blobPropagation}
                dataColumnPropagation={data.dataColumnPropagation}
                attestations={data.attestations}
                mevBidding={data.mevBidding}
                payloadPropagation={isGloas ? payloadData.payloadFirstSeen : undefined}
                ptcArrivals={isGloas ? payloadData.ptcArrivals : undefined}
                contributor={search.contributor}
                onContributorChange={handleContributorChange}
              />
            </TabPanel>

            {/* Block Tab - All block data in two-column layout */}
            <TabPanel>
              <Card title="Block Data">
                {effectiveBlockData ? (
                  <dl className="grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-2">
                    {/* Beacon Block Section */}
                    <div className="col-span-1 lg:col-span-2">
                      <h4 className="text-sm font-semibold text-foreground">Beacon Block</h4>
                    </div>

                    {effectiveBlockData.block_root && (
                      <>
                        <dt className="text-sm font-medium text-muted">Block Root</dt>
                        <dd className="flex items-center gap-2 text-sm break-all text-foreground">
                          <span className="flex-1">{effectiveBlockData.block_root}</span>
                          <CopyToClipboard content={effectiveBlockData.block_root} />
                        </dd>
                      </>
                    )}

                    {effectiveBlockData.parent_root && (
                      <>
                        <dt className="text-sm font-medium text-muted">Parent Root</dt>
                        <dd className="flex items-center gap-2 text-sm break-all text-foreground">
                          <span className="flex-1">{effectiveBlockData.parent_root}</span>
                          <CopyToClipboard content={effectiveBlockData.parent_root} />
                        </dd>
                      </>
                    )}

                    {effectiveBlockData.state_root && (
                      <>
                        <dt className="text-sm font-medium text-muted">State Root</dt>
                        <dd className="flex items-center gap-2 text-sm break-all text-foreground">
                          <span className="flex-1">{effectiveBlockData.state_root}</span>
                          <CopyToClipboard content={effectiveBlockData.state_root} />
                        </dd>
                      </>
                    )}

                    {effectiveBlockData.block_version && (
                      <>
                        <dt className="text-sm font-medium text-muted">Block Version (Fork)</dt>
                        <dd className="flex items-center gap-2 text-sm text-foreground">
                          <span className="flex-1">
                            <ForkLabel fork={effectiveBlockData.block_version as ForkVersion} size="sm" />
                          </span>
                          <CopyToClipboard content={effectiveBlockData.block_version} />
                        </dd>
                      </>
                    )}

                    {effectiveBlockData.proposer_index !== undefined && effectiveBlockData.proposer_index !== null && (
                      <>
                        <dt className="text-sm font-medium text-muted">Proposer Index</dt>
                        <dd className="flex items-center gap-2 text-sm text-foreground">
                          <span className="flex-1">{effectiveBlockData.proposer_index.toLocaleString()}</span>
                          <CopyToClipboard content={effectiveBlockData.proposer_index.toString()} />
                        </dd>
                      </>
                    )}

                    {effectiveBlockData.block_total_bytes !== undefined &&
                      effectiveBlockData.block_total_bytes !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Block Total Bytes</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">{effectiveBlockData.block_total_bytes.toLocaleString()}</span>
                            <CopyToClipboard content={effectiveBlockData.block_total_bytes.toString()} />
                          </dd>
                        </>
                      )}

                    {effectiveBlockData.block_total_bytes_compressed !== undefined &&
                      effectiveBlockData.block_total_bytes_compressed !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Block Total Bytes (Compressed)</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">
                              {effectiveBlockData.block_total_bytes_compressed.toLocaleString()}
                            </span>
                            <CopyToClipboard content={effectiveBlockData.block_total_bytes_compressed.toString()} />
                          </dd>
                        </>
                      )}

                    {/* Execution Payload Section */}
                    <div className="col-span-1 mt-6 lg:col-span-2">
                      <h4 className="text-sm font-semibold text-foreground">Execution Payload</h4>
                    </div>

                    {effectiveBlockData.execution_payload_block_hash && (
                      <>
                        <dt className="text-sm font-medium text-muted">Execution Block Hash</dt>
                        <dd className="flex items-center gap-2 text-sm break-all text-foreground">
                          <span className="flex-1">{effectiveBlockData.execution_payload_block_hash}</span>
                          <CopyToClipboard content={effectiveBlockData.execution_payload_block_hash} />
                        </dd>
                      </>
                    )}

                    {effectiveBlockData.execution_payload_block_number !== undefined &&
                      effectiveBlockData.execution_payload_block_number !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Execution Block Number</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">
                              {effectiveBlockData.execution_payload_block_number.toLocaleString()}
                            </span>
                            <CopyToClipboard content={effectiveBlockData.execution_payload_block_number.toString()} />
                          </dd>
                        </>
                      )}

                    {effectiveBlockData.execution_payload_parent_hash && (
                      <>
                        <dt className="text-sm font-medium text-muted">Execution Parent Hash</dt>
                        <dd className="flex items-center gap-2 text-sm break-all text-foreground">
                          <span className="flex-1">{effectiveBlockData.execution_payload_parent_hash}</span>
                          <CopyToClipboard content={effectiveBlockData.execution_payload_parent_hash} />
                        </dd>
                      </>
                    )}

                    {effectiveBlockData.execution_payload_state_root && (
                      <>
                        <dt className="text-sm font-medium text-muted">Execution State Root</dt>
                        <dd className="flex items-center gap-2 text-sm break-all text-foreground">
                          <span className="flex-1">{effectiveBlockData.execution_payload_state_root}</span>
                          <CopyToClipboard content={effectiveBlockData.execution_payload_state_root} />
                        </dd>
                      </>
                    )}

                    {effectiveBlockData.execution_payload_fee_recipient && (
                      <>
                        <dt className="text-sm font-medium text-muted">Fee Recipient</dt>
                        <dd className="flex items-center gap-2 text-sm break-all text-foreground">
                          <span className="flex-1">{effectiveBlockData.execution_payload_fee_recipient}</span>
                          <CopyToClipboard content={effectiveBlockData.execution_payload_fee_recipient} />
                        </dd>
                      </>
                    )}

                    {effectiveBlockData.execution_payload_gas_limit !== undefined &&
                      effectiveBlockData.execution_payload_gas_limit !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Gas Limit</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">
                              {effectiveBlockData.execution_payload_gas_limit.toLocaleString()}
                            </span>
                            <CopyToClipboard content={effectiveBlockData.execution_payload_gas_limit.toString()} />
                          </dd>
                        </>
                      )}

                    {effectiveBlockData.execution_payload_gas_used !== undefined &&
                      effectiveBlockData.execution_payload_gas_used !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Gas Used</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">
                              {effectiveBlockData.execution_payload_gas_used.toLocaleString()}
                            </span>
                            <CopyToClipboard content={effectiveBlockData.execution_payload_gas_used.toString()} />
                          </dd>
                        </>
                      )}

                    {effectiveBlockData.execution_payload_base_fee_per_gas && (
                      <>
                        <dt className="text-sm font-medium text-muted">Base Fee Per Gas</dt>
                        <dd className="flex items-center gap-2 text-sm text-foreground">
                          <span className="flex-1">
                            {effectiveBlockData.execution_payload_base_fee_per_gas} wei (
                            {(Number(effectiveBlockData.execution_payload_base_fee_per_gas) / 1e9).toFixed(2)} Gwei)
                          </span>
                          <CopyToClipboard content={effectiveBlockData.execution_payload_base_fee_per_gas} />
                        </dd>
                      </>
                    )}

                    {effectiveBlockData.execution_payload_transactions_count !== undefined &&
                      effectiveBlockData.execution_payload_transactions_count !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Transaction Count</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">
                              {effectiveBlockData.execution_payload_transactions_count.toLocaleString()}
                            </span>
                            <CopyToClipboard
                              content={effectiveBlockData.execution_payload_transactions_count.toString()}
                            />
                          </dd>
                        </>
                      )}

                    {effectiveBlockData.execution_payload_transactions_total_bytes !== undefined &&
                      effectiveBlockData.execution_payload_transactions_total_bytes !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Transactions Total Bytes</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">
                              {effectiveBlockData.execution_payload_transactions_total_bytes.toLocaleString()}
                            </span>
                            <CopyToClipboard
                              content={effectiveBlockData.execution_payload_transactions_total_bytes.toString()}
                            />
                          </dd>
                        </>
                      )}

                    {effectiveBlockData.execution_payload_transactions_total_bytes_compressed !== undefined &&
                      effectiveBlockData.execution_payload_transactions_total_bytes_compressed !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Transactions Total Bytes (Compressed)</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">
                              {effectiveBlockData.execution_payload_transactions_total_bytes_compressed.toLocaleString()}
                            </span>
                            <CopyToClipboard
                              content={effectiveBlockData.execution_payload_transactions_total_bytes_compressed.toString()}
                            />
                          </dd>
                        </>
                      )}

                    {effectiveBlockData.execution_payload_blob_gas_used !== undefined &&
                      effectiveBlockData.execution_payload_blob_gas_used !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Blob Gas Used</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">
                              {effectiveBlockData.execution_payload_blob_gas_used.toLocaleString()}
                            </span>
                            <CopyToClipboard content={effectiveBlockData.execution_payload_blob_gas_used.toString()} />
                          </dd>
                        </>
                      )}

                    {effectiveBlockData.execution_payload_excess_blob_gas !== undefined &&
                      effectiveBlockData.execution_payload_excess_blob_gas !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Excess Blob Gas</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">
                              {effectiveBlockData.execution_payload_excess_blob_gas.toLocaleString()}
                            </span>
                            <CopyToClipboard
                              content={effectiveBlockData.execution_payload_excess_blob_gas.toString()}
                            />
                          </dd>
                        </>
                      )}

                    {/* ETH1 Data Section */}
                    <div className="col-span-1 mt-6 lg:col-span-2">
                      <h4 className="text-sm font-semibold text-foreground">ETH1 Data</h4>
                    </div>

                    {effectiveBlockData.eth1_data_block_hash && (
                      <>
                        <dt className="text-sm font-medium text-muted">ETH1 Block Hash</dt>
                        <dd className="flex items-center gap-2 text-sm break-all text-foreground">
                          <span className="flex-1">{effectiveBlockData.eth1_data_block_hash}</span>
                          <CopyToClipboard content={effectiveBlockData.eth1_data_block_hash} />
                        </dd>
                      </>
                    )}

                    {effectiveBlockData.eth1_data_deposit_root && (
                      <>
                        <dt className="text-sm font-medium text-muted">ETH1 Deposit Root</dt>
                        <dd className="flex items-center gap-2 text-sm break-all text-foreground">
                          <span className="flex-1">{effectiveBlockData.eth1_data_deposit_root}</span>
                          <CopyToClipboard content={effectiveBlockData.eth1_data_deposit_root} />
                        </dd>
                      </>
                    )}
                  </dl>
                ) : (
                  <p className="text-sm text-muted">No block data available for this slot</p>
                )}
              </Card>
            </TabPanel>

            {/* Attestations Tab */}
            <TabPanel>
              <div className="space-y-6">
                <AttestationVotesBreakdownTable
                  attestationData={allAttestationVotes}
                  currentSlot={slot}
                  votedForBlocks={data.votedForBlocks}
                  expectedValidatorCount={totalExpectedValidators}
                  isLoading={attestationVotesLoading}
                  emptyMessage={attestedStart ? noDataBefore(attestedStart) : undefined}
                />
                <AttestationArrivalsChart
                  attestationData={attestationData}
                  currentSlot={slot}
                  votedForBlocks={data.votedForBlocks}
                  totalExpectedValidators={totalExpectedValidators}
                  emptyMessage={arrivalsStart ? noDataBefore(arrivalsStart) : undefined}
                />
                <AttestationsByEntity
                  data={data.missedAttestations}
                  title="Missed Attestations: Top 10 Entities"
                  subtitle={missedAttestationsSubtitle}
                  anchorId="missed-attestations"
                  emptyMessage={livenessStart ? noDataBefore(livenessStart) : 'No missed attestations for this slot'}
                />
              </div>
            </TabPanel>

            {/* Propagation Tab */}
            <TabPanel>
              <div className="space-y-6">
                {blockPropagationData.length === 0 && blobPropagationData.length === 0 ? (
                  <Card>
                    <div className="py-8 text-center">
                      <p className="text-muted">No propagation data available for this slot</p>
                    </div>
                  </Card>
                ) : (
                  <>
                    {/* Check if we have data columns (Fulu+) - if so, make blob/data column chart full width */}
                    {data.dataColumnPropagation.length > 0 ? (
                      <>
                        <BlockPropagationChart blockPropagationData={blockPropagationData} />
                        <BlobPropagationChart blobPropagationData={blobPropagationData} />
                      </>
                    ) : (
                      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 3xl:grid-cols-3 4xl:grid-cols-4">
                        <BlockPropagationChart blockPropagationData={blockPropagationData} />
                        <BlobPropagationChart blobPropagationData={blobPropagationData} />
                      </div>
                    )}
                    {blockPropagationData.length > 0 && (
                      <BlockClassificationCDFChart blockPropagationData={blockPropagationData} />
                    )}
                    {blobPropagationData.length > 0 && (
                      <BlobDataColumnSpreadChart blobPropagationData={blobPropagationData} slot={slot} />
                    )}
                  </>
                )}
                <SlotColumnCompletionCard data={columnCompletion} />
              </div>
            </TabPanel>

            {/* Blobs Tab - Blob data and submitters */}
            <TabPanel>
              <div className="space-y-6">
                {blobCount === 0 && blobDetails.length === 0 && blobSubmitters.length === 0 ? (
                  <Card>
                    <div className="py-8 text-center">
                      <p className="text-muted">No blob data available for this slot</p>
                    </div>
                  </Card>
                ) : (
                  <>
                    {/* Blobs - one row per blob with its versioned hash + KZG commitment */}
                    {blobDetails.length > 0 && (
                      <Card
                        title="Blobs"
                        subtitle={`${blobDetails.length} blob${blobDetails.length !== 1 ? 's' : ''} in this block`}
                      >
                        <div className="grid gap-3">
                          {blobDetails.map(blob => (
                            <div
                              key={`${blob.block_root}-${blob.blob_index}`}
                              className="flex flex-col gap-2 rounded-sm border border-border bg-surface/50 p-4"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium text-foreground">Blob {blob.blob_index}</span>
                              </div>
                              <div className="flex flex-col gap-1.5 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="shrink-0 text-muted">Versioned Hash:</span>
                                  <code className="truncate font-mono text-foreground">{blob.versioned_hash}</code>
                                  {blob.versioned_hash && <CopyToClipboard content={blob.versioned_hash} />}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="shrink-0 text-muted">KZG Commitment:</span>
                                  <code className="truncate font-mono text-foreground">{blob.kzg_commitment}</code>
                                  {blob.kzg_commitment && <CopyToClipboard content={blob.kzg_commitment} />}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Blob Submitters */}
                    {blobSubmitters.length > 0 && (
                      <Card
                        title="Blob Submitters"
                        subtitle={`${blobSubmitters.reduce((sum, s) => sum + (s.versioned_hashes?.length ?? 0), 0)} blob${
                          blobSubmitters.reduce((sum, s) => sum + (s.versioned_hashes?.length ?? 0), 0) !== 1 ? 's' : ''
                        } across ${blobSubmitters.length} transaction${blobSubmitters.length !== 1 ? 's' : ''}`}
                      >
                        <div className="grid gap-3">
                          {blobSubmitters.map((submitter, index) => (
                            <div
                              key={submitter.transaction_hash ?? index}
                              className="flex items-center gap-4 rounded-sm border border-border bg-surface/50 p-4"
                            >
                              {/* Logo and Name */}
                              <div className="flex items-center gap-3">
                                {submitter.name && submitter.name !== 'Unknown' ? (
                                  <BlobPosterLogo poster={submitter.name} size={32} />
                                ) : (
                                  <div className="flex size-8 items-center justify-center rounded-xs bg-muted/20">
                                    <QuestionMarkCircleIcon className="size-5 text-muted" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium text-foreground">{submitter.name ?? 'Unknown'}</div>
                                  <div className="text-xs text-muted">
                                    {submitter.versioned_hashes?.length ?? 0} blob
                                    {(submitter.versioned_hashes?.length ?? 0) !== 1 ? 's' : ''}, Tx Index:{' '}
                                    {submitter.transaction_index ?? '-'}
                                  </div>
                                </div>
                              </div>

                              {/* Address and Tx Hash */}
                              <div className="ml-auto flex flex-col items-end gap-1">
                                {submitter.address && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted">Address:</span>
                                    <code className="font-mono text-foreground">
                                      {submitter.address.slice(0, 10)}...{submitter.address.slice(-8)}
                                    </code>
                                    <CopyToClipboard content={submitter.address} />
                                  </div>
                                )}
                                {submitter.transaction_hash && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted">Tx:</span>
                                    <code className="font-mono text-foreground">
                                      {submitter.transaction_hash.slice(0, 10)}...{submitter.transaction_hash.slice(-8)}
                                    </code>
                                    <CopyToClipboard content={submitter.transaction_hash} />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </TabPanel>

            {/* Payload Tab - Gloas (ePBS) payload lifecycle, only rendered post-gloas */}
            {isGloas && (
              <TabPanel>
                <div className="space-y-6">
                  <SlotPayloadCard
                    slot={slot}
                    proposerIndex={data.blockProposer[0]?.proposer_validator_index}
                    hasBlock={!isMissedSlot}
                  />
                  {payloadBidRaceData.length > 0 && (
                    <MevBiddingTimelineChart
                      biddingData={payloadBidRaceData}
                      winningMevValue={payloadData.bid?.value}
                      winningBuilder={payloadData.bid ? `builder-${payloadData.bid.builder_index}` : undefined}
                      title="Builder Bid Race"
                      anchorId="payload-bid-race"
                      yAxisTitle="Bid Value (ETH)"
                    />
                  )}
                  {payloadData.payloadFirstSeen.length > 0 && (
                    <BlockPropagationChart
                      blockPropagationData={payloadData.payloadFirstSeen.map(node => ({
                        seen_slot_start_diff: node.seen_slot_start_diff ?? 0,
                        node_id: node.node_id ?? 'unknown',
                        meta_client_geo_continent_code: node.meta_client_geo_continent_code,
                        meta_client_geo_country: node.meta_client_geo_country,
                        meta_client_geo_city: node.meta_client_geo_city,
                        username: node.username,
                        classification: node.classification,
                      }))}
                      title="Payload Propagation"
                      anchorId="payload-propagation-chart"
                    />
                  )}
                  {payloadData.ptcArrivals.length > 0 && (
                    <AttestationArrivalsChart
                      attestationData={payloadData.ptcArrivals}
                      currentSlot={slot}
                      votedForBlocks={data.votedForBlocks}
                      totalExpectedValidators={payloadData.ptcVote?.ptc_validators_seen ?? 0}
                      title="PTC Payload Attestation Arrivals"
                      anchorId="ptc-arrivals"
                    />
                  )}
                </div>
              </TabPanel>
            )}

            {/* Execution Tab - Comprehensive execution layer data */}
            <TabPanel>
              <div className="space-y-6">
                {/* Engine API Timings */}
                <EngineTimingsCard
                  data={engineTimingsData}
                  isLoading={engineTimingsLoading}
                  hasBlobsInSlot={blobCount > 0}
                  slot={slot}
                />
              </div>
            </TabPanel>

            {/* MEV Tab */}
            <TabPanel>
              {!hasMevData ? (
                <Card>
                  <div className="py-8 text-center">
                    <p className="text-muted">
                      {mevStart ? noDataBefore(mevStart) : 'No MEV data available for this slot'}
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {mevBiddingData.length > 0 && (
                    <div className="lg:col-span-2">
                      <MevBiddingTimelineChart
                        biddingData={mevBiddingData}
                        winningMevValue={winningMevValue}
                        winningBuilder={winningBuilder}
                      />
                    </div>
                  )}
                  {data.relayBids.length > 0 && (
                    <RelayDistributionChart relayData={data.relayBids} winningRelay={winningRelay} />
                  )}
                  {data.builderBids.length > 0 && (
                    <BuilderCompetitionChart builderData={data.builderBids} winningBuilder={winningBuilder} />
                  )}
                  {data.preparedBlocks.length > 0 && (
                    <div className="lg:col-span-2">
                      <PreparedBlocksComparisonChart
                        preparedBlocks={data.preparedBlocks}
                        proposedBlock={proposedBlock}
                        winningBidMicros={winningBidMicros}
                        slotStartTime={effectiveBlockData?.slot_start_date_time}
                      />
                    </div>
                  )}
                </div>
              )}
            </TabPanel>

            {/* Node Resources Tab */}
            <TabPanel>
              <NodeResourcesPanel
                slot={slot}
                blockPropagation={data.blockPropagation}
                headPropagation={data.headPropagation}
                dataColumnPropagation={data.dataColumnPropagation}
              />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </Container>
  );
}
