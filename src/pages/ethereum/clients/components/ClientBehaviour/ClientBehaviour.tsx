import { type JSX, type ReactNode, useMemo } from 'react';
import clsx from 'clsx';
import { Stats } from '@/components/DataDisplay/Stats';
import type { Stat } from '@/components/DataDisplay/Stats/Stats.types';
import type {
  FctAttestationVoteCorrectnessByClientDaily,
  FctBlockProposalByClientDaily,
} from '../../api/client-models';
import type { ClientLayer } from '../../utils/client-share';
import { UNKNOWN_CLIENT } from '../../constants';
import { sinceSuffix } from '../../utils/client-versions';
import { ClientMetricCompare } from '../ClientMetricCompare';
import { ATTESTATION_METRICS, PROPOSAL_METRICS, ratio, type ClientMetric } from '../../utils/client-metrics';
import { useAttestationRows, useProposalRows } from '../../hooks/usePerformanceRows';

export interface ClientBehaviourProps {
  client: string;
  layer: ClientLayer;
  /** Window start (unix seconds); all history when omitted */
  from?: number;
  /** Window control for the card headers */
  windowControl?: ReactNode;
}

const percent = (value: number): string => `${value.toFixed(2)}%`;

/**
 * How blocks proposed with each client of a layer fared: MEV, blobs, gas, propagation, missed and orphaned slots.
 */
export function ProposerBehaviour({ client, layer, from, windowControl }: ClientBehaviourProps): JSX.Element {
  const { rows, dataStart, isLoading } = useProposalRows(layer, from);
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
  const { rows, dataStart, isLoading } = useAttestationRows(layer, from);
  const known = rows.filter(row => row.client && row.client !== UNKNOWN_CLIENT);

  return (
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
  );
}

/** A headline metric and how its difference from the network reads */
interface Headline<T> {
  metric: ClientMetric<T>;
  /** e.g. "+0.12 pts" */
  delta: (difference: number) => string;
  /** Differences smaller than this read as level */
  epsilon: number;
  /** Neither direction is better, e.g. MEV share */
  neutral?: boolean;
}

const sign = (value: number): string => (value >= 0 ? '+' : '−');
const pts = (d: number): string => `${sign(d)}${Math.abs(d).toFixed(2)} pts`;
const byId = <T,>(metrics: Array<ClientMetric<T>>, id: string): ClientMetric<T> => metrics.find(m => m.id === id)!;

const PROPOSAL_HEADLINES: Array<Headline<FctBlockProposalByClientDaily>> = [
  { metric: byId(PROPOSAL_METRICS, 'mev-share'), delta: pts, epsilon: 0.05, neutral: true },
  { metric: byId(PROPOSAL_METRICS, 'missed'), delta: pts, epsilon: 0.01 },
  { metric: byId(PROPOSAL_METRICS, 'orphaned'), delta: pts, epsilon: 0.01 },
  {
    metric: byId(PROPOSAL_METRICS, 'seen-p50'),
    delta: d => `${sign(d)}${Math.abs(Math.round(d)).toLocaleString()} ms`,
    epsilon: 1,
  },
];

const ATTESTATION_HEADLINES: Array<Headline<FctAttestationVoteCorrectnessByClientDaily>> = [
  { metric: byId(ATTESTATION_METRICS, 'attested'), delta: pts, epsilon: 0.01 },
  { metric: byId(ATTESTATION_METRICS, 'head'), delta: pts, epsilon: 0.01 },
  { metric: byId(ATTESTATION_METRICS, 'target'), delta: pts, epsilon: 0.01 },
  {
    metric: byId(ATTESTATION_METRICS, 'inclusion'),
    delta: d => `${sign(d)}${Math.abs(d).toFixed(3)} slots`,
    epsilon: 0.0005,
  },
];

/** A stat for a headline metric: the client's value, and its difference from the whole layer coloured by direction */
function headlineStat<T extends { client?: string }>(headline: Headline<T>, client: string, rows: T[]): Stat {
  const own = ratio(
    rows.filter(row => row.client === client),
    headline.metric
  );
  const network = ratio(rows, headline.metric);
  const difference = own !== null && network !== null ? own - network : null;
  const better =
    difference === null || headline.neutral || Math.abs(difference) < headline.epsilon
      ? null
      : headline.metric.lowerIsBetter
        ? difference < 0
        : difference > 0;
  return {
    id: headline.metric.id,
    name: headline.metric.label,
    value: own === null ? '-' : headline.metric.format(own),
    subtitle:
      difference === null ? undefined : Math.abs(difference) < headline.epsilon ? (
        'Level with network'
      ) : (
        <span className={clsx(better === true && 'text-success', better === false && 'text-danger')}>
          {headline.delta(difference)} vs network
        </span>
      ),
  };
}

/**
 * The client's own proposal and attestation numbers over the window, each against the whole layer, with how many
 * validators and duties the attestation figures cover.
 */
export function PerformanceHeadline({
  client,
  layer,
  from,
}: {
  client: string;
  layer: ClientLayer;
  from?: number;
}): JSX.Element {
  const proposals = useProposalRows(layer, from);
  const attestations = useAttestationRows(layer, from);
  const stats = useMemo(() => {
    const allDuties = attestations.rows.reduce((sum, row) => sum + (row.total_duties ?? 0), 0);
    const knownDuties = attestations.rows
      .filter(row => row.client && row.client !== UNKNOWN_CLIENT)
      .reduce((sum, row) => sum + (row.total_duties ?? 0), 0);
    const latestDay = attestations.rows.reduce(
      (day, row) => ((row.day_start_date ?? '') > day ? (row.day_start_date ?? '') : day),
      ''
    );
    const validators = attestations.rows
      .filter(row => row.client === client && row.day_start_date === latestDay)
      .reduce((sum, row) => sum + (row.validator_count ?? 0), 0);
    return [
      ...PROPOSAL_HEADLINES.map(headline => headlineStat(headline, client, proposals.rows)),
      ...ATTESTATION_HEADLINES.map(headline => headlineStat(headline, client, attestations.rows)),
      {
        id: 'validators',
        name: 'Validators',
        value: validators.toLocaleString(),
        subtitle: latestDay ? `On ${latestDay}` : undefined,
      },
      {
        id: 'coverage',
        name: 'Coverage',
        value: allDuties > 0 ? percent((knownDuties / allDuties) * 100) : '-',
        subtitle: 'Duties with a known client',
      },
    ];
  }, [proposals.rows, attestations.rows, client]);

  const dataStart = Math.max(proposals.dataStart ?? 0, attestations.dataStart ?? 0) || undefined;
  const since = sinceSuffix(dataStart, from).replace(', since ', '');

  return (
    <section className="flex flex-col gap-2">
      <Stats gridClassName="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" stats={stats} />
      <p className="text-xs/5 text-muted">
        {since && `Data starts ${since}. `}A validator counts under the client it last named in block graffiti within
        the year before, which is also who missed and orphaned proposals count against. Network values cover every
        validator of the layer.
      </p>
    </section>
  );
}
