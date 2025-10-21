/**
 * Format node names for display by removing redundant prefixes
 *
 * Rules:
 * - If starts with 'corp-' or 'pub-': remove first token (split by '/')
 *   Example: corp-noasn-city/sparingparsley27/hashed-26181929 → sparingparsley27/hashed-26181929
 *
 * - If starts with 'ethpandaops': remove middle token (split by '/')
 *   Example: ethpandaops/hoodi/utility-hoodi-lighthouse-erigon-001 → ethpandaops/utility-hoodi-lighthouse-erigon-001
 *
 * - Otherwise: return as-is
 */
export function formatNodeName(nodeName: string): string {
  const parts = nodeName.split('/');

  // Handle corp- and pub- prefixes
  if (nodeName.startsWith('corp-') || nodeName.startsWith('pub-')) {
    // Remove first token, keep rest
    return parts.slice(1).join('/');
  }

  // Handle ethpandaops prefix
  if (nodeName.startsWith('ethpandaops')) {
    // Remove middle token (index 1), keep first and rest
    if (parts.length >= 3) {
      return [parts[0], ...parts.slice(2)].join('/');
    }
  }

  // Return as-is if no special formatting needed
  return nodeName;
}
