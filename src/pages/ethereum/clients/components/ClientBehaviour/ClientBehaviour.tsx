import type { JSX, ReactNode } from 'react';
import { Stats } from '@/components/DataDisplay/Stats';
import {
  fctAttestationVoteCorrectnessByClientDailyList,
  fctBlockProposalByClientDailyList,
  type FctAttestationVoteCorrectnessByClientDaily,
  type FctBlockProposalByClientDaily,
} from '../../api/client-models';
import { useDailyByClient } from '../../hooks/useDailyByClient';
import type { ClientLayer } from '../../utils/client-share';
import { UNKNOWN_CLIENT } from '../../constants';
import { sinceSuffix } from '../../utils/client-versions';
import { ClientMetricCompare, type ClientMetric } from '../ClientMetricCompare';

export interface ClientBehaviourProps {
  client: string;
  layer: ClientLayer;
  /** Window start (unix seconds); all history when omitted */
  from?: number;
  /** Window control for the card headers */
  windowControl?: ReactNode;
}

const percent = (value: number): string => `${value.toFixed(2)}%`;

/** Proposals a client was due: blocks it got in, plus orphaned blocks and missed slots attributed to it */
const duties = (row: FctBlockProposalByClientDaily): number =>
  (row.block_count ?? 0) + (row.orphaned_block_count ?? 0) + (row.missed_slot_count ?? 0);

const PROPOSAL_METRICS: Array<ClientMetric<FctBlockProposalByClientDaily>> = [
  {
    id: 'mev-share',
    label: 'MEV blocks',
    axis: 'Share of blocks (%)',
    numerator: row => row.mev_block_count ?? 0,
    denominator: row => row.block_count ?? 0,
    scale: 100,
    format: percent,
  },
  {
    id: 'mev-value',
    label: 'MEV value per block',
    axis: 'ETH',
    numerator: row => (row.avg_mev_value_eth ?? 0) * (row.mev_block_count ?? 0),
    denominator: row => (row.avg_mev_value_eth == null ? 0 : (row.mev_block_count ?? 0)),
    format: value => `${value.toFixed(4)} ETH`,
  },
  {
    id: 'blobs',
    label: 'Blobs per block',
    axis: 'Blobs',
    numerator: row => row.blob_count ?? 0,
    denominator: row => row.block_count ?? 0,
    format: value => value.toFixed(2),
  },
  {
    id: 'gas',
    label: 'Gas per block',
    axis: 'Mgas',
    numerator: row => ((row.avg_gas_used ?? 0) * (row.block_count ?? 0)) / 1e6,
    denominator: row => (row.avg_gas_used == null ? 0 : (row.block_count ?? 0)),
    format: value => `${value.toFixed(1)} Mgas`,
  },
  {
    id: 'seen-p50',
    label: 'First seen, p50',
    axis: 'ms',
    numerator: row => (row.block_first_seen_p50_ms ?? 0) * (row.block_count ?? 0),
    denominator: row => (row.block_first_seen_p50_ms == null ? 0 : (row.block_count ?? 0)),
    format: value => `${Math.round(value).toLocaleString()} ms`,
    lowerIsBetter: true,
  },
  {
    id: 'seen-p90',
    label: 'First seen, p90',
    axis: 'ms',
    numerator: row => (row.block_first_seen_p90_ms ?? 0) * (row.block_count ?? 0),
    denominator: row => (row.block_first_seen_p90_ms == null ? 0 : (row.block_count ?? 0)),
    format: value => `${Math.round(value).toLocaleString()} ms`,
    lowerIsBetter: true,
  },
  {
    id: 'missed',
    label: 'Missed slots',
    axis: 'Share of proposals (%)',
    numerator: row => row.missed_slot_count ?? 0,
    denominator: duties,
    scale: 100,
    format: percent,
    lowerIsBetter: true,
  },
  {
    id: 'orphaned',
    label: 'Orphaned blocks',
    axis: 'Share of proposals (%)',
    numerator: row => row.orphaned_block_count ?? 0,
    denominator: duties,
    scale: 100,
    format: percent,
    lowerIsBetter: true,
  },
];

