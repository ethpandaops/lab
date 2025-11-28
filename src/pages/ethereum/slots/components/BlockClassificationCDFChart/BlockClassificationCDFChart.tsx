import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { SeriesData } from '@/components/Charts/MultiLine/MultiLine.types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getClassificationLabel, CLASSIFICATION_DESCRIPTIONS } from '@/utils/classification';
import type { BlockClassificationCDFChartProps } from './BlockClassificationCDFChart.types';

/**
 * BlockClassificationCDFChart - Visualizes cumulative distribution of block propagation by node classification
 *
 * Shows CDF (Cumulative Distribution Function) curves for each classification type:
 * - individual
 * - corporate
 * - internal
 *
 * @example
 * ```tsx
 * <BlockClassificationCDFChart
 *   blockPropagationData={[
 *     { seen_slot_start_diff: 145, classification: 'individual' },
 *     { seen_slot_start_diff: 230, classification: 'corporate' },
 *     ...
 *   ]}
 * />
 * ```
 */
export function BlockClassificationCDFChart({ blockPropagationData }: BlockClassificationCDFChartProps): JSX.Element {
  const themeColors = useThemeColors();

  // Process data into CDF series by classification
  const cdfSeries = useMemo(() => {
    if (blockPropagationData.length === 0) {
      return [];
    }

    // Group data by classification
    const classificationGroups = new Map<string, number[]>();
    blockPropagationData.forEach(point => {
      const classification = point.classification || 'unclassified';
      if (!classificationGroups.has(classification)) {
        classificationGroups.set(classification, []);
      }
      classificationGroups.get(classification)!.push(point.seen_slot_start_diff);
    });

    // Define classification colors to match the badge colors in classification.ts
    const classificationColors: Record<string, string> = {
      individual: themeColors.primary,
      corporate: '#a855f7', // purple-500
      internal: themeColors.success,
      unclassified: themeColors.muted,
    };

    // Create CDF series for each classification
    const series: SeriesData[] = [];
    classificationGroups.forEach((times, classification) => {
      // Sort times for CDF calculation
      const sortedTimes = [...times].sort((a, b) => a - b);
      const totalNodes = sortedTimes.length;

      // Calculate CDF: [time in seconds, cumulative percentage]
      const cdfData: Array<[number, number]> = sortedTimes.map((time, index) => [
        time / 1000, // Convert ms to seconds
        ((index + 1) / totalNodes) * 100,
      ]);

      series.push({
        name: getClassificationLabel(classification),
        data: cdfData,
        color: classificationColors[classification] || themeColors.muted,
        smooth: true,
        lineWidth: 2,
        showSymbol: false,
      });
    });

    // Sort series by name for consistent legend order
    return series.sort((a, b) => a.name.localeCompare(b.name));
  }, [blockPropagationData, themeColors]);

  // Handle empty data
  if (blockPropagationData.length === 0) {
    return (
      <PopoutCard title="Block Propagation by Classification (CDF)" anchorId="block-classification-cdf" modalSize="xl">
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex h-96 items-center justify-center text-muted'
                : 'flex h-72 items-center justify-center text-muted'
            }
          >
            <p>No block propagation data available</p>
          </div>
        )}
      </PopoutCard>
    );
  }

  const subtitle = `Cumulative distribution of block arrival times by node classification`;

  return (
    <PopoutCard
      title="Block Propagation by Classification (CDF)"
      anchorId="block-classification-cdf"
      subtitle={subtitle}
      modalSize="xl"
    >
      {({ inModal }) => (
        <div className="space-y-4">
          {/* Chart */}
          <MultiLineChart
            series={cdfSeries}
            xAxis={{
              type: 'value',
              name: 'Slot Time (s)',
              min: 0,
              max: 12,
            }}
            yAxis={{
              name: 'Cumulative %',
              min: 0,
              max: 100,
            }}
            height={inModal ? 384 : 288}
            showLegend={true}
            legendPosition="bottom"
            useNativeLegend={true}
            tooltipTrigger="axis"
            syncGroup="slot-time"
          />

          {/* Classification Legend */}
          <div className="rounded-sm bg-muted/10 px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted">Node Classifications:</p>
            <div className="space-y-1.5">
              {(['individual', 'corporate', 'internal'] as const).map(cls => (
                <div key={cls} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 shrink-0 font-semibold text-foreground">
                    {CLASSIFICATION_DESCRIPTIONS[cls].label}:
                  </span>
                  <span className="text-muted">{CLASSIFICATION_DESCRIPTIONS[cls].description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </PopoutCard>
  );
}
