import type { JSX } from 'react';
import { useMemo, memo } from 'react';
import clsx from 'clsx';
import { ScatterAndLineChart } from '@/components/Charts/ScatterAndLine';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { BlobDataAvailabilityProps } from './BlobDataAvailability.types';
import { getDataVizColors } from '@/utils/dataVizColors';

/**
 * BlobDataAvailability - Page-specific component for visualizing blob data availability
 *
 * Displays three charts:
 * 1. First Seen - Scatter plot showing when blobs were first seen
 * 2. Data is Available Rate - Line chart showing node availability over time
 * 3. Continental Proportion - Step chart showing cumulative distribution
 *
 * Charts only render data up to the current slot time, simulating live progression.
 * All time values are in milliseconds. Axis labels and tooltips display values in seconds for readability.
 *
 * @example
 * ```tsx
 * <BlobDataAvailability
 *   firstSeenData={[{ time: 1420, blobId: '0', color: '#06b6d4' }]}
 *   availabilityRateData={[{ time: 0, nodes: 0 }, { time: 1000, nodes: 25 }]}
 *   continentalPropagationData={[
 *     { continent: 'EU', data: [{ time: 1200, percentage: 0 }, { time: 1400, percentage: 100 }] },
 *     { continent: 'NA', data: [{ time: 1300, percentage: 0 }, { time: 1500, percentage: 100 }] }
 *   ]}
 * />
 * ```
 */
function BlobDataAvailabilityComponent({
  deduplicatedBlobData,
  visibleContinentalPropagationData,
  maxTime = 12000,
  variant = 'both',
  className,
}: BlobDataAvailabilityProps): JSX.Element {
  const { CONTINENT_COLORS } = getDataVizColors();
  // Prepare First Seen scatter data for ScatterAndLineChart
  const firstSeenScatterSeries = useMemo(() => {
    if (deduplicatedBlobData.length === 0) return [];

    return [
      {
        name: 'Blobs',
        data: deduplicatedBlobData.map(blob => [blob.time, parseInt(blob.blobId)] as [number, number]),
        symbolSize: 8,
      },
    ];
  }, [deduplicatedBlobData]);

  // Prepare Continental Propagation data for MultiLineChart
  // Convert time from milliseconds to seconds for display
  const continentalLineSeries = useMemo(() => {
    const defaultColors = Object.values(CONTINENT_COLORS);

    return visibleContinentalPropagationData.map((continent, idx) => ({
      name: continent.continent,
      data: continent.data.map(point => [point.time / 1000, point.percentage] as [number, number]),
      color: continent.color || defaultColors[idx % defaultColors.length],
      step: 'end' as const,
    }));
  }, [visibleContinentalPropagationData, CONTINENT_COLORS]);

  // Render based on variant
  if (variant === 'first-seen-only') {
    return (
      <div className={clsx('flex h-full flex-col bg-surface p-3', className)}>
        <div className="mb-2 shrink-0">
          <h3 className="text-sm font-semibold text-foreground uppercase">Blob First Seen</h3>
        </div>
        <div className="min-h-0 flex-1">
          <ScatterAndLineChart
            scatterSeries={firstSeenScatterSeries}
            xAxisTitle="Slot Time (s)"
            yAxisTitle="Blob"
            xMax={maxTime}
            xInterval={4000}
            xAxisFormatter={(value: number) => `${Math.round(value / 1000)}`}
            yAxisFormatter={(value: number) => (Number.isInteger(value) ? `${value}` : '')}
            height="100%"
            animation={false}
            showLegend={false}
          />
        </div>
      </div>
    );
  }

  if (variant === 'continental-only') {
    return (
      <div className={clsx('flex h-full flex-col bg-surface p-3', className)}>
        <div className="mb-2 shrink-0">
          <h3 className="text-sm font-semibold text-foreground uppercase">Continental Propagation</h3>
        </div>
        <div className="min-h-0 flex-1">
          <MultiLineChart
            series={continentalLineSeries}
            xAxis={{ type: 'value', name: 'Slot Time (s)', min: 0, max: maxTime / 1000 }}
            yAxis={{ name: 'Complete (%)', max: 100 }}
            height="100%"
            showLegend={true}
            legendPosition="bottom"
            useNativeLegend={true}
            animationDuration={0}
          />
        </div>
      </div>
    );
  }

  // Default: both charts side-by-side
  return (
    <>
      {/* Desktop: Two-column layout */}
      <div className={clsx('hidden h-full grid-cols-2 lg:grid', className)}>
        {/* First Seen Chart */}
        <div className="flex h-full flex-col border-r border-border bg-background p-3">
          <div className="mb-2 shrink-0">
            <h3 className="text-sm font-semibold text-foreground uppercase">Blob First Seen</h3>
          </div>
          <div className="min-h-0 flex-1">
            <ScatterAndLineChart
              scatterSeries={firstSeenScatterSeries}
              xAxisTitle="Slot Time (s)"
              yAxisTitle="Blob"
              xMax={maxTime}
              xInterval={4000}
              xAxisFormatter={(value: number) => `${Math.round(value / 1000)}`}
              height="100%"
              animation={false}
              showLegend={false}
            />
          </div>
        </div>

        {/* Continental Propagation Chart */}
        <div className="flex h-full flex-col bg-background p-3">
          <div className="mb-2 shrink-0">
            <h3 className="text-sm font-semibold text-foreground uppercase">Continental Propagation</h3>
          </div>
          <div className="min-h-0 flex-1">
            <MultiLineChart
              series={continentalLineSeries}
              xAxis={{ type: 'value', name: 'Slot Time (s)', min: 0, max: maxTime / 1000 }}
              yAxis={{ name: 'Complete (%)', max: 100 }}
              height="100%"
              showLegend={true}
              legendPosition="bottom"
              useNativeLegend={true}
              animationDuration={0}
            />
          </div>
        </div>
      </div>

      {/* Mobile: Continental Propagation only, fullscreen */}
      <div className={clsx('h-full bg-background lg:hidden', className)}>
        <MultiLineChart
          series={continentalLineSeries}
          xAxis={{ type: 'value', name: 'Slot Time (s)', min: 0, max: maxTime / 1000 }}
          yAxis={{ name: 'Complete (%)', max: 100 }}
          height="100%"
          showLegend={true}
          legendPosition="bottom"
          useNativeLegend={true}
          animationDuration={0}
        />
      </div>
    </>
  );
}

// Custom comparison function to prevent re-renders when data hasn't changed
const arePropsEqual = (prevProps: BlobDataAvailabilityProps, nextProps: BlobDataAvailabilityProps): boolean => {
  return (
    prevProps.deduplicatedBlobData === nextProps.deduplicatedBlobData &&
    prevProps.visibleContinentalPropagationData === nextProps.visibleContinentalPropagationData &&
    prevProps.maxTime === nextProps.maxTime
  );
};

export const BlobDataAvailability = memo(BlobDataAvailabilityComponent, arePropsEqual);
