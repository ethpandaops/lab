import type { FctOpcodeCostByElClientDaily, FctOpcodeCostByElClientVersion } from '@/api/types.gen';
import { normalizeClient, quantile } from './performance';

/** Opcode groups in the order the backend fits them */
export const OPCODE_GROUPS = [
  'SLOAD',
  'SSTORE',
  'CALL',
  'STATICCALL',
  'DELEGATECALL',
  'KECCAK256',
  'EXTCODESIZE',
  'EXTCODEHASH',
  'EXTCODECOPY',
  'BALANCE',
  'CREATE2',
  'CREATE',
  'SELFDESTRUCT',
  'MCOPY',
  'CALLDATACOPY',
  'CODECOPY',
  'RETURNDATACOPY',
  'EXP',
  'TLOAD',
  'TSTORE',
  'MULMOD',
  'ADDMOD',
  'MUL',
  'DIV',
  'SDIV',
  'MOD',
  'LOG',
  'ARITHMETIC',
  'CONTROL',
  'ENVIRONMENT',
  'MEMORY',
  'STACK',
] as const;

/** Display names for the grouped rows */
const GROUP_LABELS: Record<string, string> = {
  CALL: 'CALL, CALLCODE',
  LOG: 'LOG0–LOG4',
  ARITHMETIC: 'Arithmetic & bitwise',
  CONTROL: 'Control flow',
  ENVIRONMENT: 'Environment & other',
  MEMORY: 'Memory',
  STACK: 'Stack (PUSH/DUP/SWAP/POP)',
};

/** Opcodes whose gas mostly pays for state growth and history rather than execution time */
const STATE_PRICED = new Set(['SSTORE', 'CREATE', 'CREATE2', 'LOG', 'SELFDESTRUCT', 'CALL']);

/** Opcode (or opcode group) included in the cost model */
export interface OpcodeMeta {
  key: string;
  name: string;
  /** Share of all gas spent in the window */
  gasShare: number;
  /** Average gas charged per execution */
  gasPerOp: number;
  /** Whether the opcode's gas mostly pays for execution, or for state growth and history */
  pricedFor: 'execution' | 'state';
}

/** Fitted cost of one opcode for one client or client version */
export interface OpcodeCost {
  /** ns per gas for this opcode ÷ the client's average ns per gas */
  ratio: number;
  /** 5th percentile of ratio */
  lo: number;
  /** 95th percentile of ratio */
  hi: number;
  nsPerOp: number;
  /** 5th percentile of nsPerOp */
  nsLo: number;
  /** 95th percentile of nsPerOp */
  nsHi: number;
}

/** A release fitted over every hour it ran */
export interface OpcodeCostVersion {
  version: string;
  firstSeen: number;
  lastSeen: number;
  blocks: number;
  hours: number;
  /** Aligned with OpcodeCostModel.opcodes */
  ratios: OpcodeCost[];
}

/** One UTC day's fit */
export interface OpcodeCostDay {
  /** Unix seconds at 00:00 UTC */
  day: number;
  blocks: number;
  /** Aligned with OpcodeCostModel.opcodes */
  nsPerOp: number[];
  ratio: number[];
  /** Versions that ran that day, most blocks first */
  versions: string[];
}

export interface OpcodeCostClient {
  client: string;
  /** Median of the daily fits, with a day-resampled 5–95% interval */
  ratios: OpcodeCost[];
  daily: OpcodeCostDay[];
  versions: OpcodeCostVersion[];
}

export interface OpcodeCostModel {
  windowStart: number;
  windowEnd: number;
  days: number;
  opcodes: OpcodeMeta[];
  clients: OpcodeCostClient[];
}

/** Opcodes below this share of gas are too rare to estimate */
export const MIN_GAS_SHARE = 0.0005;

/** Smallest departure from 1× worth flagging */
const MIN_EFFECT = 0.1;

/** Day resamples for the client interval */
const BOOTSTRAP_SAMPLES = 400;

/** Releases need this many hours before their fit is worth showing */
export const MIN_VERSION_HOURS = 24;

/** True when the interval excludes 1× and the estimate is at least 10% off it */
export function isMispriced(cost: OpcodeCost): boolean {
  return (cost.lo > 1 || cost.hi < 1) && Math.abs(cost.ratio - 1) >= MIN_EFFECT;
}

/** Small seeded PRNG (mulberry32), so the interval doesn't change between renders */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function median(values: number[]): number {
  return quantile(
    [...values].sort((a, b) => a - b),
    0.5
  );
}

/**
 * Median of daily values with a 5–95% interval from resampling days with replacement.
 * Days are the resampling unit because block timings within a day are correlated.
 */
export function medianWithInterval(values: number[], seed = 1): { value: number; lo: number; hi: number } {
  if (values.length === 0) return { value: 0, lo: 0, hi: 0 };
  const value = median(values);
  if (values.length === 1) return { value, lo: value, hi: value };
  const rand = seededRandom(seed);
  const medians: number[] = [];
  for (let s = 0; s < BOOTSTRAP_SAMPLES; s++) {
    const draw = values.map(() => values[Math.floor(rand() * values.length)]);
    medians.push(median(draw));
  }
  medians.sort((a, b) => a - b);
  return { value, lo: quantile(medians, 0.05), hi: quantile(medians, 0.95) };
}

function dayStart(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) / 1000;
}

/**
 * Builds the per-client opcode cost model from the backend's daily and per-release fits.
 * Days with fewer than `minDayBlocks` observations (such as a partial current day) are dropped.
 */
