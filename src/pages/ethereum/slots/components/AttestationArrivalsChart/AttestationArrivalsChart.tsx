import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { LineChart } from '@/components/Charts/Line';
import type { AttestationArrivalsChartProps } from './AttestationArrivalsChart.types';

/**
 * AttestationArrivalsChart - Visualizes attestation arrival rate over the slot window
 *
 * Shows when attestations were received throughout the 12-second slot, distributed
 * in 50ms chunks. Helps identify validator participation timing and network health.
 *
 * @example
 * ```tsx
 * <AttestationArrivalsChart
 *   attestationData={[
 *     { chunk_slot_start_diff: 0, attestation_count: 5 },
 *     { chunk_slot_start_diff: 50, attestation_count: 12 },
 *     ...
 *   ]}
 *   totalExpectedValidators={512}
 * />
 * ```
 */
export function AttestationArrivalsChart({
  attestationData,
  totalExpectedValidators,
}: AttestationArrivalsChartProps): JSX.Element {
  // Transform data into 241 time points (0ms, 50ms, 100ms, ... 12000ms)
  const { labels, values, totalReceived, maxCount } = useMemo(() => {
    // Create array of all possible time points (0-12000ms in 50ms increments = 241 points)
    const timePoints = Array.from({ length: 241 }, (_, i) => i * 50);

    // Create a map of chunk_slot_start_diff to attestation_count
    const dataMap = new Map<number, number>();
    attestationData.forEach(point => {
      dataMap.set(point.chunk_slot_start_diff, point.attestation_count);
    });

    // Build the values array with 0 for missing data points
    const chartValues = timePoints.map(time => dataMap.get(time) ?? 0);

    // Calculate total attestations received
    const total = chartValues.reduce((sum, count) => sum + count, 0);

    // Find max count for y-axis scaling
    const max = Math.max(...chartValues, 1);

    // Create labels for time axis (0.0s, 0.05s, ... 12.0s)
    const chartLabels = timePoints.map(time => `${(time / 1000).toFixed(1)}s`);

    return {
      labels: chartLabels,
      values: chartValues,
      totalReceived: total,
      maxCount: max,
    };
  }, [attestationData]);

  // Calculate label interval to show labels at 0s, 4s, 8s, 12s
  // 4s = 80 data points (4000ms / 50ms), so show every 80th label
  const labelInterval = 79; // Skip 79, show every 80th (indices: 0, 80, 160, 240)

  // Format participation message
  const participationMessage = useMemo(() => {
    if (!totalExpectedValidators) {
      return `${totalReceived.toLocaleString()} attestations received`;
    }
    const percentage = ((totalReceived / totalExpectedValidators) * 100).toFixed(1);
    return `${totalReceived.toLocaleString()} / ${totalExpectedValidators.toLocaleString()} attestations (${percentage}%)`;
  }, [totalReceived, totalExpectedValidators]);

  // Handle empty data
  if (attestationData.length === 0) {
    return (
      <PopoutCard title="Attestation Arrivals" anchorId="attestation-arrivals" modalSize="xl">
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex h-96 items-center justify-center text-muted'
                : 'flex h-64 items-center justify-center text-muted'
            }
          >
            <p>No attestation data available</p>
          </div>
        )}
      </PopoutCard>
    );
  }

  return (
    <PopoutCard
      title="Attestation Arrivals"
      anchorId="attestation-arrivals"
      subtitle={participationMessage}
      modalSize="xl"
    >
      {({ inModal }) => (
        <div className={inModal ? 'h-96' : 'h-64'}>
          <LineChart
            data={values}
            labels={labels}
            height="100%"
            smooth={false}
            showArea={true}
            yMax={maxCount}
            connectNulls={false}
            animationDuration={150}
            xAxisLabelInterval={labelInterval}
            xAxisTitle="Time from Slot Start (s)"
            yAxisTitle="Attestation Count"
          />
        </div>
      )}
    </PopoutCard>
  );
}
