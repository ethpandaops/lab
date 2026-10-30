/**
 * PROTOTYPE DATA — not for merge.
 *
 * Builds the validators overview's daily series. Real inputs come from overview-fixture.json, which was
 * pulled offline from the Lab API (status counts) and a public beacon node (credentials, balances,
 * queues, entities). Everything without a source table yet (queues history, operations, flows,
 * rewards) is synthesised here with a seeded PRNG so screenshots are stable.
 */
import fixtureRaw from './overview-fixture.json?raw';

export type CredentialType = '0x00' | '0x01' | '0x02';
export const CREDENTIAL_TYPES: CredentialType[] = ['0x00', '0x01', '0x02'];

interface CredentialBucket {
  count: number;
  effectiveBalanceEth: number;
}

export interface OverviewFixture {
  generatedAt: string;
  notes?: string;
  snapshot: {
    epoch: number;
    byCredentialStatus: {
      credentialType: CredentialType;
      status: string;
      count: number;
      effectiveBalanceEth: number;
      balanceEth: number;
    }[];
    effectiveBalanceHistogram: { credentialType: CredentialType; effectiveBalanceEth: number; count: number }[];
    queues: {
      activationQueue: CredentialBucket;
      exitQueue: CredentialBucket & { maxExitEpoch: number };
      pendingDeposits: { count: number; amountEth: number; newValidatorCount: number; topUpCount: number } | null;
      pendingConsolidations: { count: number; switchToCompoundingCount: number } | null;
      pendingPartialWithdrawals: { count: number; amountEth: number } | null;
    };
    topEntities: {
      entity: string;
      count: number;
      effectiveBalanceEth: number;
      byCredential: Record<CredentialType, CredentialBucket>;
    }[];
  };
  weeklyStatus: { date: string; pending: number; active: number; exiting: number; exited: number; withdrawn: number }[];
  weeklyCredential: { date: string; byType: Record<CredentialType, CredentialBucket>; modelled: boolean }[];
}

export const fixture = JSON.parse(fixtureRaw) as OverviewFixture;

const DAY_MS = 86_400_000;
const CAPELLA = '2023-04-12';
const PECTRA = '2025-05-07';

/** Deterministic PRNG so mocked series are stable between renders and screenshots */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function dayMs(day: string): number {
  return Date.parse(`${day}T00:00:00Z`);
}

/** Linear interpolation of weekly points onto every day between the first and last point */
function interpolateDaily<T>(points: { date: string; value: T }[], lerp: (a: T, b: T, t: number) => T): Map<string, T> {
  const out = new Map<string, T>();
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const start = dayMs(a.date);
    const span = (dayMs(b.date) - start) / DAY_MS;
    for (let d = 0; d < span; d++) out.set(isoDay(start + d * DAY_MS), lerp(a.value, b.value, d / span));
  }
  const last = points[points.length - 1];
  out.set(last.date, last.value);
  return out;
}

const lerpNum = (a: number, b: number, t: number): number => a + (b - a) * t;

export interface StatusDay {
  pending: number;
  active: number;
  exiting: number;
  exited: number;
  withdrawn: number;
}

export interface OverviewDay {
  day: string;
  status: StatusDay;
  credential: Record<CredentialType, CredentialBucket>;
  /** ETH waiting to activate / exit (mocked history, last point real) */
  activationQueueEth: number;
  exitQueueEth: number;
  /** Daily operation counts (mocked) */
  ops: {
    deposits: number;
    topUps: number;
    consolidations: number;
    switchToCompounding: number;
    partialWithdrawalRequests: number;
    fullExitRequests: number;
    voluntaryExits: number;
  };
  /** ETH in and out of the validator set (mocked) */
  flows: { depositedEth: number; skimmedEth: number; fullWithdrawnEth: number };
  /** Consensus rewards paid to validators (mocked) */
  rewards: { attestationEth: number; syncEth: number; proposerEth: number; penaltiesEth: number };
}

/** Smooth bump centred on `centre` (ISO day) with half-width `width` days */
function bump(day: number, centre: string, width: number): number {
  const x = (day - dayMs(centre)) / DAY_MS / width;
  return Math.exp(-x * x);
}

/**
 * Daily overview series from genesis to the fixture's last day.
 */
