/**
 * Get color intensity classes based on count relative to max value
 * Used for visual heat mapping in timeline and pairing matrices
 *
 * @param count - The current count value
 * @param maxCount - The maximum count value for normalization
 * @returns Tailwind CSS classes for background, text, and border colors
 */
export function getIntensity(count: number, maxCount: number): string {
  if (count === 0) return 'bg-background border-border text-muted';
  const ratio = count / maxCount;
  if (ratio >= 0.8) return 'bg-primary/90 text-white border-primary';
  if (ratio >= 0.6) return 'bg-primary/70 text-white border-primary';
  if (ratio >= 0.4) return 'bg-primary/50 text-foreground border-primary';
  if (ratio >= 0.2) return 'bg-primary/30 text-foreground border-primary';
  return 'bg-primary/10 text-foreground border-primary';
}
