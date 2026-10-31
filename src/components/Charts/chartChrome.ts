import {
  CONSENSUS_CLIENTS,
  EXECUTION_CLIENTS,
  LIGHT_GLYPH_CLIENTS,
  getClientLogoUrl,
  isKnownClient,
  normalizeClientName,
} from '@/utils/ethereum';

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

/** Axis numbers: compact from 10,000 up ("40M", "1.2B"), grouped digits below */
export function formatAxisNumber(value: number): string {
  if (Math.abs(value) >= 10_000) {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

/**
 * Native ECharts legend entry for a series: a known client's series shows the client's logo in
 * place of the colour swatch, so clients read the same in every legend
 */
export function legendItem<T extends { name: string }>(entry: T): T | (T & { icon: string }) {
  return isKnownClient(entry.name) ? { ...entry, icon: `image://${chartClientLogoUrl(entry.name)}` } : entry;
}

/**
 * Legend item box for a native legend: square when any entry is a client, so `legendItem` logos
 * aren't stretched (ECharts keeps an image icon's aspect only on its first load, not from cache)
 */
export function legendItemSize(
  names: string[],
  width: number,
  height: number
): { itemWidth: number; itemHeight: number } {
  const size = Math.min(width, height);
  return names.some(isKnownClient) ? { itemWidth: size, itemHeight: size } : { itemWidth: width, itemHeight: height };
}

/**
 * Client logo as an `<img>` for ECharts HTML tooltips, or an empty string for names that aren't
 * a known client
 */
export function clientLogoHtml(name: string, size = 14): string {
  if (!isKnownClient(name)) return '';
  return `<img src="${chartClientLogoUrl(name)}" width="${size}" height="${size}" alt="" style="flex-shrink:0;border-radius:2px">`;
}

/** Rich text style name for a client's logo in axis labels (rich names allow word characters only) */
function clientRichKey(name: string): string {
  return `client_${normalizeClientName(name).replace(/\W/g, '_')}`;
}

/** Category axis label that puts a known client's logo before its name */
export function formatClientAxisLabel(value: string): string {
  return isKnownClient(value) ? `{${clientRichKey(value)}|} ${value}` : value;
}

/**
 * Category axis label options for axes that list clients: `formatClientAxisLabel` as the formatter,
 * plus the rich text styles that draw each client's logo
 */
export function clientAxisLabel(): {
  formatter: (value: string) => string;
  rich: Record<string, { width: number; height: number; backgroundColor: { image: string } }>;
} {
  const rich = Object.fromEntries(
    [...CONSENSUS_CLIENTS, ...EXECUTION_CLIENTS].map(client => [
      clientRichKey(client),
      { width: 14, height: 14, backgroundColor: { image: chartClientLogoUrl(client) } },
    ])
  );
  return { formatter: formatClientAxisLabel, rich };
}

/**
 * Logo URL for canvas legends and tooltip HTML, which can't take ClientLogo's CSS inversion:
 * on light themes, logos drawn in white use their inverted copy
 */
function chartClientLogoUrl(name: string): string {
  const normalized = normalizeClientName(name);
  const classList = typeof document === 'undefined' ? undefined : document.documentElement.classList;
  const isLightTheme = classList ? !classList.contains('dark') && !classList.contains('star') : false;
  return isLightTheme && LIGHT_GLYPH_CLIENTS.has(normalized)
    ? `/images/external/clients/${normalized}-inverted.png`
    : getClientLogoUrl(normalized);
}