export function buildOverviewDays(): OverviewDay[] {
  const status = interpolateDaily(
    fixture.weeklyStatus.map(w => ({ date: w.date, value: w as StatusDay })),
    (a, b, t) => ({
      pending: lerpNum(a.pending, b.pending, t),
      active: lerpNum(a.active, b.active, t),
      exiting: lerpNum(a.exiting, b.exiting, t),
      exited: lerpNum(a.exited, b.exited, t),
      withdrawn: lerpNum(a.withdrawn, b.withdrawn, t),
    })
  );
  const credential = interpolateDaily(
    fixture.weeklyCredential.map(w => ({ date: w.date, value: w.byType })),
    (a, b, t) =>
      Object.fromEntries(
        CREDENTIAL_TYPES.map(ct => [
          ct,
          {
            count: lerpNum(a[ct].count, b[ct].count, t),
            effectiveBalanceEth: lerpNum(a[ct].effectiveBalanceEth, b[ct].effectiveBalanceEth, t),
          },
        ])
      ) as Record<CredentialType, CredentialBucket>
  );

  const rand = mulberry32(7);
  const noise = (scale: number): number => 1 + (rand() - 0.5) * 2 * scale;
  const days = [...status.keys()].filter(d => credential.has(d)).sort();
  const lastDay = days[days.length - 1];
  const capella = dayMs(CAPELLA);
  const pectra = dayMs(PECTRA);
  const { queues } = fixture.snapshot;

  return days.map(day => {
    const t = dayMs(day);
    const s = status.get(day)!;
    const c = credential.get(day)!;
    const stake = CREDENTIAL_TYPES.reduce((sum, ct) => sum + c[ct].effectiveBalanceEth, 0);
    const postCapella = t >= capella;
    const postPectra = t >= pectra;
    const sincePectra = Math.max(0, (t - pectra) / DAY_MS);

    // Queues: entry surge mid-2023, exit spikes early 2024 and late 2025, converging on today's real values
    const isLast = day === lastDay;
    const activationQueueEth = isLast
      ? queues.activationQueue.effectiveBalanceEth + (queues.pendingDeposits?.amountEth ?? 0)
      : Math.max(
          0,
          (40_000 +
            2_900_000 * bump(t, '2023-06-20', 55) +
            1_100_000 * bump(t, '2024-02-20', 25) +
            1_300_000 * bump(t, '2025-08-20', 40) +
            600_000 * bump(t, '2026-08-01', 50)) *
            noise(0.08)
        );
    const exitQueueEth = isLast
      ? queues.exitQueue.effectiveBalanceEth
      : postCapella
        ? Math.max(
            0,
            (8_000 +
              1_250_000 * bump(t, '2023-05-01', 10) +
              480_000 * bump(t, '2024-01-12', 12) +
              2_400_000 * bump(t, '2025-09-15', 30) +
              900_000 * bump(t, '2026-03-01', 25)) *
              noise(0.1)
          )
        : 0;

    // Operations
    const consolidations = postPectra ? Math.round((60 + 520 * (1 - Math.exp(-sincePectra / 200))) * noise(0.35)) : 0;
    const switchToCompounding = postPectra ? Math.round((40 + 260 * bump(t, '2025-07-15', 60) + 90) * noise(0.4)) : 0;
    const ops = {
      deposits: Math.round(((postPectra ? 900 : 1_700) + 9_000 * bump(t, '2023-06-01', 70)) * noise(0.3)),
      topUps: postPectra ? Math.round((80 + sincePectra * 0.6) * noise(0.4)) : Math.round(6 * noise(0.5)),
      consolidations,
      switchToCompounding,
      partialWithdrawalRequests: postPectra ? Math.round((25 + sincePectra * 0.15) * noise(0.5)) : 0,
      fullExitRequests: postPectra ? Math.round((15 + 120 * bump(t, '2025-09-15', 30)) * noise(0.5)) : 0,
      voluntaryExits: postCapella
        ? Math.round((420 + 3_800 * bump(t, '2023-05-01', 10) + 1_200 * bump(t, '2025-09-15', 30)) * noise(0.35))
        : Math.round(4 * noise(0.8)),
    };

    const flows = {
      depositedEth: ops.deposits * 32 * noise(0.05) + ops.topUps * 24,
      skimmedEth: postCapella ? (c['0x01'].count * 0.0024 + c['0x02'].count * 0.0006) * noise(0.15) : 0,
      fullWithdrawnEth: postCapella ? ops.voluntaryExits * 32 * noise(0.1) + ops.fullExitRequests * 32 : 0,
    };

    // Rewards: consensus APR scales with 1/sqrt(stake), ~2.85% at 34M ETH
    const issuance = (stake * 0.0285 * Math.sqrt(34_000_000 / Math.max(stake, 500_000))) / 365;
    const rewards = {
      attestationEth: issuance * 0.84 * noise(0.03),
      syncEth: t >= dayMs('2021-10-27') ? issuance * 0.035 * noise(0.03) : 0,
      proposerEth: issuance * 0.125 * noise(0.06),
      penaltiesEth: issuance * 0.012 * noise(0.5) + 180 * bump(t, '2023-05-12', 1.2),
    };

    return { day, status: s, credential: c, activationQueueEth, exitQueueEth, ops, flows, rewards };
  });
}

/** "Jan 15 '24" — the date label format the core charts tick on */
export function formatDayLabel(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${month} ${d.getUTCDate()} '${String(d.getUTCFullYear()).slice(-2)}`;
}
