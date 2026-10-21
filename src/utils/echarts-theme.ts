import { registerTheme } from 'echarts/core';
import { CHART_FONT_FAMILY } from './dataVizColors';

/** Name of the registered ECharts theme; pass as `theme` to every ReactECharts instance. */
export const ECHARTS_THEME = 'lab';

// Canvas text cannot inherit CSS fonts, so every chart takes the UI typeface from this theme.
registerTheme(ECHARTS_THEME, {
  textStyle: { fontFamily: CHART_FONT_FAMILY },
});