const ATTESTATION_METRICS: Array<ClientMetric<FctAttestationVoteCorrectnessByClientDaily>> = [
  {
    id: 'attested',
    label: 'Attested',
    axis: 'Share of duties (%)',
    numerator: row => row.attested_count ?? 0,
    denominator: row => row.total_duties ?? 0,
    scale: 100,
    format: percent,
  },
  {
    id: 'head',
    label: 'Correct head',
    axis: 'Share of duties (%)',
    numerator: row => row.head_correct_count ?? 0,
    denominator: row => row.total_duties ?? 0,
    scale: 100,
    format: percent,
  },
  {
    id: 'target',
    label: 'Correct target',
    axis: 'Share of duties (%)',
    numerator: row => row.target_correct_count ?? 0,
    denominator: row => row.total_duties ?? 0,
    scale: 100,
    format: percent,
  },
  {
    id: 'source',
    label: 'Correct source',
    axis: 'Share of duties (%)',
    numerator: row => row.source_correct_count ?? 0,
    denominator: row => row.total_duties ?? 0,
    scale: 100,
    format: percent,
  },
  {
    id: 'inclusion',
    label: 'Inclusion distance',
    axis: 'Slots',
    numerator: row => (row.avg_inclusion_distance ?? 0) * (row.attested_count ?? 0),
    denominator: row => (row.avg_inclusion_distance == null ? 0 : (row.attested_count ?? 0)),
    format: value => `${value.toFixed(3)} slots`,
    lowerIsBetter: true,
  },
];

/**
 * How blocks proposed with each client of a layer fared: MEV, blobs, gas, propagation, missed and orphaned slots.
 */
export function ProposerBehaviour({ client, layer, from, windowControl }: ClientBehaviourProps): JSX.Element {
  const { rows, dataStart, isLoading } = useDailyByClient<FctBlockProposalByClientDaily>(
    fctBlockProposalByClientDailyList,
    'fct_block_proposal_by_client_daily',
    { layer_eq: layer },
    from
  );
  return (
    <ClientMetricCompare
      client={client}
      title="Proposer behaviour"
      subtitle={`Blocks proposed with each ${layer} client${sinceSuffix(dataStart, from)}`}
      rows={rows}
      metrics={PROPOSAL_METRICS}
      countLabel="Blocks"
      count={row => row.block_count ?? 0}
      isLoading={isLoading}
      actions={windowControl}
      footer="Missed slots and orphaned blocks count against the client the proposer last named in its graffiti, within the year before."
    />
  );
}

/**
 * Attestation duties of validators running each client of a layer: participation, vote correctness and inclusion.
 */
export function AttestationPerformance({ client, layer, from, windowControl }: ClientBehaviourProps): JSX.Element {
  const { rows, dataStart, isLoading } = useDailyByClient<FctAttestationVoteCorrectnessByClientDaily>(
    fctAttestationVoteCorrectnessByClientDailyList,
    'fct_attestation_vote_correctness_by_client_daily',
    { layer_eq: layer },
    from
  );
  const allDuties = rows.reduce((sum, row) => sum + (row.total_duties ?? 0), 0);
  const known = rows.filter(row => row.client && row.client !== UNKNOWN_CLIENT);
  const knownDuties = known.reduce((sum, row) => sum + (row.total_duties ?? 0), 0);
  const latestDay = known.reduce(
    (day, row) => ((row.day_start_date ?? '') > day ? (row.day_start_date ?? '') : day),
    ''
  );
  const validators = known
    .filter(row => row.client === client && row.day_start_date === latestDay)
    .reduce((sum, row) => sum + (row.validator_count ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <Stats
        gridClassName="grid grid-cols-2 gap-4"
        stats={[
          {
            id: 'coverage',
            name: 'Duties from validators with a known client',
            value: allDuties > 0 ? percent((knownDuties / allDuties) * 100) : '-',
          },
          {
            id: 'validators',
            name: `Validators on this client, ${latestDay || 'latest day'}`,
            value: validators.toLocaleString(),
          },
        ]}
      />
      <ClientMetricCompare
        client={client}
        title="Attestation performance"
        subtitle={`Duties of validators running each ${layer} client${sinceSuffix(dataStart, from)}`}
        rows={known}
        metrics={ATTESTATION_METRICS}
        countLabel="Duties"
        count={row => row.total_duties ?? 0}
        isLoading={isLoading}
        actions={windowControl}
        footer="A validator's client is the one it last named in block graffiti, within the year before. Validators that never did are left out."
      />
    </div>
  );
}
