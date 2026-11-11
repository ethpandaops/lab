import type {
  FctEngineNewPayloadByElClient,
  FctEngineNewPayloadByElClientHourly,
  FctEngineNewPayloadBySlot,
  FctEngineNewPayloadGasBucketWindow,
  FctEngineNewPayloadResourceShareWindow,
  FctEngineNewPayloadThroughputHistogramWindow,
  IntBlockResourceGas,
  FctExecutionGasUsedHourly,
} from '@/api/types.gen';
import { getExecutionClientColor } from '@/utils';
import { completeBucketEnd } from '@/utils/time';

/** Seconds per slot on mainnet-like networks */
const SLOT_SECONDS = 12;

/** Blocks below this gas are dominated by fixed overhead and skew per-gas throughput */
const MIN_GAS_FOR_THROUGHPUT = 5_000_000;

/** Gas buckets (in Mgas) for the throughput-vs-block-size curve */
export const GAS_BUCKET_MGAS = 5;

/**
 * The range [start, end) in seconds, ending at the last full hour so hourly rows are complete. All (null seconds) runs
 * from the UTC day holding the first data to the last full day, since it reads daily rows.
 */
export function rangeBounds(
  seconds: number | null,
  firstDataTime: number,
  nowMs = Date.now()
): { start: number; end: number } {
  if (seconds === null) {
    return { start: Math.floor(firstDataTime / 86400) * 86400, end: completeBucketEnd('day', nowMs) };
  }
  const end = completeBucketEnd('hour', nowMs);
  return { start: end - seconds, end };
}

/**
 * The complete UTC days that contain [start, end), as [first day start, last day end). The day in progress is left
 * out, so a range inside it takes the last complete day.
 */
export function rangeDays(start: number, end: number, nowMs = Date.now()): { start: number; end: number } {
  const last = Math.min(Math.ceil(end / 86400) * 86400, completeBucketEnd('day', nowMs));
  return { start: Math.min(Math.floor(start / 86400) * 86400, last - 86400), end: last };
}

/** Resource gas dimensions, in display order */
export const RESOURCES = [
  { key: 'gas_compute', label: 'Compute' },
  { key: 'gas_address_access', label: 'State access' },
  { key: 'gas_state_growth', label: 'State growth' },
  { key: 'gas_history', label: 'History' },
  { key: 'gas_block_size', label: 'Block size' },
  { key: 'gas_bloom_topics', label: 'Logs' },
  { key: 'gas_memory', label: 'Memory' },
] as const;

export type ResourceKey = (typeof RESOURCES)[number]['key'];

export interface LinearFit {
  /** Fixed cost in ms, paid regardless of block size */
  intercept: number;
  /** Marginal cost in ms per Mgas */
  slope: number;
  r2: number;
}

export interface ClientPerformance {
  client: string;
  color: string;
  blockCount: number;
  /** Total gas / total execution time across the range */
  throughput: number;
  /** Same, using each block's P95 duration across Xatu nodes */
  tailThroughput: number;
  fitP50: LinearFit;
  fitP95: LinearFit;
  /** [p5, p25, p50, p75, p95] of per-block Mgas/s */
  distribution: [number, number, number, number, number];
  /** Total gas over total P50 time per gas bucket index, in Mgas/s */
  byGasBucket: Map<number, number>;
  /** % throughput change from blocks lightest to blocks heaviest in each resource's share of gas */
  sensitivity: Map<ResourceKey, number>;
  /** Mean [Mgas, P50 ms] of the blocks in each gas bucket */
  points: [number, number][];
}

/**
 * Counts and sums per client of the fct_engine_new_payload_*_window tables, which hold them over a range; short
 * ranges build the same rows from their blocks (rollupBlocks).
 */
type GasBucketRow = Pick<
  FctEngineNewPayloadGasBucketWindow,
  | 'client'
  | 'gas_bucket_mgas'
  | 'block_count'
  | 'gas_mgas_sum'
  | 'gas_mgas_sq_sum'
  | 'avg_ms_sum'
  | 'p50_ms_sum'
  | 'p50_ms_sq_sum'
  | 'p95_ms_sum'
  | 'p95_ms_sq_sum'
  | 'gas_p50_product_sum'
  | 'gas_p95_product_sum'
