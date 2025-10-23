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
  currentTime: _currentTime,
  attestationChartValues,
  totalExpected: _totalExpected,
  maxCount,
  className,
}: AttestationArrivalsProps): JSX.Element {
  // Prepare data for interval arrivals chart from pre-computed values
  const intervalChartData = useMemo(() => {
    // Create labels for 0-12s in 50ms chunks
    const timePoints = Array.from({ length: 241 }, (_, i) => i * 50);
    const labels = timePoints.map(time => `${(time / 1000).toFixed(1)}s`);

    // Calculate interval to show labels at 0s, 4s, 8s, 12s
    // 4s = 80 data points (4000ms / 50ms), so show every 80th label
    const labelInterval = 79; // Skip 79, show every 80th (0, 80, 160, 240 = 0s, 4s, 8s, 12s)

    return { labels, values: attestationChartValues, labelInterval };
  }, [attestationChartValues]);

  return (
    <div className={clsx('flex h-full flex-col', className)}>
      {/* Attestation Arrivals Chart - takes full height */}
      <div className="h-full rounded-sm border border-border bg-surface p-2">
        <LineChart
          data={intervalChartData.values}
          labels={intervalChartData.labels}
          title="ATTESTATION ARRIVALS"
          titleFontSize={13}
          titleLeft={16}
          titleTop={12}
          height="100%"
          smooth={false}
          showArea={true}
          yMax={maxCount}
          connectNulls={false}
          animationDuration={150}
          xAxisLabelInterval={intervalChartData.labelInterval}
        />
      </div>
    </div>
  );
}

// Custom comparison function to prevent re-renders when data hasn't changed
const arePropsEqual = (prevProps: AttestationArrivalsProps, nextProps: AttestationArrivalsProps): boolean => {
  return prevProps.attestationChartValues === nextProps.attestationChartValues;
};

export const AttestationArrivals = memo(AttestationArrivalsComponent, arePropsEqual);