export function buildOpcodeCostModel(
  dailyRows: FctOpcodeCostByElClientDaily[],
  versionRows: FctOpcodeCostByElClientVersion[],
  minDayBlocks = 3000
): OpcodeCostModel | null {
  const index = new Map<string, number>(OPCODE_GROUPS.map((g, i) => [g, i]));
  const n = OPCODE_GROUPS.length;

  // client -> day -> row per opcode
  const byClientDay = new Map<string, Map<number, FctOpcodeCostByElClientDaily[]>>();
  const gasShare = new Array(n).fill(0);
  const gasPerOp = new Array(n).fill(0);
  const weight = new Array(n).fill(0);
  for (const row of dailyRows) {
    const i = index.get(row.opcode_group ?? '');
    if (i === undefined || (row.block_count ?? 0) < minDayBlocks) continue;
    const client = normalizeClient(row.meta_execution_implementation);
    const day = dayStart(row.day_start_date ?? '');
    if (!byClientDay.has(client)) byClientDay.set(client, new Map());
    const days = byClientDay.get(client)!;
    if (!days.has(day)) days.set(day, new Array(n));
    days.get(day)![i] = row;
    const w = row.block_count ?? 0;
    gasShare[i] += (row.gas_share ?? 0) * w;
    gasPerOp[i] += (row.gas_per_op ?? 0) * w;
    weight[i] += w;
  }
  if (byClientDay.size === 0) return null;

  const opcodes: OpcodeMeta[] = OPCODE_GROUPS.map((key, i) => ({
    key,
    name: GROUP_LABELS[key] ?? key,
    gasShare: weight[i] ? gasShare[i] / weight[i] : 0,
    gasPerOp: weight[i] ? gasPerOp[i] / weight[i] : 0,
    pricedFor: STATE_PRICED.has(key) ? 'state' : 'execution',
  }));

  const versionsByClient = new Map<string, OpcodeCostVersion[]>();
  const versionMap = new Map<string, OpcodeCostVersion>();
  for (const row of versionRows) {
    const i = index.get(row.opcode_group ?? '');
    if (i === undefined) continue;
    const client = normalizeClient(row.meta_execution_implementation);
    const key = `${client}|${row.meta_execution_version}`;
    let v = versionMap.get(key);
    if (!v) {
      v = {
        version: row.meta_execution_version ?? 'unknown',
        firstSeen: row.first_seen_date_time ?? 0,
        lastSeen: row.last_seen_date_time ?? 0,
        blocks: row.block_count ?? 0,
        hours: row.hour_count ?? 0,
        ratios: new Array(n),
      };
      versionMap.set(key, v);
      if (!versionsByClient.has(client)) versionsByClient.set(client, []);
      versionsByClient.get(client)!.push(v);
    }
    v.ratios[i] = {
      ratio: row.price_ratio ?? 0,
      lo: row.price_ratio_lower ?? 0,
      hi: row.price_ratio_upper ?? 0,
      nsPerOp: row.ns_per_op ?? 0,
      nsLo: row.ns_per_op_lower ?? 0,
      nsHi: row.ns_per_op_upper ?? 0,
    };
  }

  let windowStart = Infinity;
  let windowEnd = -Infinity;
  const clients: OpcodeCostClient[] = [...byClientDay.entries()]
    .map(([client, days]) => {
      const daily: OpcodeCostDay[] = [...days.entries()]
        .filter(([, rows]) => OPCODE_GROUPS.every((_, i) => rows[i]))
        .sort((a, b) => a[0] - b[0])
        .map(([day, rows]) => ({
          day,
          blocks: rows[0].block_count ?? 0,
          nsPerOp: rows.map(r => r.ns_per_op ?? 0),
          ratio: rows.map(r => r.price_ratio ?? 0),
          versions: rows[0].meta_execution_versions ?? [],
        }));
      for (const d of daily) {
        windowStart = Math.min(windowStart, d.day);
        windowEnd = Math.max(windowEnd, d.day + 86400);
      }
      const ratios: OpcodeCost[] = OPCODE_GROUPS.map((_, i) => {
        const r = medianWithInterval(
          daily.map(d => d.ratio[i]),
          i + 1
        );
        const ns = medianWithInterval(
          daily.map(d => d.nsPerOp[i]),
          i + 1
        );
        return { ratio: r.value, lo: r.lo, hi: r.hi, nsPerOp: ns.value, nsLo: ns.lo, nsHi: ns.hi };
      });
      const versions = (versionsByClient.get(client) ?? [])
        .filter(v => v.ratios.every(Boolean))
        .sort((a, b) => a.firstSeen - b.firstSeen);
      return { client, ratios, daily, versions };
    })
    .filter(c => c.daily.length > 0)
    .sort((a, b) => a.client.localeCompare(b.client));

  if (clients.length === 0) return null;
  return {
    windowStart,
    windowEnd,
    days: Math.round((windowEnd - windowStart) / 86400),
    opcodes,
    clients,
  };
}

export interface RepricingCandidate {
  opcode: OpcodeMeta;
  client: string;
  cost: OpcodeCost;
}

/**
 * Execution-priced opcodes where the slowest client is clearly slower than the gas price implies,
 * ranked by that client's lower bound.
 */
export function repricingCandidates(model: OpcodeCostModel, limit: number): RepricingCandidate[] {
  return model.opcodes
    .map((opcode, i) => {
      if (opcode.pricedFor !== 'execution' || opcode.gasShare < MIN_GAS_SHARE) return null;
      const worst = model.clients
        .map(c => ({ client: c.client, cost: c.ratios[i] }))
        .sort((a, b) => b.cost.lo - a.cost.lo)[0];
      return worst && isMispriced(worst.cost) && worst.cost.ratio > 1 ? { opcode, ...worst } : null;
    })
    .filter((c): c is RepricingCandidate => c !== null)
    .sort((a, b) => b.cost.lo - a.cost.lo)
    .slice(0, limit);
}
