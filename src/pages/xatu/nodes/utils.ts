import type { SeriesData } from '@/components/Charts/MultiLine/MultiLine.types';

/**
 * Format bytes into a human-readable string (e.g. "1.23 GB", "456 MB").
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const index = Math.min(i, sizes.length - 1);

  return `${(bytes / k ** index).toFixed(decimals)} ${sizes[index]}`;
}

/**
 * Format bytes per second into a human-readable rate string (e.g. "1.23 GB/s").
 */
export function formatBytesPerSecond(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B/s';

  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const index = Math.min(i, sizes.length - 1);

  return `${(bytes / k ** index).toFixed(decimals)} ${sizes[index]}`;
}

/**
 * Compute time range boundaries for API queries.
 * Returns Unix seconds for hourly tables and YYYY-MM-DD strings for daily tables.
 */
export function getTimeRange(
  days: number,
  dataType: 'hourly' | 'daily',
): { gte: number | string; lte: number | string } {
  const now = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  if (dataType === 'daily') {
    const fmt = (d: Date): string => d.toISOString().split('T')[0];
    return { gte: fmt(start), lte: fmt(now) };
  }

  return {
    gte: Math.floor(start.getTime() / 1000),
    lte: Math.floor(now.getTime() / 1000),
  };
}

// ── Chart helpers ──────────────────────────────────────────────────────

/** Row type union - any row with meta_client_name and either hourly or daily time key. */
interface TimeRow {
  meta_client_name?: string;
  hour_start_date_time?: number;
  day_start_date?: string;
}

function getTimestamp(row: TimeRow): number {
  if (row.hour_start_date_time !== undefined) return row.hour_start_date_time;
  if (row.day_start_date) return Math.floor(new Date(row.day_start_date).getTime() / 1000);
  return 0;
}

/**
 * Build MultiLineChart series from hourly/daily rows grouped by meta_client_name.
 * Shared by CPU and Memory charts (simple 1 row → 1 value mapping).
 */
export function buildTimeSeries<T extends TimeRow>({
  data,
  filterNode,
  getValue,
  colors,
}: {
  data: T[];
  filterNode?: string;
  getValue: (row: T) => number;
  colors: string[];
}): { series: SeriesData[]; timestamps: number[] } {
  const filtered = filterNode ? data.filter(d => d.meta_client_name === filterNode) : data;

  const grouped = new Map<string, Map<number, number>>();
  const allTimestamps = new Set<number>();

  for (const row of filtered) {
    const name = row.meta_client_name ?? 'unknown';
    if (!grouped.has(name)) grouped.set(name, new Map());
    const ts = getTimestamp(row);
    allTimestamps.add(ts);
    grouped.get(name)!.set(ts, getValue(row));
  }

  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
  const chartSeries: SeriesData[] = [];
  let colorIndex = 0;

  for (const [name, timeMap] of grouped) {
    chartSeries.push({
      name,
      data: sortedTimestamps.map(ts => [ts, timeMap.get(ts) ?? 0] as [number, number]),
      color: colors[colorIndex % colors.length],
      lineWidth: 2,
      smooth: 0.4,
      showArea: true,
      areaOpacity: 0.08,
    });
    colorIndex++;
  }

  return { series: chartSeries, timestamps: sortedTimestamps };
}

/**
 * Build a styled HTML tooltip matching the slot view format.
 */
export function formatTimeTooltip(
  items: Array<{ marker: string; seriesName: string; value: [number, number] | number }>,
  formatValue: (v: number) => string,
): string {
  if (items.length === 0) return '';

  const first = items[0];
  const ts = Array.isArray(first.value) ? first.value[0] : 0;
  const date = new Date(ts * 1000);
  const timeStr = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let html = `<div style="font-size:12px;min-width:180px">`;
  html += `<div style="margin-bottom:4px;font-weight:600;color:var(--color-foreground)">${timeStr}</div>`;

  for (const p of items) {
    const val = Array.isArray(p.value) ? p.value[1] : p.value;
    if (val == null) continue;
    html += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">`;
    html += `${p.marker}`;
    html += `<span style="flex:1">${p.seriesName}</span>`;
    html += `<span style="font-weight:600">${formatValue(Number(val))}</span>`;
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}
