import { type JSX, useMemo } from 'react';
import { MultiLineChart, type SeriesData } from '@/components/Charts/MultiLine';
import { getDataVizColors } from '@/utils/dataVizColors';
import { compareVersions } from '@/utils/version';
import { formatDailyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import type { VersionDay, VersionSummary } from '../../utils/client-versions';

export interface VersionShareChartProps {
  days: VersionDay[];
  versions: VersionSummary[];
  /** Versions drawn on their own; the rest stack as Other */
  limit?: number;
  height?: number;
}

const OTHER = 'Other';

/**
 * Daily share of resolved blocks per version, stacked, the most-used versions on their own.
 */
export function VersionShareChart({ days, versions, limit = 7, height = 320 }: VersionShareChartProps): JSX.Element {
  const { series, labels } = useMemo(() => {
    const { CHART_CATEGORICAL_COLORS } = getDataVizColors();
    const top = [...versions]
      .sort((a, b) => b.blocks - a.blocks)
      .slice(0, limit)
      .map(summary => summary.version)
      .sort((a, b) => compareVersions(b, a));
    const shown = new Set(top);
    const hasOther = versions.some(summary => !shown.has(summary.version));
    const share = (day: VersionDay, count: number): number | null =>
      day.resolved > 0 ? Number(((count / day.resolved) * 100).toFixed(2)) : null;

    const result: SeriesData[] = top.map((version, index) => ({
      name: version,
      data: days.map(day => share(day, day.counts.get(version) ?? 0)),
      color: CHART_CATEGORICAL_COLORS[index % CHART_CATEGORICAL_COLORS.length],
      stack: 'share',
      showArea: true,
      areaOpacity: 0.85,
      lineWidth: 0,
      showSymbol: false,
    }));
    if (hasOther) {
      result.push({
        name: OTHER,
        data: days.map(day => {
          let other = 0;
          for (const [version, count] of day.counts) if (!shown.has(version)) other += count;
          return share(day, other);
        }),
        color: '#9ca3af',
        stack: 'share',
        showArea: true,
        areaOpacity: 0.3,
        lineWidth: 0,
        showSymbol: false,
      });
    }
    return { series: result, labels: days.map(day => formatDailyDate(day.day)) };
  }, [days, versions, limit]);

  return (
    <MultiLineChart
      series={series}
      xAxis={{ type: 'category', labels, name: 'Date' }}
      yAxis={{ name: 'Share (%)', min: 0, max: 100 }}
      height={height}
      showLegend
      legendPosition="top"
    />
  );
}