>;
export type ThroughputBucketRow = Pick<
  FctEngineNewPayloadThroughputHistogramWindow,
  'client' | 'bucket_index' | 'block_count'
>;
export type ShareBucketRow = Pick<
  FctEngineNewPayloadResourceShareWindow,
  'client' | 'resource' | 'share_bucket_pct' | 'block_count' | 'gas_mgas_sum' | 'p50_ms_sum'
>;

export interface PerformanceRollup {
  /** Blocks per 5 Mgas bucket */
  gasBuckets: GasBucketRow[];
  /** Blocks of at least 5 Mgas per throughput bucket k, covering 1.04^k to 1.04^(k+1) Mgas/s */
  throughput: ThroughputBucketRow[];
  /** Blocks of at least 10 Mgas per resource and 10-point bucket of that resource's share of the block's gas */
  shares: ShareBucketRow[];
}

/** Width of a throughput histogram bucket: bucket k covers THROUGHPUT_BUCKET_BASE^k to ^(k+1) Mgas/s */
const THROUGHPUT_BUCKET_BASE = 1.04;

/** Blocks below this gas are left out of resource sensitivity */
const MIN_GAS_FOR_SENSITIVITY_MGAS = 10;

/** Fewest blocks on each side of a sensitivity comparison */
const MIN_SENSITIVITY_BLOCKS = 20;

/** Fewest blocks for a gas bucket's throughput */
const MIN_BUCKET_BLOCKS = 5;

export interface SlowBlock {
  slot: number;
  blockNumber: number;
  gasUsed: number;
  txCount: number;
  blobCount: number;
  slowestClient: string;
  slowestMs: number;
  fastestMs: number;
  perClient: { client: string; ms: number }[];
  topResource?: { label: string; share: number };
}

/** Lowercase client names and fold go-ethereum into geth */
export function normalizeClient(name: string | undefined): string {
  const lower = (name ?? 'unknown').toLowerCase();
  return lower === 'go-ethereum' ? 'geth' : lower;
}

/** Gas used over a duration in ms, as Mgas/s */
export function mgasPerSecond(gas: number, ms: number): number {
  return ms > 0 ? gas / ms / 1000 : 0;
}

/** Linear interpolated quantile of an ascending array */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const loValue = sorted[lo] ?? 0;
  const hiValue = sorted[hi] ?? loValue;
  return loValue + (hiValue - loValue) * (pos - lo);
}

/**
 * Ordinary least squares fit of y = intercept + slope·x from n points' sums of x, x², y, y² and x·y
 */
export function fitFromSums(n: number, sx: number, sxx: number, sy: number, syy: number, sxy: number): LinearFit {
  if (n < 2) return { intercept: 0, slope: 0, r2: 0 };
  const varX = sxx - (sx * sx) / n;
  const varY = syy - (sy * sy) / n;
  const cov = sxy - (sx * sy) / n;
  const slope = varX > 0 ? cov / varX : 0;
  const intercept = (sy - slope * sx) / n;
  const r2 = varX > 0 && varY > 0 ? (cov * cov) / (varX * varY) : 0;
  return { intercept, slope, r2 };
}

/** Largest block (Mgas) that a client's fitted cost model executes within the budget */
export function gasCeiling(fit: LinearFit, budgetMs: number): number {
  if (fit.slope <= 0) return 0;
  return Math.max(0, (budgetMs - Math.max(0, fit.intercept)) / fit.slope);
}

/**
 * Value at quantile q of a histogram of 1.04^k-wide throughput buckets, interpolated inside its bucket
 */
export function histogramQuantile(buckets: ThroughputBucketRow[], q: number): number {
  const sorted = [...buckets]
    .filter(b => (b.block_count ?? 0) > 0)
    .sort((a, b) => (a.bucket_index ?? 0) - (b.bucket_index ?? 0));
  const total = sorted.reduce((sum, b) => sum + (b.block_count ?? 0), 0);
  if (total === 0) return 0;
  const target = q * total;
  let below = 0;
  for (const bucket of sorted) {
    const count = bucket.block_count ?? 0;
    if (below + count >= target) {
      const lower = THROUGHPUT_BUCKET_BASE ** (bucket.bucket_index ?? 0);
      return lower + (lower * (THROUGHPUT_BUCKET_BASE - 1) * (target - below)) / count;
    }
    below += count;
  }
  return THROUGHPUT_BUCKET_BASE ** ((sorted.at(-1)?.bucket_index ?? 0) + 1);
}

