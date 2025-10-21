import type { JSX } from 'react';
import { useMemo } from 'react';
import clsx from 'clsx';
import { ProgressBar } from '@/components/Navigation/ProgressBar';
import { LineChart } from '@/components/Charts/Line';
import type { AttestationArrivalsProps } from './AttestationArrivals.types';

/**
 * AttestationArrivals - A page-specific component for showing attestation arrival data.
 *
 * Displays a progress bar showing current attestation percentage and two line charts:
 * 1. Interval arrivals - showing attestations received at each time interval
 * 2. Cumulative distribution - showing total attestations received up to each time point
 *
 * Charts only render data up to the current slot time, simulating live progression.
 */
export function AttestationArrivals({
  currentTime,
  data,
  totalExpected,
  className,
}: AttestationArrivalsProps): JSX.Element {
  // Filter data to only show attestations up to current time
  const visibleData = useMemo(() => {
    return data.filter(point => point.time <= currentTime);
  }, [data, currentTime]);

  // Calculate current attestation count and percentage
  const { currentCount, currentPercentage } = useMemo(() => {
    const count = visibleData.reduce((sum, point) => sum + point.count, 0);
    const percentage = totalExpected > 0 ? (count / totalExpected) * 100 : 0;
    return { currentCount: count, currentPercentage: percentage };
  }, [visibleData, totalExpected]);

  // Calculate max values for Y-axis (using all data, not just visible)
  const { intervalMax, cumulativeMax } = useMemo(() => {
    const counts = data.map(point => point.count);
    const intervalMaxValue = counts.length > 0 ? Math.max(...counts) : 0;
    // Cumulative max is always 100%
    return { intervalMax: intervalMaxValue, cumulativeMax: 100 };
  }, [data]);

  // Prepare data for interval arrivals chart - always show full 0-12s range
  const intervalChartData = useMemo(() => {
    // Create labels for full time range
    const labels = data.map(point => `${point.time.toFixed(1)}s`);
    // Only show values up to current time, rest are null
    const values = data.map(point => (point.time <= currentTime ? point.count : null));
    return { labels, values };
  }, [data, currentTime]);

  // Prepare data for cumulative distribution chart - always show full 0-12s range
  const cumulativeChartData = useMemo(() => {
    const labels: string[] = [];
    const values: (number | null)[] = [];
    let cumulative = 0;

    data.forEach(point => {
      labels.push(`${point.time.toFixed(1)}s`);
      if (point.time <= currentTime) {
        cumulative += point.count;
        const percentage = totalExpected > 0 ? (cumulative / totalExpected) * 100 : 0;
        values.push(Number(percentage.toFixed(2)));
      } else {
        values.push(null);
      }
    });

    return { labels, values };
  }, [data, currentTime, totalExpected]);

  return (
    <div className={clsx('flex flex-col gap-6', className)}>
      {/* Header with inline progress bar */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground">Attestations</h2>
        <div className="w-80">
          <ProgressBar
            progress={currentPercentage}
            statusMessage={`${currentCount} / ${totalExpected} (${currentPercentage.toFixed(1)}%)`}
            ariaLabel="Attestation Progress"
            fillColor="bg-success"
          />
        </div>
      </div>

      {/* Charts side by side */}
      <div className="grid grid-cols-12 gap-4">
        {/* Interval Arrivals Chart - 6 columns */}
        <div className="col-span-6 rounded-sm border border-border bg-surface p-4">
          <LineChart
            data={intervalChartData.values}
            labels={intervalChartData.labels}
            title="Attestation Arrivals"
            height={300}
            smooth={false}
            showArea={true}
            yMax={intervalMax}
            connectNulls={false}
            animationDuration={150}
          />
        </div>

        {/* Cumulative Distribution Chart - 6 columns */}
        <div className="col-span-6 rounded-sm border border-border bg-surface p-4">
          <LineChart
            data={cumulativeChartData.values}
            labels={cumulativeChartData.labels}
            title="Cumulative Distribution (%)"
            height={300}
            smooth={true}
            showArea={false}
            yMax={cumulativeMax}
            connectNulls={true}
            animationDuration={150}
          />
        </div>
      </div>
    </div>
  );
}
