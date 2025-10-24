import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Badge } from '@/components/Elements/Badge';
import type { AttestationCorrectnessChartProps, CorrectnessMetric } from './AttestationCorrectnessChart.types';

/**
 * Get badge color based on percentage thresholds
 *
 * @param percentage - The percentage value (0-100)
 * @returns Badge color based on health thresholds
 */
function getHealthColor(percentage: number): 'green' | 'yellow' | 'red' | 'gray' {
  if (percentage >= 90) return 'green';
  if (percentage >= 70) return 'yellow';
  if (percentage > 0) return 'red';
  return 'gray';
}

/**
 * Format percentage value for display
 *
 * @param value - Raw percentage value
 * @returns Formatted percentage string
 */
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * AttestationCorrectnessChart - Displays attestation correctness and participation metrics
 *
 * Shows participation rate and correctness metrics for attestations in a slot:
 * - Overall participation (votes received vs expected)
 * - Head correctness (votes for correct head block)
 * - Source correctness (if available)
 * - Target correctness (if available)
 *
 * Uses color coding: Green (>90%), Yellow (70-90%), Red (<70%)
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
  // Calculate metrics from data
  const metrics = useMemo((): CorrectnessMetric[] | null => {
    if (!correctnessData) return null;

    const { votes_head, votes_max, votes_other, votes_source, votes_target } = correctnessData;

    // Calculate total participation (head + other votes)
    const totalVotes = votes_head + votes_other;
    const participationPercentage = votes_max > 0 ? (totalVotes / votes_max) * 100 : 0;

    const metricsArray: CorrectnessMetric[] = [
      {
        label: 'Participation',
        votes: totalVotes,
        total: votes_max,
        percentage: participationPercentage,
        color: getHealthColor(participationPercentage),
      },
      {
        label: 'Head Correct',
        votes: votes_head,
        total: votes_max,
        percentage: votes_max > 0 ? (votes_head / votes_max) * 100 : 0,
        color: getHealthColor(votes_max > 0 ? (votes_head / votes_max) * 100 : 0),
      },
    ];

    // Add source correctness if available
    if (votes_source !== undefined) {
      const sourcePercentage = votes_max > 0 ? (votes_source / votes_max) * 100 : 0;
      metricsArray.push({
        label: 'Source Correct',
        votes: votes_source,
        total: votes_max,
        percentage: sourcePercentage,
        color: getHealthColor(sourcePercentage),
      });
    }

    // Add target correctness if available
    if (votes_target !== undefined) {
      const targetPercentage = votes_max > 0 ? (votes_target / votes_max) * 100 : 0;
      metricsArray.push({
        label: 'Target Correct',
        votes: votes_target,
        total: votes_max,
        percentage: targetPercentage,
        color: getHealthColor(targetPercentage),
      });
    }

    return metricsArray;
  }, [correctnessData]);

  // Handle no data state
  if (!correctnessData || !metrics) {
    return (
      <PopoutCard title="Attestation Correctness" modalSize="lg">
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex min-h-[400px] items-center justify-center text-muted'
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
        <div className={inModal ? 'min-h-[400px] space-y-4' : 'space-y-4'}>
          {/* Metrics grid */}
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {metrics.map(metric => (
              <div key={metric.label} className="flex flex-col gap-2 rounded-sm border border-border bg-surface p-4">
                {/* Label and badge */}
                <div className="flex items-center justify-between">
                  <dt className="text-sm font-medium text-muted">{metric.label}</dt>
                  <Badge color={metric.color} variant="flat" size="small">
                    {formatPercentage(metric.percentage)}
                  </Badge>
                </div>

                {/* Values */}
                <dd className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-foreground">{metric.votes.toLocaleString()}</span>
                  <span className="text-sm text-muted">/ {metric.total.toLocaleString()}</span>
                </dd>

                {/* Progress bar */}
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${metric.percentage}%`,
                      backgroundColor:
                        metric.color === 'green'
                          ? 'rgb(34 197 94)' // green-500
                          : metric.color === 'yellow'
                            ? 'rgb(234 179 8)' // yellow-500
                            : metric.color === 'red'
                              ? 'rgb(239 68 68)' // red-500
                              : 'rgb(156 163 175)', // gray-400
                    }}
                  />
                </div>
              </div>
            ))}
          </dl>

          {/* Additional info for votes on other blocks */}
          {correctnessData.votes_other > 0 && (
            <div className="rounded-sm border border-border bg-surface p-3">
              <p className="text-sm text-muted">
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
