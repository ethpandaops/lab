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
  // Densify data with regular intervals for better tooltip interaction
  const continentalLineSeries = useMemo(() => {
    const defaultColors = Object.values(CONTINENT_COLORS);
    const intervalMs = 50; // Add data points every 50ms for smooth tooltip

    // Find the actual maximum time from the visible data (not maxTime which is the full slot)
    const actualMaxTime = Math.max(
      0,
      ...visibleContinentalPropagationData.flatMap(continent => continent.data.map(point => point.time))
    );

    // If there's no data at all, return empty series
    if (actualMaxTime === 0) {
      return visibleContinentalPropagationData.map((continent, idx) => ({
        name: continent.continent,
        data: [],
        color: continent.color || defaultColors[idx % defaultColors.length],
        step: 'end' as const,
      }));
    }

    return visibleContinentalPropagationData.map((continent, idx) => {
      const originalData = continent.data;
      if (originalData.length === 0) {
        // For this specific continent, create zero-value points up to actualMaxTime
        const densifiedData: [number, number][] = [];
        for (let time = 0; time <= actualMaxTime; time += intervalMs) {
          densifiedData.push([time / 1000, 0]);
        }
        return {
          name: continent.continent,
          data: densifiedData,
          color: continent.color || defaultColors[idx % defaultColors.length],
          step: 'end' as const,
        };
      }

      // Create densified data with regular intervals
      const densifiedData: [number, number][] = [];

      // Start from 0 and go up to the actual max time in the visible data
      const startTime = 0;
      const endTime = actualMaxTime;

      // Generate points at regular intervals
      for (let time = startTime; time <= endTime; time += intervalMs) {
        // Find the appropriate value for this time (step function)
        // Use the value from the last data point that occurred before or at this time
        const applicablePoint = originalData.filter(p => p.time <= time).sort((a, b) => b.time - a.time)[0];

        const currentValue = applicablePoint?.percentage ?? 0;
        densifiedData.push([time / 1000, currentValue]);
      }

      return {
        name: continent.continent,
        data: densifiedData,
        color: continent.color || defaultColors[idx % defaultColors.length],
        step: 'end' as const,
      };
    });
  }, [visibleContinentalPropagationData, CONTINENT_COLORS]);

  // Tooltip formatter for continental propagation chart
  // Shows slot time with 2 decimal places (e.g., "4.45s")
  const continentalTooltipFormatter = (params: unknown): string => {
    const dataPoints = Array.isArray(params) ? params : [params];
    let html = '';

    // Add time header with 2 decimal places
    if (dataPoints.length > 0 && dataPoints[0]) {
      const firstPoint = dataPoints[0] as { axisValue?: number };
      if (firstPoint.axisValue !== undefined) {
        html += `<div style="margin-bottom: 4px; font-weight: 600;">${firstPoint.axisValue.toFixed(2)}s</div>`;
      }
    }

    // Add each series
    dataPoints.forEach(point => {
      const p = point as { marker?: string; seriesName?: string; value?: [number, number] };
      if (p.marker && p.seriesName !== undefined && p.value) {
        const percentage = p.value[1];
        html += `<div style="display: flex; align-items: center; gap: 8px;">`;
        html += p.marker;
        html += `<span>${p.seriesName}:</span>`;
        html += `<span style="font-weight: 600; margin-left: auto;">${percentage.toFixed(1)}%</span>`;
        html += `</div>`;
      }
    });

    return html;
  };

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
            showLegend={false}
            tooltipTrigger="axis"
            tooltipFormatter={continentalTooltipFormatter}
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
              showLegend={false}
              tooltipTrigger="axis"
              tooltipFormatter={continentalTooltipFormatter}
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
          showLegend={false}
          tooltipTrigger="axis"
          tooltipFormatter={continentalTooltipFormatter}
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
