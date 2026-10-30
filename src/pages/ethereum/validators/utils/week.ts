const DAY_MS = 86_400_000;

/** Monday (UTC) of the week containing `day` (YYYY-MM-DD), the key of weekly rollup rows */
export function weekStartOf(day: string): string {
  const ms = Date.parse(`${day}T00:00:00Z`);
  const daysSinceMonday = (new Date(ms).getUTCDay() + 6) % 7;
  return new Date(ms - daysSinceMonday * DAY_MS).toISOString().slice(0, 10);
}
