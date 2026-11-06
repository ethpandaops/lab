import type { JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import type { NodeRange } from '../../constants';
import { useNodeHistory, type HistoryMetric } from '../../hooks/useNodeHistory';
import { behindStarts } from '../../utils/history';
import { PerNodeHistoryChart } from '../PerNodeHistoryChart';

const HISTORY_CHARTS: Array<{ metric: HistoryMetric; title: string; subtitle: string; anchorId: string }> = [
  { metric: 'block', title: 'Block arrival', subtitle: 'Median per node ID', anchorId: 'block-latency' },
  { metric: 'head', title: 'Head events', subtitle: 'Median per node ID', anchorId: 'head-latency' },
  { metric: 'attestation', title: 'Attestations', subtitle: 'Median per node ID', anchorId: 'attestation-latency' },
  {
    metric: 'dataColumn',
    title: 'Data columns',
    subtitle: 'Median per node ID of when the last custody column arrived',
    anchorId: 'data-column-latency',
  },
];

export interface ContributorHistoryProps {
  username: string;
  range: NodeRange;
  rangeLabel: string;
  /** The network's median block arrival by bucket start, to tell when a Xatu node was catching up */
  networkMedians: Map<number, number>;
}

/**
 * Block, head, attestation and data column arrival over the range, one line per node ID of one contributor.
 */
export function ContributorHistory({
  username,
  range,
  rangeLabel,
  networkMedians,
}: ContributorHistoryProps): JSX.Element {
  const histories = {
    block: useNodeHistory('block', range, { username }),
    head: useNodeHistory('head', range, { username }),
    attestation: useNodeHistory('attestation', range, { username }),
    dataColumn: useNodeHistory('dataColumn', range, { username }),
  };
  const behindOf = (nodeId: string): Set<number> =>
    behindStarts(
      (histories.block.data?.rows ?? []).filter(row => row.nodeId === nodeId),
      networkMedians
    );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {HISTORY_CHARTS.map(chart => {
        const history = histories[chart.metric as keyof typeof histories].data;
        return history ? (
          <PerNodeHistoryChart
            key={chart.metric}
            title={chart.title}
            subtitle={`${chart.subtitle}, ${rangeLabel.toLowerCase()}`}
            anchorId={chart.anchorId}
            history={history}
            behindOf={behindOf}
          />
        ) : (
          <LoadingContainer key={chart.metric} className="h-96 rounded-sm" />
        );
      })}
    </div>
  );
}
