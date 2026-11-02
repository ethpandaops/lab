import type { FctAttestationVoteCorrectnessByClientDaily, FctBlockProposalByClientDaily } from '../api/client-models';

/** A metric as a ratio of two sums over a client's rows, so it combines across days */
export interface ClientMetric<T> {
  id: string;
  label: string;
  /** Axis name, with its unit */
  axis: string;
  numerator: (row: T) => number;
  denominator: (row: T) => number;
  /** Multiplier applied to the ratio, e.g. 100 for a percentage */
  scale?: number;
  format: (value: number) => string;
  /** Whether a lower value is better, for the rank column */
  lowerIsBetter?: boolean;
}

/** Ratio of summed numerator to summed denominator, or null with nothing to divide by */
export function ratio<T>(rows: T[], metric: ClientMetric<T>): number | null {
  let numerator = 0;
  let denominator = 0;
  for (const row of rows) {
    numerator += metric.numerator(row);
    denominator += metric.denominator(row);
  }
  return denominator > 0 ? (numerator / denominator) * (metric.scale ?? 1) : null;
}

const percent = (value: number): string => `${value.toFixed(2)}%`;

/** Proposals a client was due: blocks it got in, plus orphaned blocks and missed slots attributed to it */
const duties = (row: FctBlockProposalByClientDaily): number =>
  (row.block_count ?? 0) + (row.orphaned_block_count ?? 0) + (row.missed_slot_count ?? 0);

export const PROPOSAL_METRICS: Array<ClientMetric<FctBlockProposalByClientDaily>> = [
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

export const ATTESTATION_METRICS: Array<ClientMetric<FctAttestationVoteCorrectnessByClientDaily>> = [
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