function resourceShares(row: IntBlockResourceGas): Map<ResourceKey, number> {
  const total = RESOURCES.reduce((sum, r) => sum + (row[r.key] ?? 0), 0);
  return new Map(RESOURCES.map(r => [r.key, total > 0 ? (row[r.key] ?? 0) / total : 0]));
}

interface BlockTiming {
  slot: number;
  client: string;
  gas: number;
  avg: number;
  p50: number;
  p95: number;
}

/** One timing per block and client, versions folded together weighted by observations */
function foldVersions(perClientBlocks: FctEngineNewPayloadByElClient[]): BlockTiming[] {
  const bySlotClient = new Map<string, BlockTiming & { obs: number }>();
  for (const row of perClientBlocks) {
    const gas = row.gas_used ?? 0;
    const p50 = row.median_duration_ms ?? 0;
    if (gas <= 0 || p50 <= 0) continue;
    const client = normalizeClient(row.meta_execution_implementation);
    const slot = row.slot ?? 0;
    const key = `${slot}|${client}`;
    const obs = row.observation_count ?? 1;
    const existing = bySlotClient.get(key);
    if (existing) {
      const total = existing.obs + obs;
      existing.avg = (existing.avg * existing.obs + (row.avg_duration_ms ?? p50) * obs) / total;
      existing.p50 = (existing.p50 * existing.obs + p50 * obs) / total;
      existing.p95 = (existing.p95 * existing.obs + (row.p95_duration_ms ?? p50) * obs) / total;
      existing.obs = total;
    } else {
      bySlotClient.set(key, {
        slot,
        client,
        gas,
        avg: row.avg_duration_ms ?? p50,
        p50,
        p95: row.p95_duration_ms ?? p50,
        obs,
      });
    }
  }
  return [...bySlotClient.values()];
}

/**
 * The window tables' rows built from a short range's blocks, with the same buckets and cut-offs
 */
export function rollupBlocks(
  perClientBlocks: FctEngineNewPayloadByElClient[],
  blocks: FctEngineNewPayloadBySlot[],
  resourceGas: IntBlockResourceGas[]
): PerformanceRollup {
  const blockBySlot = new Map(blocks.map(b => [b.slot ?? 0, b]));
  const sharesByBlock = new Map(resourceGas.map(r => [r.block_number ?? 0, resourceShares(r)]));
  const gasBuckets = new Map<string, Required<GasBucketRow>>();
  const throughput = new Map<string, Required<ThroughputBucketRow>>();
  const shares = new Map<string, Required<ShareBucketRow>>();

  for (const { slot, client, gas, avg, p50, p95 } of foldVersions(perClientBlocks)) {
    const mgas = gas / 1e6;
    const gasBucket = Math.floor(mgas / GAS_BUCKET_MGAS) * GAS_BUCKET_MGAS;
    const g = gasBuckets.get(`${client}|${gasBucket}`) ?? {
      client,
      gas_bucket_mgas: gasBucket,
      block_count: 0,
      gas_mgas_sum: 0,
      gas_mgas_sq_sum: 0,
      avg_ms_sum: 0,
      p50_ms_sum: 0,
      p50_ms_sq_sum: 0,
      p95_ms_sum: 0,
      p95_ms_sq_sum: 0,
      gas_p50_product_sum: 0,
      gas_p95_product_sum: 0,
    };
    g.block_count += 1;
    g.gas_mgas_sum += mgas;
    g.gas_mgas_sq_sum += mgas * mgas;
    g.avg_ms_sum += avg;
    g.p50_ms_sum += p50;
    g.p50_ms_sq_sum += p50 * p50;
    g.p95_ms_sum += p95;
    g.p95_ms_sq_sum += p95 * p95;
    g.gas_p50_product_sum += mgas * p50;
    g.gas_p95_product_sum += mgas * p95;
    gasBuckets.set(`${client}|${gasBucket}`, g);

    if (gas >= MIN_GAS_FOR_THROUGHPUT) {
      const index = Math.floor(Math.log(mgasPerSecond(gas, p50)) / Math.log(THROUGHPUT_BUCKET_BASE));
      const t = throughput.get(`${client}|${index}`) ?? { client, bucket_index: index, block_count: 0 };
      t.block_count += 1;
      throughput.set(`${client}|${index}`, t);
    }

    const blockNumber = blockBySlot.get(slot)?.block_number;
    const blockShares = blockNumber ? sharesByBlock.get(blockNumber) : undefined;
    if (mgas >= MIN_GAS_FOR_SENSITIVITY_MGAS && blockShares) {
      for (const r of RESOURCES) {
        const resource = r.key.replace(/^gas_/, '');
        const bucket = Math.min(Math.floor((blockShares.get(r.key) ?? 0) * 10), 9) * 10;
        const sh = shares.get(`${client}|${resource}|${bucket}`) ?? {
          client,
          resource,
          share_bucket_pct: bucket,
          block_count: 0,
          gas_mgas_sum: 0,
          p50_ms_sum: 0,
        };
        sh.block_count += 1;
        sh.gas_mgas_sum += mgas;
        sh.p50_ms_sum += p50;
        shares.set(`${client}|${resource}|${bucket}`, sh);
      }
    }
  }
  return { gasBuckets: [...gasBuckets.values()], throughput: [...throughput.values()], shares: [...shares.values()] };
}

