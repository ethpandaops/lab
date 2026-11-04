import type { JSX } from 'react';
import clsx from 'clsx';

import { Stats } from '@/components/DataDisplay/Stats';
import type { Stat } from '@/components/DataDisplay/Stats/Stats.types';

import {
  compare,
  formatSample,
  formatShare,
  metricById,
  metricValue,
  proposals,
  verdictClass,
  type MetricId,
  type PerformanceCounts,
} from '../../utils/performance';

export interface PerformanceStatsProps {
  /** Every validator's counts */
  network: PerformanceCounts;
  /** The entity's counts, each set against the network; the network's own values when omitted */
  own?: PerformanceCounts;
}

/** Attestation measures on the first row, proposal measures on the second */
const ROWS: Array<{ sample: 'duties' | 'proposals'; metrics: MetricId[] }> = [
  { sample: 'duties', metrics: ['attested', 'head', 'target', 'inclusion'] },
  { sample: 'proposals', metrics: ['missed', 'orphaned', 'mev', 'mev-value'] },
];

/** A metric's stat: its value, and against the network how far apart it is, coloured by direction */
function metricStat(id: MetricId, network: PerformanceCounts, own: PerformanceCounts | undefined): Stat {
  const metric = metricById(id);
  if (!own) {
    const value = metricValue(metric, network);
    return { id, name: metric.label, value: value === null ? '-' : metric.format(value) };
  }
  const { value, difference, verdict } = compare(metric, own, network);
  return {
    id,
    name: metric.label,
    value: value === null ? '-' : metric.format(value),
    valueClassName: verdict === 'thin' && value !== null ? 'text-muted' : undefined,
    subtitle:
      value === null ? undefined : verdict === 'thin' ? (
        `Too few ${metric.sample} to compare`
      ) : verdict === 'level' ? (
        'Level with network'
      ) : (
        <span className={clsx(verdictClass(verdict))}>{metric.delta(difference!)} vs network</span>
      ),
  };
}

/**
 * Attestation and proposal measures over a period, with the sample each rests on. Given an entity's counts, each
 * measure reads against the network's.
 */
export function PerformanceStats({ network, own }: PerformanceStatsProps): JSX.Element {
  const counts = own ?? network;
  const share = (part: number, whole: number): string | undefined =>
    own && whole > 0 ? `${formatShare(part / whole)} of the network` : undefined;

  const stats: Stat[] = ROWS.flatMap(({ sample, metrics }) => [
    sample === 'duties'
      ? {
          id: 'duties',
          name: 'Attestation duties',
          value: formatSample(counts.duties),
          subtitle: share(counts.duties, network.duties),
        }
      : {
          id: 'proposals',
          name: 'Proposals',
          value: formatSample(proposals(counts)),
          subtitle: share(proposals(counts), proposals(network)),
        },
    ...metrics.map(id => metricStat(id, network, own)),
  ]);

  return <Stats gridClassName="grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-5" stats={stats} />;
}
