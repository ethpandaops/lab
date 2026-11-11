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
      return 'bg-primary-10 text-primary inset-ring-primary-halo';
    case 'corporate':
      return 'bg-contributor-corporate-bg text-contributor-corporate inset-ring-contributor-corporate-ring';
    case 'internal':
      return 'bg-contributor-internal-bg text-contributor-internal inset-ring-contributor-internal-ring';
    default:
      return 'bg-muted-10 text-muted inset-ring-muted-halo';
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

/**
 * Classification descriptions map with all known classifications
 */
export const CLASSIFICATION_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  individual: {
    label: 'Individual',
    description: 'Public contributors (likely home stakers)',
  },
  corporate: {
    label: 'Corporate',
    description: 'Public contributors (likely running in datacenters)',
  },
  internal: {
    label: 'Internal (ethPandaOps)',
    description: 'Xatu nodes run by the ethPandaOps team in datacenters',
  },
  unclassified: {
    label: 'Unclassified',
    description: 'Xatu nodes with unknown classification',
  },
};
