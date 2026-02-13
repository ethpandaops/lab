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
  dataType: 'hourly' | 'daily'
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
