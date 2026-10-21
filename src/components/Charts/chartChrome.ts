/**
 * Shared ECharts chrome (axes, tooltip, title) so every chart matches MultiLine.
 */

/** Subset of theme colors used by the chrome helpers. */
export interface ChartChromeColors {
  foreground: string;
  muted: string;
  border: string;
  surface: string;
}

/** Default chart title text style. */
export function getChartTitleTextStyle(colors: ChartChromeColors): {
  color: string;
  fontSize: number;
  fontWeight: number;
} {
  return { color: colors.foreground, fontSize: 14, fontWeight: 600 };
}

/** Tooltip container styling shared by all charts. */
export function getChartTooltipChrome(colors: ChartChromeColors): {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  padding: number[];
  extraCssText: string;
  appendToBody: boolean;
  textStyle: { color: string; fontSize: number };
} {
  return {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    padding: [8, 10],
    extraCssText: 'border-radius: 6px;',
    appendToBody: true,
    textStyle: { color: colors.foreground, fontSize: 12 },
  };
}

/** Axis name text style. */
export function getChartAxisNameStyle(colors: ChartChromeColors): {
  color: string;
  fontSize: number;
  fontWeight: 'normal';
} {
  return { color: colors.muted, fontSize: 11, fontWeight: 'normal' };
}

/** Name placement for a value axis that sits above the axis, reading horizontally. */
export function getChartValueAxisName(colors: ChartChromeColors): {
  nameLocation: 'end';
  nameGap: number;
  nameTextStyle: { color: string; fontSize: number; fontWeight: 'normal'; align: 'left'; padding: number[] };
} {
  return {
    nameLocation: 'end',
    nameGap: 10,
    nameTextStyle: { ...getChartAxisNameStyle(colors), align: 'left', padding: [0, 0, 0, -8] },
  };
}

/** Axis label style. */
export function getChartAxisLabelStyle(colors: ChartChromeColors): { color: string; fontSize: number } {
  return { color: colors.muted, fontSize: 11 };
}

/** Axis line shown in the border color. */
export function getChartAxisLine(colors: ChartChromeColors): { show: boolean; lineStyle: { color: string } } {
  return { show: true, lineStyle: { color: colors.border } };
}

/** Hairline split lines for a value axis. */
export function getChartValueSplitLine(colors: ChartChromeColors): {
  show: boolean;
  lineStyle: { color: string; type: 'solid' };
} {
  return { show: true, lineStyle: { color: colors.border, type: 'solid' } };
}
