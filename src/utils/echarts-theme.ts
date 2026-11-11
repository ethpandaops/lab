import { registerTheme } from 'echarts/core';
import { CHART_FONT_FAMILY } from './dataVizColors';

/** Name of the registered ECharts theme; pass as `theme` to every ReactECharts instance. */
export const ECHARTS_THEME = 'lab';

// Canvas text cannot inherit CSS fonts, so every chart takes the UI typeface from this theme.
registerTheme(ECHARTS_THEME, {
  textStyle: { fontFamily: CHART_FONT_FAMILY },
  // On touch screens a one-finger swipe over a zoomable chart must scroll the page, not get swallowed
  dataZoom: { preventDefaultMouseMove: globalThis.matchMedia?.('(hover: hover)').matches ?? true },
});

// Scrolling over a chart scrolls the page. ECharts swallows every wheel event over a zoomable or
// roamable chart (inside dataZoom, geo roam, echarts-gl view control), whatever its options say,
// so plain wheel events stop here before they reach any chart. Ctrl+wheel, which trackpad pinch
// also sends, still zooms.
if (typeof window !== 'undefined') {
  window.addEventListener(
    'wheel',
    event => {
      if (!event.ctrlKey && event.target instanceof Element && event.target.closest('[_echarts_instance_]')) {
        event.stopPropagation();
      }
    },
    { capture: true, passive: true }
  );
}