/**
 * For each resource, the share buckets holding the lightest and heaviest fifth of blocks: every bucket up to the one
 * holding the 20th percentile, and every bucket from the one holding the 80th. When one bucket holds both, the buckets
 * either side of it. `low` and `high` are inclusive bucket bounds; a resource with nothing below is left out.
 */
export function sensitivityCuts(shares: ShareBucketRow[]): Map<ResourceKey, { low: number; high: number }> {
  const cuts = new Map<ResourceKey, { low: number; high: number }>();
  for (const r of RESOURCES) {
    const counts = new Map<number, number>();
    for (const row of shares) {
      if (`gas_${row.resource}` !== r.key) continue;
      const bucket = row.share_bucket_pct ?? 0;
      counts.set(bucket, (counts.get(bucket) ?? 0) + (row.block_count ?? 0));
    }
    const buckets = [...counts.keys()].sort((a, b) => a - b);
    const total = buckets.reduce((sum, b) => sum + counts.get(b)!, 0);
    if (total === 0) continue;
    let cum = 0;
    let low: number | undefined;
    let high: number | undefined;
    for (const b of buckets) {
      cum += counts.get(b)!;
      if (low === undefined && cum >= 0.2 * total) low = b;
      if (high === undefined && cum >= 0.8 * total) high = b;
    }
    if (low === undefined || high === undefined) continue;
    const cut = low < high ? { low, high } : { low: low - 10, high: high + 10 };
    if (cut.low >= 0) cuts.set(r.key, cut);
  }
  return cuts;
}

/**
 * Per-client throughput, cost models, distributions and workload sensitivity from a range's counts and sums
 */
