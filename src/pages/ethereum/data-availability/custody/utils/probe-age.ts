import type { FctCustodyProbeBySlotAgeDaily } from '@/api/types.gen';

/** Slot age buckets within the 4096-epoch data column retention, oldest last. Probes past retention are left out. */
export const SLOT_AGE_BUCKETS = ['0-1d', '1-3d', '3-7d', '7-14d', '14-18d'] as const;
export type SlotAgeBucket = (typeof SLOT_AGE_BUCKETS)[number];

/** Display labels for the buckets */
export const SLOT_AGE_LABELS: Record<SlotAgeBucket, string> = {
  '0-1d': '0–1 d',
  '1-3d': '1–3 d',
  '3-7d': '3–7 d',
  '7-14d': '7–14 d',
  '14-18d': '14–18 d',
};

interface Counts {
  probes: number;
  successes: number;
}

export interface ProbeAgeSummary {
  /** UTC days with probes, ascending */
  days: string[];
  /** Per bucket, the share of column probes answered with the column on each day (%), null on days without probes */
  byDay: Record<SlotAgeBucket, (number | null)[]>;
  /** Per probed peer client, the share answered in each bucket over all days (%), busiest client first */
  byClient: { client: string; probes: number; availability: Record<SlotAgeBucket, number | null> }[];
}

function share(counts: Counts | undefined): number | null {
  return counts && counts.probes > 0 ? (counts.successes / counts.probes) * 100 : null;
}

function add(map: Map<string, Counts>, key: string, probes: number, successes: number): void {
  const counts = map.get(key) ?? { probes: 0, successes: 0 };
  counts.probes += probes;
  counts.successes += successes;
  map.set(key, counts);
}

/** Availability of probed columns by the age of the slot they tested, per day and per client */
export function summariseProbeAge(rows: FctCustodyProbeBySlotAgeDaily[]): ProbeAgeSummary {
  const buckets = new Set<string>(SLOT_AGE_BUCKETS);
  const byDayBucket = new Map<string, Counts>();
  const byClientBucket = new Map<string, Counts>();
  const clientProbes = new Map<string, number>();
  const days = new Set<string>();

  for (const row of rows) {
    const bucket = row.slot_age_bucket ?? '';
    const day = row.day_start_date;
    const client = row.client ?? 'unknown';
    const probes = Number(row.probe_count ?? 0);
    const successes = Number(row.success_count ?? 0);
    if (!buckets.has(bucket) || !day || probes === 0) continue;
    days.add(day);
    add(byDayBucket, `${day}|${bucket}`, probes, successes);
    add(byClientBucket, `${client}|${bucket}`, probes, successes);
    clientProbes.set(client, (clientProbes.get(client) ?? 0) + probes);
  }

  const sortedDays = [...days].sort();
  const byDay = Object.fromEntries(
    SLOT_AGE_BUCKETS.map(bucket => [bucket, sortedDays.map(day => share(byDayBucket.get(`${day}|${bucket}`)))])
  ) as Record<SlotAgeBucket, (number | null)[]>;
  const byClient = [...clientProbes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([client, probes]) => ({
      client,
      probes,
      availability: Object.fromEntries(
        SLOT_AGE_BUCKETS.map(bucket => [bucket, share(byClientBucket.get(`${client}|${bucket}`))])
      ) as Record<SlotAgeBucket, number | null>,
    }));

  return { days: sortedDays, byDay, byClient };
}
