import { type JSX, useEffect } from 'react';
import { useParams, useNavigate, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import { ChevronLeftIcon, ChevronRightIcon, QuestionMarkCircleIcon, EyeIcon } from '@heroicons/react/24/outline';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Alert } from '@/components/Feedback/Alert';
import { Card } from '@/components/Layout/Card';
import { Tab } from '@/components/Navigation/Tab';
import { ScrollableTabs } from '@/components/Navigation/ScrollableTabs';
import { Button } from '@/components/Elements/Button';
import { SLOTS_PER_EPOCH, slotToTimestamp } from '@/utils/beacon';
import { formatEpoch } from '@/utils';
import { useNetworkChangeRedirect } from '@/hooks/useNetworkChangeRedirect';
import { useTabState } from '@/hooks/useTabState';
import { useNetwork } from '@/hooks/useNetwork';
import { Route } from '@/routes/ethereum/slots/$slot';
import { dimBlockBlobSubmitterServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { useSlotDetailData } from './hooks/useSlotDetailData';
import { useAllAttestationVotes } from './hooks/useAllAttestationVotes';
import { SlotBasicInfoCard } from './components/SlotBasicInfoCard';
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
import { MiniStat } from '@/components/DataDisplay/MiniStat';
import { CopyToClipboard } from '@/components/Elements/CopyToClipboard';
import { ForkLabel } from '@/components/Ethereum/ForkLabel';
import { BlobPosterLogo } from '@/components/Ethereum/BlobPosterLogo';
import { formatGasToMillions, ATTESTATION_DEADLINE_MS } from '@/utils';
import type { ForkVersion } from '@/utils/beacon';
import { SlotDetailSkeleton } from './components/SlotDetailSkeleton';

/**
 * Detail page for a specific slot.
 * Shows comprehensive slot data organized in tabs: Overview, Attestations, Propagation, Execution, and MEV.
 */
export function DetailPage(): JSX.Element {
  const { slot: slotParam } = useParams({ from: '/ethereum/slots/$slot' });
  const context = Route.useRouteContext();
  const navigate = useNavigate();

  // Redirect to slots index when network changes
  useNetworkChangeRedirect(context.redirectOnNetworkChange);

  // Parse slot number from URL parameter
  const slot = parseInt(slotParam, 10);

  // Calculate epoch from slot
  const epoch = Math.floor(slot / SLOTS_PER_EPOCH);

  // Get current network
  const { currentNetwork } = useNetwork();

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

  // Fetch all slot data
  const { data, isLoading, error } = useSlotDetailData(slot);

  // Fetch ALL attestation votes (with pagination)
  const slotTimestamp = currentNetwork ? slotToTimestamp(slot, currentNetwork.genesis_time) : 0;
  const { data: allAttestationVotes, isLoading: attestationVotesLoading } = useAllAttestationVotes(
    slotTimestamp,
    !!currentNetwork && slotTimestamp > 0
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

  // Tab state management with URL search params
  const { selectedIndex, onChange } = useTabState([
    { id: 'overview' },
    { id: 'block' },
    { id: 'attestations', anchors: ['missed-attestations'] },
    { id: 'propagation' },
    { id: 'blobs' },
    { id: 'execution' },
    { id: 'mev' },
  ]);

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

  // No data state
  if (!data || data.blockHead.length === 0) {
    return (
      <Container>
        <Header title={`Slot ${slot}`} description={`Epoch ${formatEpoch(epoch)}`} />
        <Alert
          variant="warning"
          title="No data available"
          description={`No data has been recorded for slot ${slot}. This slot may not have occurred yet, or data collection may not have been active.`}
        />
      </Container>
    );
  }

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

  // Calculate distinct client count for block nodes
  const distinctBlockClients = new Set(data.blockPropagation.map(item => item.meta_client_name).filter(Boolean)).size;

  // Calculate performance metrics
  const firstBlockSeen =
    data.blockPropagation.length > 0
      ? Math.min(...data.blockPropagation.map(node => node.seen_slot_start_diff ?? Infinity))
      : null;

  const formatFirstSeen = (ms: number | null): string => {
    if (ms === null || ms === Infinity) return 'N/A';
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const attestationCorrectness = data.attestationCorrectness[0];
  const attestationStats =
    attestationCorrectness &&
    attestationCorrectness.votes_max !== undefined &&
    attestationCorrectness.votes_max > 0 &&
    attestationCorrectness.votes_head !== null &&
    attestationCorrectness.votes_head !== undefined &&
    attestationCorrectness.votes_other !== null &&
    attestationCorrectness.votes_other !== undefined
      ? {
          totalVotes: attestationCorrectness.votes_head + attestationCorrectness.votes_other,
          votesHead: attestationCorrectness.votes_head,
          votesMax: attestationCorrectness.votes_max,
          participationPercentage:
            ((attestationCorrectness.votes_head + attestationCorrectness.votes_other) /
              attestationCorrectness.votes_max) *
            100,
          headPercentage: (attestationCorrectness.votes_head / attestationCorrectness.votes_max) * 100,
        }
      : null;

  // Calculate total missed attestations for subtitle
  const totalMissedAttestations = data.missedAttestations.reduce((sum, item) => sum + item.count, 0);
  const missedAttestationsSubtitle =
    totalMissedAttestations > 0 ? `${totalMissedAttestations.toLocaleString()} total missed attestations` : undefined;

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

  // Check if MEV data exists
  const hasMevData =
    mevBiddingData.length > 0 ||
    data.relayBids.length > 0 ||
    data.builderBids.length > 0 ||
    data.preparedBlocks.length > 0;

  // Check if blob data exists (submitters or blob metrics)
  const hasBlobData =
    blobSubmitters.length > 0 || data.blobCount[0]?.blob_count || data.blockHead[0]?.execution_payload_blob_gas_used;

  return (
    <Container>
      {/* Navigation Controls */}
      <div className="mb-6 flex items-center justify-between gap-4">
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
                className="flex items-center gap-1.5 rounded-sm border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent transition-all hover:border-accent/50 hover:bg-accent/20"
              >
                <EyeIcon className="size-4" />
                <span>View Custody</span>
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

      <SlotBasicInfoCard slot={slot} epoch={epoch} data={data} />

      {/* Tabbed Content */}
      <div className="mt-8">
        <TabGroup selectedIndex={selectedIndex} onChange={onChange}>
          <ScrollableTabs>
            <Tab>Overview</Tab>
            <Tab>Block</Tab>
            <Tab>Attestations</Tab>
            <Tab>Propagation</Tab>
            {hasBlobData && <Tab>Blobs</Tab>}
            <Tab>Execution</Tab>
            {hasMevData && <Tab>MEV</Tab>}
          </ScrollableTabs>

          <TabPanels className="mt-6">
            {/* Overview Tab - Clean, card-based layout with key metrics */}
            <TabPanel>
              <div className="space-y-6">
                {/* Performance Metrics */}
                <Card>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Performance Metrics</h3>
                    <p className="text-sm text-muted">Block timing and attestation statistics</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Block First Seen At */}
                    {firstBlockSeen !== null && firstBlockSeen !== Infinity && (
                      <MiniStat
                        label="Block First Seen At"
                        value={formatFirstSeen(firstBlockSeen)}
                        percentage={Math.min((firstBlockSeen / ATTESTATION_DEADLINE_MS) * 100, 100)}
                        showGauge
                        color="var(--color-success)"
                      />
                    )}

                    {/* Gas Used */}
                    {data.blockHead[0] &&
                      data.blockHead[0].execution_payload_gas_used !== null &&
                      data.blockHead[0].execution_payload_gas_used !== undefined &&
                      data.blockHead[0].execution_payload_gas_limit !== null &&
                      data.blockHead[0].execution_payload_gas_limit !== undefined &&
                      data.blockHead[0].execution_payload_gas_limit > 0 && (
                        <MiniStat
                          label="Gas Used"
                          value={formatGasToMillions(data.blockHead[0].execution_payload_gas_used)}
                          secondaryText={`/ ${formatGasToMillions(data.blockHead[0].execution_payload_gas_limit, 0)}`}
                          percentage={
                            (data.blockHead[0].execution_payload_gas_used /
                              data.blockHead[0].execution_payload_gas_limit) *
                            100
                          }
                          showGauge
                          color={
                            (data.blockHead[0].execution_payload_gas_used /
                              data.blockHead[0].execution_payload_gas_limit) *
                              100 >
                            90
                              ? 'var(--color-danger)'
                              : 'var(--color-success)'
                          }
                        />
                      )}

                    {/* Attestation Stats */}
                    {attestationStats && (
                      <>
                        <MiniStat
                          label="Participation"
                          value={attestationStats.totalVotes.toLocaleString()}
                          secondaryText={`/ ${attestationStats.votesMax.toLocaleString()} validators`}
                          percentage={attestationStats.participationPercentage}
                          showGauge
                        />
                        <MiniStat
                          label="Block Votes"
                          value={attestationStats.votesHead.toLocaleString()}
                          secondaryText={`/ ${attestationStats.votesMax.toLocaleString()} validators`}
                          percentage={attestationStats.headPercentage}
                          showGauge
                        />
                      </>
                    )}
                  </div>
                </Card>

                {/* Network Propagation */}
                {blockPropagationData.length > 0 && (
                  <Card>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-foreground">Network Propagation</h3>
                      <p className="text-sm text-muted">Nodes that received block data</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <MiniStat label="Block Nodes" value={distinctBlockClients.toLocaleString()} />
                    </div>
                  </Card>
                )}

                {/* MEV Activity */}
                {(data.blockMev[0]?.value || data.relayBids.length > 0 || data.builderBids.length > 0) && (
                  <Card>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-foreground">MEV Activity</h3>
                      <p className="text-sm text-muted">Block builder and relay participation</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {data.blockMev[0]?.value && data.blockMev[0].value !== '0' && (
                        <MiniStat
                          label="MEV Value"
                          value={`${(Number(data.blockMev[0].value) / 1e18).toFixed(4)} ETH`}
                        />
                      )}
                      {data.relayBids.length > 0 && (
                        <MiniStat
                          label="Relays"
                          value={data.relayBids.length.toString()}
                          secondaryText="Submitted bids"
                        />
                      )}
                      {data.builderBids.length > 0 && (
                        <MiniStat
                          label="Builders"
                          value={data.builderBids.length.toString()}
                          secondaryText="Submitted bids"
                        />
                      )}
                    </div>
                  </Card>
                )}
              </div>
            </TabPanel>

            {/* Block Tab - All block data in two-column layout */}
            <TabPanel>
              <Card>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Block Data</h3>
                  <p className="text-sm text-muted">Complete block information from beacon and execution layers</p>
                </div>
                {data.blockHead[0] ? (
                  <dl className="grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-2">
                    {/* Beacon Block Section */}
                    <div className="col-span-1 lg:col-span-2">
                      <h4 className="mb-4 border-b border-border pb-2 text-sm font-semibold text-foreground">
                        Beacon Block
                      </h4>
                    </div>

                    {data.blockHead[0].block_root && (
                      <>
                        <dt className="text-sm font-medium text-muted">Block Root</dt>
                        <dd className="flex items-center gap-2 text-sm break-all text-foreground">
                          <span className="flex-1">{data.blockHead[0].block_root}</span>
                          <CopyToClipboard content={data.blockHead[0].block_root} />
                        </dd>
                      </>
                    )}

                    {data.blockHead[0].parent_root && (
                      <>
                        <dt className="text-sm font-medium text-muted">Parent Root</dt>
                        <dd className="flex items-center gap-2 text-sm break-all text-foreground">
                          <span className="flex-1">{data.blockHead[0].parent_root}</span>
                          <CopyToClipboard content={data.blockHead[0].parent_root} />
                        </dd>
                      </>
                    )}

                    {data.blockHead[0].state_root && (
                      <>
                        <dt className="text-sm font-medium text-muted">State Root</dt>
                        <dd className="flex items-center gap-2 text-sm break-all text-foreground">
                          <span className="flex-1">{data.blockHead[0].state_root}</span>
                          <CopyToClipboard content={data.blockHead[0].state_root} />
                        </dd>
                      </>
                    )}

                    {data.blockHead[0].block_version && (
                      <>
                        <dt className="text-sm font-medium text-muted">Block Version (Fork)</dt>
                        <dd className="flex items-center gap-2 text-sm text-foreground">
                          <span className="flex-1">
                            <ForkLabel fork={data.blockHead[0].block_version as ForkVersion} size="sm" />
                          </span>
                          <CopyToClipboard content={data.blockHead[0].block_version} />
                        </dd>
                      </>
                    )}

                    {data.blockHead[0].proposer_index !== undefined && data.blockHead[0].proposer_index !== null && (
                      <>
                        <dt className="text-sm font-medium text-muted">Proposer Index</dt>
                        <dd className="flex items-center gap-2 text-sm text-foreground">
                          <span className="flex-1">{data.blockHead[0].proposer_index.toLocaleString()}</span>
                          <CopyToClipboard content={data.blockHead[0].proposer_index.toString()} />
                        </dd>
                      </>
                    )}

                    {data.blockHead[0].block_total_bytes !== undefined &&
                      data.blockHead[0].block_total_bytes !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Block Total Bytes</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">{data.blockHead[0].block_total_bytes.toLocaleString()}</span>
                            <CopyToClipboard content={data.blockHead[0].block_total_bytes.toString()} />
                          </dd>
                        </>
                      )}

                    {data.blockHead[0].block_total_bytes_compressed !== undefined &&
                      data.blockHead[0].block_total_bytes_compressed !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Block Total Bytes (Compressed)</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">
                              {data.blockHead[0].block_total_bytes_compressed.toLocaleString()}
                            </span>
                            <CopyToClipboard content={data.blockHead[0].block_total_bytes_compressed.toString()} />
                          </dd>
                        </>
                      )}

                    {/* Execution Payload Section */}
                    <div className="col-span-1 mt-6 lg:col-span-2">
                      <h4 className="mb-4 border-b border-border pb-2 text-sm font-semibold text-foreground">
                        Execution Payload
                      </h4>
                    </div>

                    {data.blockHead[0].execution_payload_block_hash && (
                      <>
                        <dt className="text-sm font-medium text-muted">Execution Block Hash</dt>
                        <dd className="flex items-center gap-2 text-sm break-all text-foreground">
                          <span className="flex-1">{data.blockHead[0].execution_payload_block_hash}</span>
                          <CopyToClipboard content={data.blockHead[0].execution_payload_block_hash} />
                        </dd>
                      </>
                    )}

                    {data.blockHead[0].execution_payload_block_number !== undefined &&
                      data.blockHead[0].execution_payload_block_number !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Execution Block Number</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">
                              {data.blockHead[0].execution_payload_block_number.toLocaleString()}
                            </span>
                            <CopyToClipboard content={data.blockHead[0].execution_payload_block_number.toString()} />
                          </dd>
                        </>
                      )}

                    {data.blockHead[0].execution_payload_parent_hash && (
                      <>
                        <dt className="text-sm font-medium text-muted">Execution Parent Hash</dt>
                        <dd className="flex items-center gap-2 text-sm break-all text-foreground">
                          <span className="flex-1">{data.blockHead[0].execution_payload_parent_hash}</span>
                          <CopyToClipboard content={data.blockHead[0].execution_payload_parent_hash} />
                        </dd>
                      </>
                    )}

                    {data.blockHead[0].execution_payload_state_root && (
                      <>
                        <dt className="text-sm font-medium text-muted">Execution State Root</dt>
                        <dd className="flex items-center gap-2 text-sm break-all text-foreground">
                          <span className="flex-1">{data.blockHead[0].execution_payload_state_root}</span>
                          <CopyToClipboard content={data.blockHead[0].execution_payload_state_root} />
                        </dd>
                      </>
                    )}

                    {data.blockHead[0].execution_payload_fee_recipient && (
                      <>
                        <dt className="text-sm font-medium text-muted">Fee Recipient</dt>
                        <dd className="flex items-center gap-2 text-sm break-all text-foreground">
                          <span className="flex-1">{data.blockHead[0].execution_payload_fee_recipient}</span>
                          <CopyToClipboard content={data.blockHead[0].execution_payload_fee_recipient} />
                        </dd>
                      </>
                    )}

                    {data.blockHead[0].execution_payload_gas_limit !== undefined &&
                      data.blockHead[0].execution_payload_gas_limit !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Gas Limit</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">
                              {data.blockHead[0].execution_payload_gas_limit.toLocaleString()}
                            </span>
                            <CopyToClipboard content={data.blockHead[0].execution_payload_gas_limit.toString()} />
                          </dd>
                        </>
                      )}

                    {data.blockHead[0].execution_payload_gas_used !== undefined &&
                      data.blockHead[0].execution_payload_gas_used !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Gas Used</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">
                              {data.blockHead[0].execution_payload_gas_used.toLocaleString()}
                            </span>
                            <CopyToClipboard content={data.blockHead[0].execution_payload_gas_used.toString()} />
                          </dd>
                        </>
                      )}

                    {data.blockHead[0].execution_payload_base_fee_per_gas && (
                      <>
                        <dt className="text-sm font-medium text-muted">Base Fee Per Gas</dt>
                        <dd className="flex items-center gap-2 text-sm text-foreground">
                          <span className="flex-1">
                            {data.blockHead[0].execution_payload_base_fee_per_gas} wei (
                            {(Number(data.blockHead[0].execution_payload_base_fee_per_gas) / 1e9).toFixed(2)} Gwei)
                          </span>
                          <CopyToClipboard content={data.blockHead[0].execution_payload_base_fee_per_gas} />
                        </dd>
                      </>
                    )}

                    {data.blockHead[0].execution_payload_transactions_count !== undefined &&
                      data.blockHead[0].execution_payload_transactions_count !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Transaction Count</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">
                              {data.blockHead[0].execution_payload_transactions_count.toLocaleString()}
                            </span>
                            <CopyToClipboard
                              content={data.blockHead[0].execution_payload_transactions_count.toString()}
                            />
                          </dd>
                        </>
                      )}

                    {data.blockHead[0].execution_payload_transactions_total_bytes !== undefined &&
                      data.blockHead[0].execution_payload_transactions_total_bytes !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Transactions Total Bytes</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">
                              {data.blockHead[0].execution_payload_transactions_total_bytes.toLocaleString()}
                            </span>
                            <CopyToClipboard
                              content={data.blockHead[0].execution_payload_transactions_total_bytes.toString()}
                            />
                          </dd>
                        </>
                      )}

                    {data.blockHead[0].execution_payload_transactions_total_bytes_compressed !== undefined &&
                      data.blockHead[0].execution_payload_transactions_total_bytes_compressed !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Transactions Total Bytes (Compressed)</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">
                              {data.blockHead[0].execution_payload_transactions_total_bytes_compressed.toLocaleString()}
                            </span>
                            <CopyToClipboard
                              content={data.blockHead[0].execution_payload_transactions_total_bytes_compressed.toString()}
                            />
                          </dd>
                        </>
                      )}

                    {data.blockHead[0].execution_payload_blob_gas_used !== undefined &&
                      data.blockHead[0].execution_payload_blob_gas_used !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Blob Gas Used</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">
                              {data.blockHead[0].execution_payload_blob_gas_used.toLocaleString()}
                            </span>
                            <CopyToClipboard content={data.blockHead[0].execution_payload_blob_gas_used.toString()} />
                          </dd>
                        </>
                      )}

                    {data.blockHead[0].execution_payload_excess_blob_gas !== undefined &&
                      data.blockHead[0].execution_payload_excess_blob_gas !== null && (
                        <>
                          <dt className="text-sm font-medium text-muted">Excess Blob Gas</dt>
                          <dd className="flex items-center gap-2 text-sm text-foreground">
                            <span className="flex-1">
                              {data.blockHead[0].execution_payload_excess_blob_gas.toLocaleString()}
                            </span>
                            <CopyToClipboard content={data.blockHead[0].execution_payload_excess_blob_gas.toString()} />
                          </dd>
                        </>
                      )}

                    {/* ETH1 Data Section */}
                    <div className="col-span-1 mt-6 lg:col-span-2">
                      <h4 className="mb-4 border-b border-border pb-2 text-sm font-semibold text-foreground">
                        ETH1 Data
                      </h4>
                    </div>

                    {data.blockHead[0].eth1_data_block_hash && (
                      <>
                        <dt className="text-sm font-medium text-muted">ETH1 Block Hash</dt>
                        <dd className="flex items-center gap-2 text-sm break-all text-foreground">
                          <span className="flex-1">{data.blockHead[0].eth1_data_block_hash}</span>
                          <CopyToClipboard content={data.blockHead[0].eth1_data_block_hash} />
                        </dd>
                      </>
                    )}

                    {data.blockHead[0].eth1_data_deposit_root && (
                      <>
                        <dt className="text-sm font-medium text-muted">ETH1 Deposit Root</dt>
                        <dd className="flex items-center gap-2 text-sm break-all text-foreground">
                          <span className="flex-1">{data.blockHead[0].eth1_data_deposit_root}</span>
                          <CopyToClipboard content={data.blockHead[0].eth1_data_deposit_root} />
                        </dd>
                      </>
                    )}
                  </dl>
                ) : (
                  <p className="text-sm text-muted">No block data available</p>
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
                />
                <AttestationArrivalsChart
                  attestationData={attestationData}
                  currentSlot={slot}
                  votedForBlocks={data.votedForBlocks}
                  totalExpectedValidators={totalExpectedValidators}
                />
                <AttestationsByEntity
                  data={data.missedAttestations}
                  title="Missed Attestations by Entity"
                  subtitle={missedAttestationsSubtitle}
                  anchorId="missed-attestations"
                  emptyMessage="No missed attestations for this slot"
                />
              </div>
            </TabPanel>

            {/* Propagation Tab */}
            <TabPanel>
              <div className="space-y-6">
                {/* Check if we have data columns (Fulu+) - if so, make blob/data column chart full width */}
                {data.dataColumnPropagation.length > 0 ? (
                  <>
                    <BlockPropagationChart blockPropagationData={blockPropagationData} />
                    <BlobPropagationChart blobPropagationData={blobPropagationData} />
                  </>
                ) : (
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
              </div>
            </TabPanel>

            {/* Blobs Tab - Blob data and submitters */}
            {hasBlobData && (
              <TabPanel>
                <div className="space-y-6">
                  {/* Blob Metrics */}
                  {(data.blockHead[0]?.execution_payload_blob_gas_used !== null ||
                    data.blockHead[0]?.execution_payload_excess_blob_gas !== null ||
                    (data.blobCount[0] && data.blobCount[0].blob_count)) && (
                    <Card>
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-foreground">Blob Metrics</h3>
                        <p className="text-sm text-muted">EIP-4844 blob gas usage for this block</p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {data.blobCount[0] &&
                          data.blobCount[0].blob_count !== undefined &&
                          data.blobCount[0].blob_count !== null && (
                            <MiniStat label="Blob Count" value={data.blobCount[0].blob_count.toString()} />
                          )}

                        {data.blockHead[0]?.execution_payload_blob_gas_used !== null &&
                          data.blockHead[0]?.execution_payload_blob_gas_used !== undefined && (
                            <MiniStat
                              label="Blob Gas Used"
                              value={`${(data.blockHead[0].execution_payload_blob_gas_used / 1e6).toFixed(2)}M`}
                            />
                          )}

                        {data.blockHead[0]?.execution_payload_excess_blob_gas !== null &&
                          data.blockHead[0]?.execution_payload_excess_blob_gas !== undefined && (
                            <MiniStat
                              label="Excess Blob Gas"
                              value={`${(data.blockHead[0].execution_payload_excess_blob_gas / 1e6).toFixed(2)}M`}
                            />
                          )}
                      </div>
                    </Card>
                  )}

                  {/* Blob Submitters */}
                  {blobSubmitters.length > 0 && (
                    <Card>
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-foreground">Blob Submitters</h3>
                        <p className="text-sm text-muted">
                          {blobSubmitters.length} blob transaction{blobSubmitters.length !== 1 ? 's' : ''} in this block
                        </p>
                      </div>
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
                                <div className="text-xs text-muted">Tx Index: {submitter.transaction_index ?? '-'}</div>
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
                </div>
              </TabPanel>
            )}

            {/* Execution Tab - Comprehensive execution layer data */}
            <TabPanel>
              <div className="space-y-6">
                {data.blockHead[0] && (
                  <>
                    {/* Transaction & Gas Metrics */}
                    <Card>
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-foreground">Transactions & Gas</h3>
                        <p className="text-sm text-muted">Block execution metrics</p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {data.blockHead[0].execution_payload_transactions_count !== null &&
                          data.blockHead[0].execution_payload_transactions_count !== undefined && (
                            <MiniStat
                              label="Transactions"
                              value={data.blockHead[0].execution_payload_transactions_count.toLocaleString()}
                            />
                          )}

                        {data.blockHead[0].execution_payload_gas_used !== null &&
                          data.blockHead[0].execution_payload_gas_used !== undefined &&
                          data.blockHead[0].execution_payload_gas_limit !== null &&
                          data.blockHead[0].execution_payload_gas_limit !== undefined &&
                          data.blockHead[0].execution_payload_gas_limit > 0 && (
                            <MiniStat
                              label="Gas Used"
                              value={formatGasToMillions(data.blockHead[0].execution_payload_gas_used)}
                              secondaryText={`/ ${formatGasToMillions(data.blockHead[0].execution_payload_gas_limit, 0)}`}
                              percentage={
                                (data.blockHead[0].execution_payload_gas_used /
                                  data.blockHead[0].execution_payload_gas_limit) *
                                100
                              }
                              showGauge
                              color={
                                (data.blockHead[0].execution_payload_gas_used /
                                  data.blockHead[0].execution_payload_gas_limit) *
                                  100 >
                                90
                                  ? 'var(--color-danger)'
                                  : 'var(--color-success)'
                              }
                            />
                          )}

                        {data.blockHead[0].execution_payload_base_fee_per_gas && (
                          <MiniStat
                            label="Base Fee"
                            value={`${(Number(data.blockHead[0].execution_payload_base_fee_per_gas) / 1e9).toFixed(2)} Gwei`}
                          />
                        )}

                        {data.blockHead[0].execution_payload_transactions_total_bytes !== null &&
                          data.blockHead[0].execution_payload_transactions_total_bytes !== undefined && (
                            <MiniStat
                              label="Total Bytes"
                              value={
                                data.blockHead[0].execution_payload_transactions_total_bytes < 1024 * 1024
                                  ? `${(data.blockHead[0].execution_payload_transactions_total_bytes / 1024).toFixed(2)} KB`
                                  : `${(data.blockHead[0].execution_payload_transactions_total_bytes / (1024 * 1024)).toFixed(2)} MB`
                              }
                            />
                          )}
                      </div>
                    </Card>
                  </>
                )}
              </div>
            </TabPanel>

            {/* MEV Tab - Only included if there's MEV data */}
            {hasMevData && (
              <TabPanel>
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
                        winningBidTimestamp={winningBidTimestamp}
                        slotStartTime={data.blockHead[0]?.slot_start_date_time}
                      />
                    </div>
                  )}
                </div>
              </TabPanel>
            )}
          </TabPanels>
        </TabGroup>
      </div>
    </Container>
  );
}