export function clientPerformance({ gasBuckets, throughput, shares }: PerformanceRollup): ClientPerformance[] {
  const cuts = sensitivityCuts(shares);
  const clientNames = [...new Set(gasBuckets.map(row => row.client ?? ''))].filter(Boolean).sort();
  const clients = clientNames.map((client, index) => {
    const buckets = gasBuckets.filter(row => row.client === client && (row.block_count ?? 0) > 0);
    const sum = (key: keyof GasBucketRow): number => buckets.reduce((s, row) => s + Number(row[key] ?? 0), 0);
    const n = sum('block_count');
    const gas = sum('gas_mgas_sum');

    const sensitivity = new Map<ResourceKey, number>();
    for (const [key, { low, high }] of cuts) {
      const side = (keep: (bucket: number) => boolean): { blocks: number; mgasPerSecond: number } => {
        const rows = shares.filter(
          row => row.client === client && `gas_${row.resource}` === key && keep(row.share_bucket_pct ?? 0)
        );
        return {
          blocks: rows.reduce((s, row) => s + (row.block_count ?? 0), 0),
          mgasPerSecond: mgasPerSecond(
            rows.reduce((s, row) => s + (row.gas_mgas_sum ?? 0), 0) * 1e6,
            rows.reduce((s, row) => s + (row.p50_ms_sum ?? 0), 0)
          ),
        };
      };
      const lightest = side(bucket => bucket <= low);
      const heaviest = side(bucket => bucket >= high);
      if (
        lightest.blocks >= MIN_SENSITIVITY_BLOCKS &&
        heaviest.blocks >= MIN_SENSITIVITY_BLOCKS &&
        lightest.mgasPerSecond > 0
      ) {
        sensitivity.set(key, (heaviest.mgasPerSecond / lightest.mgasPerSecond - 1) * 100);
      }
    }

    const histogram = throughput.filter(row => row.client === client);
    return {
      client,
      color: getExecutionClientColor(client, index),
      blockCount: n,
      throughput: mgasPerSecond(gas * 1e6, sum('avg_ms_sum')),
      tailThroughput: mgasPerSecond(gas * 1e6, sum('p95_ms_sum')),
      fitP50: fitFromSums(
        n,
        gas,
        sum('gas_mgas_sq_sum'),
        sum('p50_ms_sum'),
        sum('p50_ms_sq_sum'),
        sum('gas_p50_product_sum')
      ),
      fitP95: fitFromSums(
        n,
        gas,
        sum('gas_mgas_sq_sum'),
        sum('p95_ms_sum'),
        sum('p95_ms_sq_sum'),
        sum('gas_p95_product_sum')
      ),
      distribution: [0.05, 0.25, 0.5, 0.75, 0.95].map(q =>
        histogramQuantile(histogram, q)
      ) as ClientPerformance['distribution'],
      byGasBucket: new Map(
        buckets
          .filter(row => (row.block_count ?? 0) >= MIN_BUCKET_BLOCKS)
          .map(row => [
            Math.round((row.gas_bucket_mgas ?? 0) / GAS_BUCKET_MGAS),
            mgasPerSecond((row.gas_mgas_sum ?? 0) * 1e6, row.p50_ms_sum ?? 0),
          ])
      ),
      sensitivity,
      points: buckets
        .map(
          row =>
            [(row.gas_mgas_sum ?? 0) / row.block_count!, (row.p50_ms_sum ?? 0) / row.block_count!] as [number, number]
        )
        .sort((a, b) => a[0] - b[0]),
    };
  });
  return clients.sort((a, b) => b.throughput - a.throughput);
}

/**
 * The slowest blocks among the given ones by their slowest client's P50 duration, with every client's timing
 */
export function slowestBlocks(
  perClientBlocks: FctEngineNewPayloadByElClient[],
  blocks: FctEngineNewPayloadBySlot[],
  resourceGas: IntBlockResourceGas[]
): SlowBlock[] {
  const blockBySlot = new Map(blocks.map(b => [b.slot ?? 0, b]));
  const sharesByBlock = new Map(resourceGas.map(r => [r.block_number ?? 0, resourceShares(r)]));
  const rowsBySlot = new Map<number, { client: string; ms: number }[]>();
  for (const r of foldVersions(perClientBlocks)) {
    if (!rowsBySlot.has(r.slot)) rowsBySlot.set(r.slot, []);
    rowsBySlot.get(r.slot)!.push({ client: r.client, ms: r.p50 });
  }

  return [...rowsBySlot.entries()]
    .map(([slot, perClient]) => {
      const sorted = [...perClient].sort((a, b) => b.ms - a.ms);
      const block = blockBySlot.get(slot);
      const shares = block?.block_number ? sharesByBlock.get(block.block_number) : undefined;
      const top = shares
        ? RESOURCES.map(r => ({ label: r.label, share: shares.get(r.key) ?? 0 })).sort((a, b) => b.share - a.share)[0]
        : undefined;
      return {
        slot,
        blockNumber: block?.block_number ?? 0,
        gasUsed: block?.gas_used ?? 0,
        txCount: block?.tx_count ?? 0,
        blobCount: block?.blob_count ?? 0,
        slowestClient: sorted[0]?.client ?? '',
        slowestMs: sorted[0]?.ms ?? 0,
        fastestMs: sorted.at(-1)?.ms ?? 0,
        perClient: sorted,
        topResource: top,
      };
    })
    .sort((a, b) => b.slowestMs - a.slowestMs)
    .slice(0, 8);
}

