import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { getDataVizColors } from '@/utils/dataVizColors';
import { DEFAULT_BEACON_SLOT_PHASES } from '@/utils/beacon';

import type { BlockArrivalTimesChartProps } from './BlockArrivalTimesChart.types';

/**
 * BlockArrivalTimesChart - Statistical band chart for block arrival times
 *
 * Displays block arrival time distribution across multiple nodes using
 * statistical bands (min, p05, p50, p90, max). This creates a Bollinger-band
 * style visualization showing:
 * - Median (p50) as the main line
 * - Inner band (p05-p90) showing normal variation
 * - Outer band (min-max) showing full range
 *
 * The chart converts milliseconds to seconds for better readability.
 *
 * @example Slot-level granularity
 * ```tsx
 * <BlockArrivalTimesChart
 *   data={slots.map(s => ({
 *     x: s.slot,
 *     min: s.minArrivalTime,
 *     p05: s.p05ArrivalTime,
 *     p50: s.medianArrivalTime,
 *     p90: s.p90ArrivalTime,
 *     max: s.maxArrivalTime
 *   }))}
 *   xAxis={{ name: 'Slot' }}
 *   subtitle="Block arrival times per slot"
 * />
 * ```
 */
export function BlockArrivalTimesChart({
  data,
  xAxis,
  title = 'Block Arrival Times',
  subtitle = 'Time from slot start when nodes first see blocks (statistical distribution)',
  height,
  anchorId,
  inModal = false,
  modalSize = 'full',
  relativeSlots,
}: BlockArrivalTimesChartProps): React.JSX.Element {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  // Calculate attestation deadline from slot phases (end of Block phase)
  const attestationDeadlineSeconds = DEFAULT_BEACON_SLOT_PHASES[0].duration / 1000;

  console.log('[BlockArrivalTimesChart] attestationDeadlineSeconds:', attestationDeadlineSeconds);

  const { series, minX, maxY } = useMemo(() => {
    if (data.length === 0) {
      return { series: [], minX: undefined, maxY: undefined };
    }

    const minX = Math.min(...data.map(d => d.x));

    // Convert milliseconds to seconds for better readability
    // Create series for statistical bands
    const series = [
      // Min boundary (outer band, lower)
      {
        name: 'Min',
        data: data.map(d => [d.x, d.min !== null ? d.min / 1000 : null] as [number, number | null]),
        color: CHART_CATEGORICAL_COLORS[3], // purple/violet for min
        smooth: true,
        showSymbol: false,
        lineWidth: 1,
        lineStyle: 'dotted' as const,
        showArea: false,
      },
      // P05 boundary (inner band, lower)
      {
        name: 'P05',
        data: data.map(d => [d.x, d.p05 !== null ? d.p05 / 1000 : null] as [number, number | null]),
        color: CHART_CATEGORICAL_COLORS[0], // blue for p05
        smooth: true,
        showSymbol: false,
        lineWidth: 1.5,
        lineStyle: 'dashed' as const,
        showArea: true,
        areaOpacity: 0.1, // Light area between p05 and min
      },
      // P50 (median) - main line
      {
        name: 'Median (P50)',
        data: data.map(d => [d.x, d.p50 !== null ? d.p50 / 1000 : null] as [number, number | null]),
        color: CHART_CATEGORICAL_COLORS[2], // accent/orange for median
        smooth: true,
        showSymbol: false,
        lineWidth: 3,
        lineStyle: 'solid' as const,
        showArea: false,
      },
      // P90 boundary (inner band, upper)
      {
        name: 'P90',
        data: data.map(d => [d.x, d.p90 !== null ? d.p90 / 1000 : null] as [number, number | null]),
        color: CHART_CATEGORICAL_COLORS[1], // emerald/green for p90
        smooth: true,
        showSymbol: false,
        lineWidth: 1.5,
        lineStyle: 'dashed' as const,
        showArea: true,
        areaOpacity: 0.1, // Light area between p90 and max
      },
      // Max boundary (outer band, upper) - Hidden by default, user can show via legend
      {
        name: 'Max',
        data: data.map(d => [d.x, d.max !== null ? d.max / 1000 : null] as [number, number | null]),
        color: CHART_CATEGORICAL_COLORS[4], // red/pink for max
        smooth: true,
        showSymbol: false,
        lineWidth: 1,
        lineStyle: 'dotted' as const,
        showArea: false,
        visible: false, // Hidden by default
      },
    ];

    // Calculate max Y value from data
    const dataMaxY =
      Math.max(...data.flatMap(d => [d.min, d.p05, d.p50, d.p90, d.max].filter((v): v is number => v !== null))) / 1000; // Convert to seconds

    // Ensure y-axis includes attestation deadline with some padding
    const maxY = Math.max(dataMaxY, attestationDeadlineSeconds) * 1.1;

    return { series, minX, maxY };
  }, [data, CHART_CATEGORICAL_COLORS, attestationDeadlineSeconds]);

  const chartHeight = height ?? (inModal ? 600 : 300);

  return (
    <PopoutCard title={title} subtitle={subtitle} anchorId={anchorId} modalSize={modalSize}>
      {({ inModal: isInModal }) => (
        <>
          <MultiLineChart
            series={series}
            xAxis={{
              type: 'value',
              name: xAxis.name,
              min: xAxis.min ?? minX,
              max: xAxis.max,
              formatter: xAxis.formatter,
            }}
            yAxis={{
              name: 'Time (seconds)',
              formatter: (value: number | string) => (typeof value === 'number' ? value.toFixed(2) : value),
              valueDecimals: 2,
              max: maxY,
            }}
            height={isInModal ? 600 : chartHeight}
            showLegend={true}
            enableDataZoom={true}
            animationDuration={300}
            relativeSlots={relativeSlots}
            markLines={(() => {
              const lines = [
                {
                  value: attestationDeadlineSeconds,
                  label: 'Attestation deadline',
                  lineStyle: 'dotted' as const,
                },
              ];
              console.log('[BlockArrivalTimesChart] Passing markLines:', lines);
              return lines;
            })()}
          />
        </>
      )}
    </PopoutCard>
  );
}
