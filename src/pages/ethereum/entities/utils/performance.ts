/**
 * Performance measures of an entity or the network, as sums that combine across days and entities, and how an
 * entity's rate compares with the network's.
 */

/** Attestation and proposal sums over some days, entities or both */
export interface PerformanceCounts {
  duties: number;
  attested: number;
  head: number;
  target: number;
  /** Inclusion distance summed over included attestations with one */
  inclusionSum: number;
  inclusionCount: number;
  blocks: number;
  mevBlocks: number;
  /** MEV value in ETH summed over MEV blocks with a value */
  mevValueSum: number;
  mevValueCount: number;
  orphaned: number;
  missedSlots: number;
}

export const EMPTY_COUNTS: PerformanceCounts = {
  duties: 0,
  attested: 0,
  head: 0,
  target: 0,
  inclusionSum: 0,
  inclusionCount: 0,
  blocks: 0,
  mevBlocks: 0,
  mevValueSum: 0,
  mevValueCount: 0,
  orphaned: 0,
  missedSlots: 0,
};

/** Element-wise sum */
export function addCounts(a: PerformanceCounts, b: PerformanceCounts): PerformanceCounts {
  const sum = { ...a };
  for (const key of Object.keys(sum) as Array<keyof PerformanceCounts>) sum[key] += b[key];
  return sum;
}

/** Attestation columns shared by the hourly, daily and rolling entity tables */
export interface AttestationColumns {
  total_duties?: number;
  attested_count?: number;
  head_correct_count?: number;
  target_correct_count?: number;
  avg_inclusion_distance?: number | null;
}

/** Proposal columns shared by the daily and rolling entity tables */
export interface ProposalColumns {
  block_count?: number;
  mev_block_count?: number;
  avg_mev_value_eth?: number | null;
  orphaned_block_count?: number;
  missed_slot_count?: number;
}

/** Counts of a row holding attestation columns, proposal columns or both */
export function toCounts(row: AttestationColumns & ProposalColumns): PerformanceCounts {
  const attested = row.attested_count ?? 0;
  const mevBlocks = row.mev_block_count ?? 0;
  const hasInclusion = row.avg_inclusion_distance !== null && row.avg_inclusion_distance !== undefined;
  const hasMevValue = row.avg_mev_value_eth !== null && row.avg_mev_value_eth !== undefined;
  return {
    duties: row.total_duties ?? 0,
    attested,
    head: row.head_correct_count ?? 0,
    target: row.target_correct_count ?? 0,
    inclusionSum: hasInclusion ? row.avg_inclusion_distance! * attested : 0,
    inclusionCount: hasInclusion ? attested : 0,
    blocks: row.block_count ?? 0,
    mevBlocks,
    mevValueSum: hasMevValue ? row.avg_mev_value_eth! * mevBlocks : 0,
    mevValueCount: hasMevValue ? mevBlocks : 0,
    orphaned: row.orphaned_block_count ?? 0,
    missedSlots: row.missed_slot_count ?? 0,
  };
}

/** Proposals due: blocks that made the chain, orphaned blocks and missed slots */
export const proposals = (c: PerformanceCounts): number => c.blocks + c.orphaned + c.missedSlots;

export type MetricId = 'attested' | 'head' | 'target' | 'inclusion' | 'missed' | 'orphaned' | 'mev' | 'mev-value';

export interface PerformanceMetric {
  id: MetricId;
  label: string;
  /** Axis name, with its unit */
  axis: string;
  /** What the sample counts, for sample sizes: "duties" or "proposals" */
  sample: 'duties' | 'proposals' | 'MEV blocks';
  numerator: (c: PerformanceCounts) => number;
  denominator: (c: PerformanceCounts) => number;
  /** A share, so its noise follows from the sample size */
  proportion: boolean;
  /** Multiplier applied to the ratio, e.g. 100 for a percentage */
  scale: number;
  format: (value: number) => string;
  /** Difference from the network, e.g. "+0.12 pts" */
  delta: (difference: number) => string;
  /** Differences smaller than this read as level */
  epsilon: number;
  lowerIsBetter?: boolean;
  /** Neither direction is better */
  neutral?: boolean;
}

const sign = (value: number): string => (value >= 0 ? '+' : '−');
const pts = (d: number): string => `${sign(d)}${Math.abs(d).toFixed(2)} pts`;
const percent = (value: number): string => `${value.toFixed(2)}%`;