/** Chain demand: gas actually used per wall-clock second over the range, in Mgas/s */
export function chainDemand(rows: Pick<FctExecutionGasUsedHourly, 'total_gas_used' | 'block_count'>[]): number {
  const gas = rows.reduce((s, h) => s + (h.total_gas_used ?? 0), 0);
  const blocks = rows.reduce((s, h) => s + (h.block_count ?? 0), 0);
  return blocks > 0 ? gas / (blocks * SLOT_SECONDS) / 1e6 : 0;
}

/** Throughput per client over every hour and version: total gas over total execution time, fastest first */
export function clientThroughput(
  hourly: FctEngineNewPayloadByElClientHourly[]
): { client: string; throughput: number }[] {
  const agg = new Map<string, { gas: number; ms: number }>();
  for (const row of hourly) {
    const obs = row.observation_count ?? 0;
    const ms = row.avg_duration_ms ?? 0;
    if (!obs || !ms) continue;
    const client = normalizeClient(row.meta_execution_implementation);
    const cur = agg.get(client) ?? { gas: 0, ms: 0 };
    cur.gas += (row.avg_gas_used ?? 0) * obs;
    cur.ms += ms * obs;
    agg.set(client, cur);
  }
  return [...agg.entries()]
    .map(([client, v]) => ({ client, throughput: mgasPerSecond(v.gas, v.ms) }))
    .sort((a, b) => b.throughput - a.throughput);
}

/**
 * Throughput per client per hour (or per day for daily rows): total gas over total execution time ('avg'), or gas
 * over the hour's P95 duration ('p95', the throughput the slow tail gets).
 */
export function hourlyThroughputSeries(
  hourly: FctEngineNewPayloadByElClientHourly[],
  percentile: 'avg' | 'p95'
): { client: string; points: [number, number][] }[] {
  const agg = new Map<string, Map<number, { gas: number; ms: number }>>();
  for (const row of hourly) {
    const client = normalizeClient(row.meta_execution_implementation);
    const t = (row.hour_start_date_time ?? 0) * 1000;
    const obs = row.observation_count ?? 0;
    const ms = (percentile === 'avg' ? row.avg_duration_ms : row.p95_duration_ms) ?? 0;
    if (!obs || !ms) continue;
    if (!agg.has(client)) agg.set(client, new Map());
    const hours = agg.get(client)!;
    const cur = hours.get(t) ?? { gas: 0, ms: 0 };
    cur.gas += (row.avg_gas_used ?? 0) * obs;
    cur.ms += ms * obs;
    hours.set(t, cur);
  }
  return [...agg.entries()].map(([client, hours]) => ({
    client,
    points: [...hours.entries()].sort((a, b) => a[0] - b[0]).map(([t, v]) => [t, mgasPerSecond(v.gas, v.ms)]),
  }));
}

/** Per-slot throughput per client, bucketed (Σgas/Σms) into fixed windows for short ranges */
export function bucketedThroughputSeries(
  rows: FctEngineNewPayloadByElClient[],
  bucketSeconds: number,
  percentile: 'avg' | 'p95'
): { client: string; points: [number, number][] }[] {
  const agg = new Map<string, Map<number, { gas: number; ms: number }>>();
  for (const row of rows) {
    const client = normalizeClient(row.meta_execution_implementation);
    const t = Math.floor((row.slot_start_date_time ?? 0) / bucketSeconds) * bucketSeconds * 1000;
    const ms = (percentile === 'avg' ? row.avg_duration_ms : row.p95_duration_ms) ?? 0;
    if (!ms) continue;
    if (!agg.has(client)) agg.set(client, new Map());
    const m = agg.get(client)!;
    const cur = m.get(t) ?? { gas: 0, ms: 0 };
    cur.gas += row.gas_used ?? 0;
    cur.ms += ms;
    m.set(t, cur);
  }
  return [...agg.entries()].map(([client, m]) => ({
    client,
    points: [...m.entries()].sort((a, b) => a[0] - b[0]).map(([t, v]) => [t, mgasPerSecond(v.gas, v.ms)]),
  }));
}
