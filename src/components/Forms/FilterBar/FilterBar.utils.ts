/** Chip text for a range: both ends, or the one end that is set; undefined when neither is */
export function formatRange(min: number | undefined, max: number | undefined, unit = ''): string | undefined {
  if (min !== undefined && max !== undefined) return min === max ? `${min}${unit}` : `${min}–${max}${unit}`;
  if (min !== undefined) return `≥ ${min}${unit}`;
  if (max !== undefined) return `≤ ${max}${unit}`;
  return undefined;
}
