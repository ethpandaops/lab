import type { JSX } from 'react';
import { useMemo, memo } from 'react';
import clsx from 'clsx';
import { LineChart } from '@/components/Charts/Line';
import type { AttestationArrivalsProps } from './AttestationArrivals.types';

/**
 * AttestationArrivals - A page-specific component for showing attestation arrival data.
 *
 * Displays attestation arrivals over time with a line chart showing attestations
 * received at each time interval.
 *
 * Charts only render data up to the current slot time, simulating live progression.
 */
function AttestationArrivalsComponent({
  currentTime,
  data,
  totalExpected: _totalExpected,
  className,
}: AttestationArrivalsProps): JSX.Element {
  // Calculate max value for Y-axis (using all data, not just visible)
  const intervalMax = useMemo(() => {
    const counts = data.map(point => point.count);
    return counts.length > 0 ? Math.max(...counts) : 0;
  }, [data]);

  // Prepare data for interval arrivals chart - always show full 0-12s range
  const intervalChartData = useMemo(() => {
    // Create a complete time range from 0-12s in 50ms chunks (0, 50, 100, ..., 12000)
    const timePoints = Array.from({ length: 241 }, (_, i) => i * 50); // 12000ms / 50ms = 240 intervals + 1

    // Create a map of time to count for quick lookup
    const timeToCountMap = new Map(data.map(p => [p.time, p.count]));

    // Create labels (show in seconds)
    const labels = timePoints.map(time => `${(time / 1000).toFixed(1)}s`);

    // Map each time point to its count, or null if beyond current time or no data
    const values = timePoints.map(time => {
      if (time > currentTime) return null;
      return timeToCountMap.get(time) ?? 0; // Default to 0 if no attestations at this time
    });

    // Calculate interval to show labels at 0s, 4s, 8s, 12s
    // 4s = 80 data points (4000ms / 50ms), so show every 80th label
    const labelInterval = 79; // Skip 79, show every 80th (0, 80, 160, 240 = 0s, 4s, 8s, 12s)

    return { labels, values, labelInterval };
  }, [data, currentTime]);

  return (
    <div className={clsx('flex h-full flex-col', className)}>
      {/* Attestation Arrivals Chart - takes full height */}
      <div className="h-full rounded-sm border border-border bg-surface p-2">
        <LineChart
          data={intervalChartData.values}
          labels={intervalChartData.labels}
          title="Attestation Arrivals"
          height="100%"
          smooth={false}
          showArea={true}
          yMax={intervalMax}
          connectNulls={false}
          animationDuration={150}
          xAxisLabelInterval={intervalChartData.labelInterval}
        />
      </div>
    </div>
  );
}

export const AttestationArrivals = memo(AttestationArrivalsComponent);
