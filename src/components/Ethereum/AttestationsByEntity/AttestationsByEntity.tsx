import type { JSX } from 'react';
import { useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { BarChart } from '@/components/Charts/Bar';
import type { AttestationsByEntityProps } from './AttestationsByEntity.types';

/**
 * AttestationsByEntity - Generic component for displaying entity-based attestation metrics
 *
 * Displays a bar chart showing counts by entity (e.g., staking providers). Can be used for
 * missed attestations, successful attestations, or any other entity-based metric.
 *
 * @example
 * ```tsx
 * // Missed attestations
 * <AttestationsByEntity
 *   data={[
 *     { entity: 'Lido', count: 45 },
 *     { entity: 'Coinbase', count: 23 },
 *   ]}
 *   title="Missed Attestations by Entity"
 *   subtitle="68 total missed"
 *   anchorId="missed-attestations"
 * />
 *
 * // Successful attestations
 * <AttestationsByEntity
 *   data={[
 *     { entity: 'Lido', count: 2500 },
 *     { entity: 'Coinbase', count: 1800 },
 *   ]}
 *   title="Top Attesters"
 *   subtitle="15,234 total attestations"
 *   anchorId="top-attesters"
 * />
 * ```
 */
export function AttestationsByEntity({
  data,
  title = 'Attestations by Entity',
  subtitle,
  anchorId = 'attestations-by-entity',
  orientation = 'horizontal',
  barWidth = '60%',
  emptyMessage = 'No data available',
}: AttestationsByEntityProps): JSX.Element {
  // Prepare data for the bar chart
  const { values, labels } = useMemo(() => {
    if (data.length === 0) {
      return { values: [], labels: [] };
    }

    return {
      values: data.map(item => item.count),
      labels: data.map(item => item.entity),
    };
  }, [data]);

  // Handle empty data
  if (data.length === 0) {
    return (
      <PopoutCard title={title} anchorId={anchorId} modalSize="xl">
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex h-96 items-center justify-center text-muted'
                : 'flex h-64 items-center justify-center text-muted'
            }
          >
            <p>{emptyMessage}</p>
          </div>
        )}
      </PopoutCard>
    );
  }

  return (
    <PopoutCard title={title} anchorId={anchorId} subtitle={subtitle} modalSize="xl">
      {({ inModal }) => (
        <div className={inModal ? 'h-96' : 'h-64'}>
          <BarChart
            data={values}
            labels={labels}
            height="100%"
            orientation={orientation}
            barWidth={barWidth}
            showLabel={true}
            labelPosition={orientation === 'horizontal' ? 'right' : 'top'}
            animationDuration={150}
            categoryLabelInterval={0}
          />
        </div>
      )}
    </PopoutCard>
  );
}
