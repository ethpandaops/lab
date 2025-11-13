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
  attestationChartValues,
  totalExpected: _totalExpected,
  maxCount,
  className,
}: AttestationArrivalsProps): JSX.Element {
  // Prepare data for interval arrivals chart from pre-computed values
  // Convert from milliseconds (0-12000 in 50ms steps) to seconds (0-12 in 0.05s steps)
  const intervalChartData = useMemo(() => {
    // Create labels for 0-12s in 0.05s steps (241 points)
    const timePoints = Array.from({ length: 241 }, (_, i) => (i * 50) / 1000); // Convert ms to seconds
    // Format as "0s", "4s", "8s", "12s" without decimal places
    const labels = timePoints.map(time => {
      const seconds = Math.round(time);
      return `${seconds}s`;
    });

    // Calculate interval to show labels at 0s, 4s, 8s, 12s
    // 4s = 80 data points (4s / 0.05s), so show every 80th label
    const labelInterval = 79; // Skip 79, show every 80th (0, 80, 160, 240 = 0s, 4s, 8s, 12s)

    return { labels, values: attestationChartValues, labelInterval, timePoints };
  }, [attestationChartValues]);

  // Custom tooltip formatter to show precise time with 2 decimal places
  const tooltipFormatter = useMemo(
    () => (params: { dataIndex: number; value: number | null }[]) => {
      if (params.length === 0) return '';
      const param = params[0];
      const time = intervalChartData.timePoints[param.dataIndex];
      const count = param.value ?? 0;
      return `<strong>Time:</strong> ${time.toFixed(2)}s<br/><strong>Count:</strong> ${count}`;
    },
    [intervalChartData.timePoints]
  );

  return (
    <div className={clsx('flex h-full flex-col', className)}>
      {/* Attestation Arrivals Chart - takes full height */}
      <div className="flex h-full flex-col bg-surface p-3">
        <div className="mb-2 shrink-0">
          <h3 className="text-sm font-semibold text-foreground uppercase">Attestation Arrivals</h3>
        </div>
        <div className="min-h-0 flex-1">
          <LineChart
            data={intervalChartData.values}
            labels={intervalChartData.labels}
            xAxisTitle="Slot Time (s)"
            yAxisTitle="Count"
            height="100%"
            smooth={false}
            showArea={true}
            yMax={maxCount}
            connectNulls={false}
            animationDuration={0}
            xAxisLabelInterval={intervalChartData.labelInterval}
            showGridlines={false}
            showYAxisLine={true}
            tooltipFormatter={tooltipFormatter}
          />
        </div>
      </div>
    </div>
  );
}

// Custom comparison function to prevent re-renders when data hasn't changed
const arePropsEqual = (prevProps: AttestationArrivalsProps, nextProps: AttestationArrivalsProps): boolean => {
  return prevProps.attestationChartValues === nextProps.attestationChartValues;
};

export const AttestationArrivals = memo(AttestationArrivalsComponent, arePropsEqual);
