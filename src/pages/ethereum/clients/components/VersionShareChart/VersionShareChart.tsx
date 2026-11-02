import { type JSX, useMemo } from 'react';
import { MultiLineChart, type SeriesData } from '@/components/Charts/MultiLine';
import { getDataVizColors } from '@/utils/dataVizColors';
import { formatDailyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import {
  OTHER_VERSION_COLOR,
  groupVersionLines,
  versionColors,
  type VersionDay,
  type VersionSummary,
} from '../../utils/client-versions';

export interface VersionShareChartProps {
  days: VersionDay[];
  versions: VersionSummary[];
  /** Lines drawn on their own; the rest stack as Other. Versions group into minor or major lines when needed */
  limit?: number;
  height?: number;
}

const OTHER = 'Other';

/**
 * Daily share of resolved blocks per version, stacked, the most-used versions (or release lines) on their own.
 */
export function VersionShareChart({
  days: versionDays,
  versions: versionSummaries,
  limit = 7,
  height = 320,
}: VersionShareChartProps): JSX.Element {
  const { series, labels } = useMemo(() => {
    const { days, versions } = groupVersionLines(versionDays, versionSummaries, limit);
    const colors = versionColors(versions, getDataVizColors().CHART_CATEGORICAL_COLORS, limit);
    const top = [...colors.keys()];
    const shown = new Set(top);
    const hasOther = versions.some(summary => !shown.has(summary.version));
    const share = (day: VersionDay, count: number): number | null =>
      day.resolved > 0 ? Number(((count / day.resolved) * 100).toFixed(2)) : null;

    const result: SeriesData[] = top.map(version => ({
      name: version,
      data: days.map(day => share(day, day.counts.get(version) ?? 0)),
      color: colors.get(version),
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
        color: OTHER_VERSION_COLOR,
        stack: 'share',
        showArea: true,
        areaOpacity: 0.3,
        lineWidth: 0,
        showSymbol: false,
      });
    }
    return { series: result, labels: days.map(day => formatDailyDate(day.day)) };
  }, [versionDays, versionSummaries, limit]);

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
