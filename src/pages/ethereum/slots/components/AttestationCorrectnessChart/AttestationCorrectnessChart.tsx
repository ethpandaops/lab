import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Gauge } from '@/components/Charts/Gauge';
import type { GaugeItem } from '@/components/Charts/Gauge';
import type { AttestationCorrectnessChartProps } from './AttestationCorrectnessChart.types';

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
 * AttestationCorrectnessChart - Displays attestation correctness and participation metrics
 *
 * Shows participation rate and correctness metrics for attestations in a slot
 * using radial gauge charts:
 * - Overall participation (votes received vs expected)
 * - Head correctness (votes for correct head block)
 * - Source correctness (if available)
 * - Target correctness (if available)
 *
 * Uses color coding: Green (>90%), Amber (70-90%), Red (<70%)
 *
 * @example
 * ```tsx
 * <AttestationCorrectnessChart
 *   correctnessData={{
 *     votes_head: 450,
 *     votes_max: 512,
 *     votes_other: 12,
 *   }}
 * />
 * ```
 */
export function AttestationCorrectnessChart({ correctnessData }: AttestationCorrectnessChartProps): JSX.Element {
  // Calculate gauge data from correctness data
  const gaugeData = useMemo((): GaugeItem[] | null => {
    if (!correctnessData) return null;

    const { votes_head, votes_max, votes_other, votes_source, votes_target } = correctnessData;

    // Calculate total participation (head + other votes)
    const totalVotes = votes_head + votes_other;
    const participationPercentage = votes_max > 0 ? (totalVotes / votes_max) * 100 : 0;
    const headPercentage = votes_max > 0 ? (votes_head / votes_max) * 100 : 0;

    const gauges: GaugeItem[] = [
      {
        name: 'Participation',
        value: totalVotes,
        max: votes_max,
        color: getHealthColor(participationPercentage),
      },
      {
        name: 'Voted for this block',
        value: votes_head,
        max: votes_max,
        color: getHealthColor(headPercentage),
      },
    ];

    // Add source correctness if available
    if (votes_source !== undefined) {
      const sourcePercentage = votes_max > 0 ? (votes_source / votes_max) * 100 : 0;
      gauges.push({
        name: 'Source Correct',
        value: votes_source,
        max: votes_max,
        color: getHealthColor(sourcePercentage),
      });
    }

    // Add target correctness if available
    if (votes_target !== undefined) {
      const targetPercentage = votes_max > 0 ? (votes_target / votes_max) * 100 : 0;
      gauges.push({
        name: 'Target Correct',
        value: votes_target,
        max: votes_max,
        color: getHealthColor(targetPercentage),
      });
    }

    return gauges;
  }, [correctnessData]);

  // Handle no data state
  if (!correctnessData || !gaugeData) {
    return (
      <PopoutCard title="Attestation Correctness" modalSize="lg">
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex h-80 items-center justify-center text-muted'
                : 'flex h-64 items-center justify-center text-muted'
            }
          >
            <p>No attestation correctness data available</p>
          </div>
        )}
      </PopoutCard>
    );
  }

  const subtitle = `${correctnessData.votes_head + correctnessData.votes_other} / ${correctnessData.votes_max} validators`;

  return (
    <PopoutCard title="Attestation Correctness" subtitle={subtitle} modalSize="lg">
      {({ inModal }) => (
        <div className="space-y-4">
          {/* Gauge visualization */}
          <Gauge data={gaugeData} height={inModal ? 400 : 300} />

          {/* Additional info for votes on other blocks */}
          {correctnessData.votes_other > 0 && (
            <div className="rounded-sm border border-border bg-surface p-3">
              <p className="text-sm/6 text-muted">
                <span className="font-medium text-foreground">{correctnessData.votes_other.toLocaleString()}</span>{' '}
                attestations voted for other blocks
              </p>
            </div>
          )}
        </div>
      )}
    </PopoutCard>
  );
}
