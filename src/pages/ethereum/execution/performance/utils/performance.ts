import type {
  FctEngineNewPayloadByElClient,
  FctEngineNewPayloadByElClientHourly,
  FctEngineNewPayloadBySlot,
  IntBlockResourceGas,
  FctExecutionGasUsedHourly,
} from '@/api/types.gen';
import { getExecutionClientColor } from '@/utils';

/** Seconds per slot on mainnet-like networks */
export const SLOT_SECONDS = 12;

/** Blocks below this gas are dominated by fixed overhead and skew per-gas throughput */
const MIN_GAS_FOR_THROUGHPUT = 5_000_000;

/** Gas buckets (in Mgas) for the throughput-vs-block-size curve */
export const GAS_BUCKET_MGAS = 5;

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
  /** Total gas / total execution time across the block window */
  throughput: number;
  /** Same, using each block's P95 duration across nodes */
  tailThroughput: number;
  fitP50: LinearFit;
  fitP95: LinearFit;
  /** [p5, p25, p50, p75, p95] of per-block Mgas/s */
  distribution: [number, number, number, number, number];
  /** Median Mgas/s per gas bucket index */
  byGasBucket: Map<number, number>;
  /** % throughput change from bottom to top quintile of each resource's gas share */
  sensitivity: Map<ResourceKey, number>;
  /** Scatter points: [Mgas, median ms] */
  points: [number, number][];
}

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

export interface VersionRow {
  client: string;
  version: string;
  firstSeen: number;
  lastSeen: number;
  throughput: number;
  observations: number;
  /** Hourly Mgas/s over the hours this version ran */
  sparkline: (number | null)[];
  /** % change vs the client's previous version (by first seen), when there is one */
  delta?: number;
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
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function median(values: number[]): number {
  return quantile(
    [...values].sort((a, b) => a - b),
    0.5
  );
}

/** Ordinary least squares fit of y = intercept + slope·x */
export function linearFit(points: [number, number][]): LinearFit {
  const n = points.length;
  if (n < 2) return { intercept: 0, slope: 0, r2: 0 };
  let sx = 0;
  let sy = 0;
  for (const [x, y] of points) {
    sx += x;
    sy += y;
  }
  const mx = sx / n;
  const my = sy / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of points) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  const slope = sxx > 0 ? sxy / sxx : 0;
  const intercept = my - slope * mx;
  const r2 = sxx > 0 && syy > 0 ? (sxy * sxy) / (sxx * syy) : 0;
  return { intercept, slope, r2 };
}

/** Largest block (Mgas) that a client's fitted cost model executes within the budget */
export function gasCeiling(fit: LinearFit, budgetMs: number): number {
  if (fit.slope <= 0) return 0;
  return Math.max(0, (budgetMs - Math.max(0, fit.intercept)) / fit.slope);
}

function resourceShares(row: IntBlockResourceGas): Map<ResourceKey, number> {
  const total = RESOURCES.reduce((sum, r) => sum + (row[r.key] ?? 0), 0);
  return new Map(RESOURCES.map(r => [r.key, total > 0 ? (row[r.key] ?? 0) / total : 0]));
}

/**
 * Builds per-client throughput, cost models, distributions and workload sensitivity from
 * per-block client timings joined to per-block resource gas.
 */