export const METRICS: PerformanceMetric[] = [
  {
    id: 'attested',
    label: 'Attested',
    axis: 'Share of duties (%)',
    sample: 'duties',
    numerator: c => c.attested,
    denominator: c => c.duties,
    proportion: true,
    scale: 100,
    format: percent,
    delta: pts,
    epsilon: 0.01,
  },
  {
    id: 'head',
    label: 'Correct head',
    axis: 'Share of duties (%)',
    sample: 'duties',
    numerator: c => c.head,
    denominator: c => c.duties,
    proportion: true,
    scale: 100,
    format: percent,
    delta: pts,
    epsilon: 0.01,
  },
  {
    id: 'target',
    label: 'Correct target',
    axis: 'Share of duties (%)',
    sample: 'duties',
    numerator: c => c.target,
    denominator: c => c.duties,
    proportion: true,
    scale: 100,
    format: percent,
    delta: pts,
    epsilon: 0.01,
  },
  {
    id: 'inclusion',
    label: 'Inclusion distance',
    axis: 'Slots',
    sample: 'duties',
    numerator: c => c.inclusionSum,
    denominator: c => c.inclusionCount,
    proportion: false,
    scale: 1,
    format: value => `${value.toFixed(3)} slots`,
    delta: d => `${sign(d)}${Math.abs(d).toFixed(3)} slots`,
    epsilon: 0.0005,
    lowerIsBetter: true,
  },
  {
    id: 'missed',
    label: 'Missed slots',
    axis: 'Share of proposals (%)',
    sample: 'proposals',
    numerator: c => c.missedSlots,
    denominator: proposals,
    proportion: true,
    scale: 100,
    format: percent,
    delta: pts,
    epsilon: 0.01,
    lowerIsBetter: true,
  },
  {
    id: 'orphaned',
    label: 'Orphaned blocks',
    axis: 'Share of proposals (%)',
    sample: 'proposals',
    numerator: c => c.orphaned,
    denominator: proposals,
    proportion: true,
    scale: 100,
    format: percent,
    delta: pts,
    epsilon: 0.01,
    lowerIsBetter: true,
  },
  {
    id: 'mev',
    label: 'MEV blocks',
    axis: 'Share of blocks (%)',
    sample: 'proposals',
    numerator: c => c.mevBlocks,
    denominator: c => c.blocks,
    proportion: true,
    scale: 100,
    format: percent,
    delta: pts,
    epsilon: 0.05,
    neutral: true,
  },
  {
    id: 'mev-value',
    label: 'MEV value per block',
    axis: 'ETH',
    sample: 'MEV blocks',
    numerator: c => c.mevValueSum,
    denominator: c => c.mevValueCount,
    proportion: false,
    scale: 1,
    format: value => `${value.toFixed(4)} ETH`,
    delta: d => `${sign(d)}${Math.abs(d).toFixed(4)} ETH`,
    epsilon: 0.0001,
    neutral: true,
  },
];

export const metricById = (id: MetricId): PerformanceMetric => METRICS.find(m => m.id === id)!;

/** The metric's value for some counts, or null with nothing to divide by */
export function metricValue(metric: PerformanceMetric, counts: PerformanceCounts): number | null {
  const denominator = metric.denominator(counts);
  return denominator > 0 ? (metric.numerator(counts) / denominator) * metric.scale : null;
}

/**
 * How a value compares with the network:
 * - `better` / `worse`: apart from the network by more than the metric's epsilon and, for shares, by more than
 *   chance alone would put it (about two standard errors at the network's rate)
 * - `apart`: differs as above on a metric where neither direction is better
 * - `level`: no difference that clears both
 * - `thin`: a share whose sample holds fewer than five expected events at the network's rate either way, too few
 *   to compare at all
 */
export type Verdict = 'better' | 'worse' | 'apart' | 'level' | 'thin';

export interface Comparison {
  value: number | null;
  network: number | null;
  /** value - network, in the metric's scale */
  difference: number | null;
  verdict: Verdict;
  /** Sample the value rests on: duties, proposals or MEV blocks */
  sample: number;
}

/** Expected events below this, in either direction, are too few to compare a share */
const MIN_EXPECTED_EVENTS = 5;
/** Standard errors a share must sit from the network's to differ from it */
const Z = 1.96;

/** Compares an entity's counts with the network's on one metric */
export function compare(metric: PerformanceMetric, own: PerformanceCounts, network: PerformanceCounts): Comparison {
  const value = metricValue(metric, own);
  const networkValue = metricValue(metric, network);
  const sample = metric.denominator(own);
  if (value === null || networkValue === null) {
    return { value, network: networkValue, difference: null, verdict: 'thin', sample };
  }
  const difference = value - networkValue;
  if (metric.proportion) {
    const p = networkValue / metric.scale;
    if (sample * Math.min(p, 1 - p) < MIN_EXPECTED_EVENTS) {
      return { value, network: networkValue, difference, verdict: 'thin', sample };
    }
    const standardError = Math.sqrt((p * (1 - p)) / sample) * metric.scale;
    if (Math.abs(difference) < Z * standardError) {
      return { value, network: networkValue, difference, verdict: 'level', sample };
    }
  }
  if (Math.abs(difference) < metric.epsilon) {
    return { value, network: networkValue, difference, verdict: 'level', sample };
  }
  if (metric.neutral) return { value, network: networkValue, difference, verdict: 'apart', sample };
  const better = metric.lowerIsBetter ? difference < 0 : difference > 0;
  return { value, network: networkValue, difference, verdict: better ? 'better' : 'worse', sample };
}

/** Text colour for a verdict */
export function verdictClass(verdict: Verdict): string | undefined {
  if (verdict === 'better') return 'text-success';
  if (verdict === 'worse') return 'text-danger';
  return undefined;
}

/** Compact count, such as "1.2B" or "8,412" */
export function formatSample(n: number): string {
  if (n < 100_000) return Math.round(n).toLocaleString();
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/**
 * A period as text: "Nov 3 '26 10:00 to Nov 4 '26 10:00 UTC" for hours, "Oct 5 '26 to Nov 3 '26" for days (the last
 * day being the one before the exclusive end).
 */
export function formatPeriod(start: number, end: number): string {
  const day = (seconds: number): string => {
    const d = new Date(seconds * 1000);
    const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    return `${month} ${d.getUTCDate()} '${String(d.getUTCFullYear()).slice(-2)}`;
  };
  if (start % 86_400 !== 0 || end % 86_400 !== 0) {
    const time = (seconds: number): string => new Date(seconds * 1000).toISOString().slice(11, 16);
    return `${day(start)} ${time(start)} to ${day(end)} ${time(end)} UTC`;
  }
  return end - start === 86_400 ? day(start) : `${day(start)} to ${day(end - 86_400)}`;
}

/** A fraction as a percentage, such as "2.98%", with "<0.01%" for a sliver */
export function formatShare(fraction: number): string {
  if (fraction > 0 && fraction < 0.0001) return '<0.01%';
  return `${(fraction * 100).toFixed(2)}%`;
}
