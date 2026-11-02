import { type JSX, useMemo } from 'react';
import { MultiLineChart, type SeriesData } from '@/components/Charts/MultiLine';
import { getDataVizColors } from '@/utils/dataVizColors';
import { formatDailyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import { compareVersions } from '@/utils/version';
import { OTHER_VERSION_COLOR, groupVersionLines, type VersionDay } from '../../utils/client-versions';

export interface VersionShareChartProps {
  days: VersionDay[];
  /** Lines drawn on their own, the most-used recently; the rest stack as Other */
  limit?: number;
  height?: number;
}

const OTHER = 'Other';

/**
 * Daily share of resolved versions, stacked: current releases (or minor lines) on their own, the rest as Other.
 */
export function VersionShareChart({ days: versionDays, limit = 7, height = 320 }: VersionShareChartProps): JSX.Element {
  const { series, labels } = useMemo(() => {
    const { days, top: picked } = groupVersionLines(versionDays, limit);
    const top = [...picked].sort((a, b) => compareVersions(b, a));
    const palette = getDataVizColors().CHART_CATEGORICAL_COLORS;
    const colors = new Map(top.map((version, index) => [version, palette[index % palette.length]]));
    const shown = new Set(top);
    const hasOther = days.some(day => [...day.counts.keys()].some(version => !shown.has(version)));
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
  }, [versionDays, limit]);

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
