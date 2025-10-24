import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Gauge } from '@/components/Charts/Gauge';
import type { GaugeItem } from '@/components/Charts/Gauge';
import type { AttestationHeadCorrectnessCardProps } from './AttestationHeadCorrectnessCard.types';

/**
 * Get color based on percentage thresholds
 *
 * @param percentage - The percentage value (0-100)
 * @returns Hex color based on health thresholds
 */
function getHealthColor(percentage: number): string {
  if (percentage >= 90) return '#22c55e'; // green-500
  if (percentage >= 70) return '#f59e0b'; // amber-500
  if (percentage > 0) return '#ef4444'; // red-500
  return '#888888'; // gray-500
}

/**
 * AttestationHeadCorrectnessCard - Displays head correctness for attestations
 *
 * Shows the head correctness rate using a radial gauge chart:
 * - Head correctness (votes for correct head block)
 *
 * Uses color coding: Green (>90%), Amber (70-90%), Red (<70%)
 *
 * @example
 * ```tsx
 * <AttestationHeadCorrectnessCard
 *   correctnessData={{
 *     votes_head: 450,
 *     votes_max: 512,
 *     votes_other: 12,
 *   }}
 * />
 * ```
 */
export function AttestationHeadCorrectnessCard({ correctnessData }: AttestationHeadCorrectnessCardProps): JSX.Element {
  // Calculate gauge data from correctness data
  const gaugeData = useMemo((): GaugeItem[] | null => {
    if (!correctnessData) return null;

    const { votes_head, votes_max } = correctnessData;

    const headPercentage = votes_max > 0 ? (votes_head / votes_max) * 100 : 0;

    const gauges: GaugeItem[] = [
      {
        name: 'Voted for this block',
        value: votes_head,
        max: votes_max,
        color: getHealthColor(headPercentage),
      },
    ];

    return gauges;
  }, [correctnessData]);

  // Handle no data state
  if (!correctnessData || !gaugeData) {
    return (
      <PopoutCard title="Block Votes" anchorId="block-votes" modalSize="lg">
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex h-80 items-center justify-center text-muted'
                : 'flex h-64 items-center justify-center text-muted'
            }
          >
            <p>No head correctness data available</p>
          </div>
        )}
      </PopoutCard>
    );
  }

  const subtitle = `${correctnessData.votes_head} / ${correctnessData.votes_max} validators`;

  return (
    <PopoutCard title="Block Votes" anchorId="block-votes" subtitle={subtitle} modalSize="lg">
      {({ inModal }) => <Gauge data={gaugeData} height={inModal ? 400 : 300} />}
    </PopoutCard>
  );
}
