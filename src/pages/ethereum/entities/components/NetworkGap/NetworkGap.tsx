import { useState, type JSX } from 'react';
import clsx from 'clsx';

import { Entity } from '@/components/Ethereum/Entity';
import { entityLabel } from '@/pages/ethereum/clients/utils/client-share';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { Card } from '@/components/Layout/Card';

import {
  compare,
  formatSample,
  metricById,
  METRICS,
  type MetricId,
  type PerformanceCounts,
} from '@/pages/ethereum/entities/utils/performance';

export interface NetworkGapProps {
  /** Named entities, largest stake first */
  entities: string[];
  counts: Map<string, PerformanceCounts>;
  network: PerformanceCounts;
  /** The period, e.g. "Oct 5 to Nov 4" */
  window: string;
}

/** Entities listed at once */
const ROWS = 12;

type Mode = 'largest' | 'worst' | 'best';

/** Bar colour for a verdict; differences inside chance stay neutral */
const BAR_CLASS = {
  better: 'bg-success-70',
  worse: 'bg-danger-70',
  apart: 'bg-primary-60',
  level: 'bg-muted-40',
  thin: 'bg-muted-40',
} as const;

/**
 * How far entities sit from the network on one measure, as bars diverging from the network's value: the largest
 * entities, or those furthest below or above it. Only gaps wider than chance rank, so small entities do not top
 * either list on noise.
 */
export function NetworkGap({ entities, counts, network, window }: NetworkGapProps): JSX.Element {
  const [metricId, setMetricId] = useState<MetricId>('attested');
  const [mode, setMode] = useState<Mode>('largest');
  const metric = metricById(metricId);
  const compared = entities
    .filter(entity => counts.has(entity))
    .map(entity => ({ entity, ...compare(metric, counts.get(entity)!, network) }));
  // How much better than the network, whichever direction that is
  const gain = (difference: number | null): number => (metric.lowerIsBetter ? -1 : 1) * (difference ?? 0);
  const rows =
    mode === 'largest'
      ? compared.slice(0, ROWS)
      : metric.neutral
        ? compared
            .filter(r => r.verdict === 'apart')
            .sort((a, b) => Math.abs(b.difference ?? 0) - Math.abs(a.difference ?? 0))
            .slice(0, ROWS)
        : compared
            .filter(r => r.verdict === (mode === 'worst' ? 'worse' : 'better'))
            .sort((a, b) =>
              mode === 'worst'
                ? gain(a.difference) - gain(b.difference)
                : gain(b.difference) - gain(a.difference) || b.sample - a.sample
            )
            .slice(0, ROWS);
  const present = rows.map(() => true);
  const modeOptions: Array<{ value: Mode; label: string }> = metric.neutral
    ? [
        { value: 'largest', label: 'Largest' },
        { value: 'worst', label: 'Most different' },
      ]
    : [
        { value: 'largest', label: 'Largest' },
        { value: 'worst', label: 'Worst' },
        { value: 'best', label: 'Best' },
      ];
  const shownMode = metric.neutral && mode === 'best' ? 'worst' : mode;
  const scale = Math.max(
    ...rows.filter(r => r.verdict !== 'thin').map(r => Math.abs(r.difference ?? 0)),
    metric.epsilon
  );
  const networkValue = rows[0]?.network;

  return (
    <Card
      title="Entities against the network"
      subtitle={`${
        shownMode === 'largest'
          ? `${ROWS} largest by stake`
          : metric.neutral
            ? 'Furthest from the network'
            : shownMode === 'worst'
              ? 'Furthest below the network'
              : 'Furthest above the network'
      }, finalized chain, ${window}`}
      footer={
        <p className="text-xs/5 text-muted">
          Each bar is the entity&apos;s {metric.label.toLowerCase()} minus the network&apos;s
          {networkValue !== null && networkValue !== undefined ? ` (${metric.format(networkValue)})` : ''}, weighted by{' '}
          {metric.sample === 'duties' ? 'attestation duty' : metric.sample === 'proposals' ? 'proposal' : 'MEV block'}.
          {!metric.neutral && ' Green and red gaps are wider than chance would give an entity of its size'}
          {!metric.neutral && shownMode !== 'largest' && ', and only those rank'}
          {!metric.neutral && '.'}
        </p>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SegmentedControl options={modeOptions} value={shownMode} onChange={setMode} ariaLabel="Entities shown" />
        <SelectMenu
          value={metricId}
          onChange={setMetricId}
          options={METRICS.map(m => ({ value: m.id, label: m.label }))}
          expandToFit
        />
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No entity differs from the network by more than chance on this measure.</p>
      ) : (
        <table className="w-full text-sm/6">
          <thead>
            <tr className="text-left text-xs/5 text-muted">
              <th className="pb-1 font-normal">Entity</th>
              <th className="hidden pb-1 font-normal sm:table-cell">
                <span className="sr-only">Difference</span>
              </th>
              <th className="pb-1 text-right font-normal">{metric.label}</th>
              <th className="pb-1 pl-3 text-right font-normal">vs network</th>
              <th className="hidden pb-1 pl-3 text-right font-normal md:table-cell">
                {metric.sample === 'duties' ? 'Duties' : metric.sample === 'proposals' ? 'Proposals' : 'MEV blocks'}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const width =
                row.difference === null || row.verdict === 'thin'
                  ? '0%'
                  : `${Math.min(1, Math.abs(row.difference) / scale) * 50}%`;
              const towardsBetter = (row.difference ?? 0) > 0 !== !!metric.lowerIsBetter;
              return (
                <tr key={row.entity}>
                  <td className="max-w-40 py-1 pr-3">
                    <Entity
                      entity={row.entity}
                      label={entityLabel(row.entity)}
                      className="block truncate text-foreground"
                    />
                  </td>
                  <td className="hidden w-40/100 py-1 sm:table-cell">
                    <span className="relative block h-2.5">
                      <span className="absolute -inset-y-0.75 left-1/2 w-px bg-border" />
                      <span
                        className={clsx(
                          'absolute inset-y-0 rounded-xs',
                          towardsBetter ? 'left-1/2' : 'right-1/2',
                          BAR_CLASS[row.verdict]
                        )}
                        style={{ width }}
                      />
                    </span>
                  </td>
                  <td
                    className={clsx(
                      'py-1 text-right font-medium tabular-nums',
                      row.verdict === 'thin' ? 'text-muted' : 'text-foreground'
                    )}
                  >
                    {!present[i] || row.value === null ? '-' : metric.format(row.value)}
                  </td>
                  <td
                    className={clsx(
                      'py-1 pl-3 text-right whitespace-nowrap tabular-nums',
                      row.verdict === 'better' && 'text-success',
                      row.verdict === 'worse' && 'text-danger',
                      (row.verdict === 'level' || row.verdict === 'thin' || row.verdict === 'apart') && 'text-muted'
                    )}
                  >
                    {!present[i] || row.difference === null
                      ? '-'
                      : row.verdict === 'thin'
                        ? 'Too few'
                        : metric.delta(row.difference)}
                  </td>
                  <td className="hidden py-1 pl-3 text-right text-muted tabular-nums md:table-cell">
                    {present[i] ? formatSample(row.sample) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}
