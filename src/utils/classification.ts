/**
 * Classification utilities for contributor nodes
 *
 * Provides shared helper functions for classifying and styling contributor nodes
 * across different pages (contributors list, geographical checklist, etc.)
 */

/**
 * Get the raw Tailwind badge color classes based on contributor classification
 * Uses semantic theme colors with dark mode support for custom badge styling
 *
 * @param classification - The classification type ('individual', 'corporate', 'internal', etc.)
 * @returns Tailwind classes for badge styling
 */
export function getClassificationBadgeClasses(classification: string): string {
  switch (classification) {
    case 'individual':
      return 'bg-primary/10 text-primary inset-ring-primary/20 dark:bg-primary/10 dark:text-primary dark:inset-ring-primary/10';
    case 'corporate':
      return 'bg-purple-500/10 text-purple-600 inset-ring-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400 dark:inset-ring-purple-500/10';
    case 'internal':
      return 'bg-success/10 text-success inset-ring-success/20 dark:bg-success/10 dark:text-success dark:inset-ring-success/10';
    default:
      return 'bg-muted/10 text-muted inset-ring-muted/20 dark:bg-muted/10 dark:text-muted dark:inset-ring-muted/10';
  }
}

/**
 * Get the display label for a contributor classification
 *
 * @param classification - The classification type
 * @returns Human-readable label
 */
export function getClassificationLabel(classification: string): string {
  switch (classification) {
    case 'individual':
      return 'Individual';
    case 'corporate':
      return 'Corporate';
    case 'internal':
      return 'Internal (ethPandaOps)';
    default:
      return 'Unclassified';
  }
}
