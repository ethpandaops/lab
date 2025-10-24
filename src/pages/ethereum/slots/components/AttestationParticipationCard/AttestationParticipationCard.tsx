import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Gauge } from '@/components/Charts/Gauge';
import type { GaugeItem } from '@/components/Charts/Gauge';
import type { AttestationParticipationCardProps } from './AttestationParticipationCard.types';

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
 * AttestationParticipationCard - Displays overall attestation participation for a slot
 *
 * Shows the participation rate using a radial gauge chart:
 * - Overall participation (votes received vs expected)
 *
 * Uses color coding: Green (>90%), Amber (70-90%), Red (<70%)
 *
 * @example
 * ```tsx
 * <AttestationParticipationCard
 *   correctnessData={{
 *     votes_head: 450,
 *     votes_max: 512,
 *     votes_other: 12,
 *   }}
 * />
 * ```
 */
export function AttestationParticipationCard({ correctnessData }: AttestationParticipationCardProps): JSX.Element {
  // Calculate gauge data from correctness data
  const gaugeData = useMemo((): GaugeItem[] | null => {
    if (!correctnessData) return null;

    const { votes_head, votes_max, votes_other } = correctnessData;

    // Calculate total participation (head + other votes)
    const totalVotes = votes_head + votes_other;
    const participationPercentage = votes_max > 0 ? (totalVotes / votes_max) * 100 : 0;

    const gauges: GaugeItem[] = [
      {
        name: 'Participation',
        value: totalVotes,
        max: votes_max,
        color: getHealthColor(participationPercentage),
      },
    ];

    return gauges;
  }, [correctnessData]);

  // Handle no data state
  if (!correctnessData || !gaugeData) {
    return (
      <PopoutCard title="Participation" anchorId="participation" modalSize="lg">
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex h-80 items-center justify-center text-muted'
                : 'flex h-64 items-center justify-center text-muted'
            }
          >
            <p>No participation data available</p>
          </div>
        )}
      </PopoutCard>
    );
  }

  const subtitle = `${correctnessData.votes_head + correctnessData.votes_other} / ${correctnessData.votes_max} validators`;

  return (
    <PopoutCard title="Participation" anchorId="participation" subtitle={subtitle} modalSize="lg">
      {({ inModal }) => <Gauge data={gaugeData} height={inModal ? 400 : 300} />}
    </PopoutCard>
  );
}