export function buildClientPerformance(
  perClientBlocks: FctEngineNewPayloadByElClient[],
  blocks: FctEngineNewPayloadBySlot[],
  resourceGas: IntBlockResourceGas[]
): { clients: ClientPerformance[]; slowBlocks: SlowBlock[]; avgShares: Map<ResourceKey, number> } {
  const blockNumberBySlot = new Map(blocks.map(b => [b.slot ?? 0, b]));
  const sharesByBlock = new Map(resourceGas.map(r => [r.block_number ?? 0, resourceShares(r)]));

  // Resource share quintile cut points across all blocks
  const cutPoints = new Map<ResourceKey, [number, number]>();
  for (const r of RESOURCES) {
    const values = [...sharesByBlock.values()].map(s => s.get(r.key) ?? 0).sort((a, b) => a - b);
    cutPoints.set(r.key, [quantile(values, 0.2), quantile(values, 0.8)]);
  }
  const avgShares = new Map<ResourceKey, number>(
    RESOURCES.map(r => {
      const total = resourceGas.reduce((s, row) => s + (row[r.key] ?? 0), 0);
      const all = resourceGas.reduce((s, row) => s + RESOURCES.reduce((t, x) => t + (row[x.key] ?? 0), 0), 0);
      return [r.key, all > 0 ? total / all : 0];
    })
  );

  // Collapse multiple versions of one client in the same slot into one observation-weighted row
  const bySlotClient = new Map<
    string,
    { slot: number; client: string; gas: number; avg: number; p50: number; p95: number; obs: number }
  >();
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

  const rowsByClient = new Map<string, { slot: number; gas: number; avg: number; p50: number; p95: number }[]>();
  const rowsBySlot = new Map<number, { client: string; ms: number }[]>();
  for (const r of bySlotClient.values()) {
    if (!rowsByClient.has(r.client)) rowsByClient.set(r.client, []);
    rowsByClient.get(r.client)!.push(r);
    if (!rowsBySlot.has(r.slot)) rowsBySlot.set(r.slot, []);
    rowsBySlot.get(r.slot)!.push({ client: r.client, ms: r.p50 });
  }

  const clients: ClientPerformance[] = [...rowsByClient.entries()].map(([client, rows], index) => {
    const totalGas = rows.reduce((s, r) => s + r.gas, 0);
    const totalAvg = rows.reduce((s, r) => s + r.avg, 0);
    const totalP95 = rows.reduce((s, r) => s + r.p95, 0);
    const points = rows.map(r => [r.gas / 1e6, r.p50] as [number, number]);
    const tput = rows
      .filter(r => r.gas >= MIN_GAS_FOR_THROUGHPUT)
      .map(r => mgasPerSecond(r.gas, r.p50))
      .sort((a, b) => a - b);

    const buckets = new Map<number, number[]>();
    for (const r of rows) {
      const b = Math.floor(r.gas / 1e6 / GAS_BUCKET_MGAS);
      if (!buckets.has(b)) buckets.set(b, []);
      buckets.get(b)!.push(mgasPerSecond(r.gas, r.p50));
    }

    const sensitivity = new Map<ResourceKey, number>();
    for (const res of RESOURCES) {
      const [lo, hi] = cutPoints.get(res.key)!;
      const low: number[] = [];
      const high: number[] = [];
      for (const r of rows) {
        if (r.gas < 10_000_000) continue;
        const bn = blockNumberBySlot.get(r.slot)?.block_number;
        const shares = bn ? sharesByBlock.get(bn) : undefined;
        if (!shares) continue;
        const share = shares.get(res.key) ?? 0;
        if (share <= lo) low.push(mgasPerSecond(r.gas, r.p50));
        else if (share >= hi) high.push(mgasPerSecond(r.gas, r.p50));
      }
      if (low.length >= 20 && high.length >= 20) {
        sensitivity.set(res.key, (median(high) / median(low) - 1) * 100);
      }
    }

    return {
      client,
      color: getExecutionClientColor(client, index),
      blockCount: rows.length,
      throughput: mgasPerSecond(totalGas, totalAvg),
      tailThroughput: mgasPerSecond(totalGas, totalP95),
      fitP50: linearFit(points),
      fitP95: linearFit(rows.map(r => [r.gas / 1e6, r.p95])),
      distribution: [
        quantile(tput, 0.05),
        quantile(tput, 0.25),
        quantile(tput, 0.5),
        quantile(tput, 0.75),
        quantile(tput, 0.95),
      ],
      byGasBucket: new Map([...buckets.entries()].filter(([, v]) => v.length >= 5).map(([b, v]) => [b, median(v)])),
      sensitivity,
      points,
    };
  });
  clients.sort((a, b) => b.throughput - a.throughput);

  const slowBlocks: SlowBlock[] = [...rowsBySlot.entries()]
    .map(([slot, perClient]) => {
      const sorted = [...perClient].sort((a, b) => b.ms - a.ms);
      const block = blockNumberBySlot.get(slot);
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
        slowestClient: sorted[0].client,
        slowestMs: sorted[0].ms,
        fastestMs: sorted[sorted.length - 1].ms,
        perClient: sorted,
        topResource: top,
      };
    })
    .sort((a, b) => b.slowestMs - a.slowestMs)
    .slice(0, 8);

  return { clients, slowBlocks, avgShares };
}

/** Chain demand: gas actually used per wall-clock second over the range, in Mgas/s */
export function chainDemand(hourly: FctExecutionGasUsedHourly[]): number {
  const gas = hourly.reduce((s, h) => s + (h.total_gas_used ?? 0), 0);
  const blocks = hourly.reduce((s, h) => s + (h.block_count ?? 0), 0);
  return blocks > 0 ? gas / (blocks * SLOT_SECONDS) / 1e6 : 0;
}

/**
 * Hourly throughput per client: total gas over total execution time ('avg'), or gas over the
 * hour's P95 duration ('p95', the throughput the slow tail gets).
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

/** Throughput per client version, with the change against the client's previous version */
export function versionRows(hourly: FctEngineNewPayloadByElClientHourly[]): VersionRow[] {
  const agg = new Map<
    string,
    { client: string; version: string; gas: number; ms: number; obs: number; hours: Map<number, number> }
  >();
  for (const row of hourly) {
    const client = normalizeClient(row.meta_execution_implementation);
    const version = row.meta_execution_version ?? 'unknown';
    const t = row.hour_start_date_time ?? 0;
    const obs = row.observation_count ?? 0;
    const ms = row.avg_duration_ms ?? 0;
    if (!obs || !ms) continue;
    const key = `${client}|${version}`;
    const cur = agg.get(key) ?? { client, version, gas: 0, ms: 0, obs: 0, hours: new Map() };
    cur.gas += (row.avg_gas_used ?? 0) * obs;
    cur.ms += ms * obs;
    cur.obs += obs;
    cur.hours.set(t, mgasPerSecond(row.avg_gas_used ?? 0, ms));
    agg.set(key, cur);
  }

  const rows: VersionRow[] = [...agg.values()]
    .filter(v => v.obs >= 50)
    .map(v => {
      const seen = [...v.hours.keys()];
      return {
        client: v.client,
        version: v.version,
        firstSeen: Math.min(...seen),
        lastSeen: Math.max(...seen),
        throughput: mgasPerSecond(v.gas, v.ms),
        observations: v.obs,
        sparkline: [...v.hours.entries()].sort((a, b) => a[0] - b[0]).map(([, tput]) => tput),
      };
    });

  const byClient = new Map<string, VersionRow[]>();
  for (const r of rows) {
    if (!byClient.has(r.client)) byClient.set(r.client, []);
    byClient.get(r.client)!.push(r);
  }
  for (const list of byClient.values()) {
    list.sort((a, b) => a.firstSeen - b.firstSeen);
    for (let i = 1; i < list.length; i++) {
      list[i].delta = (list[i].throughput / list[i - 1].throughput - 1) * 100;
    }
  }
  return [...byClient.values()].flat();
}
