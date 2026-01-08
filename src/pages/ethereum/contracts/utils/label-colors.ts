import type { BadgeColor } from '@/components/Elements/Badge';

/**
 * Semantic color mappings for specific label categories.
 * Unknown labels fall back to gray.
 */
const SEMANTIC_COLORS: Record<string, BadgeColor> = {
  // Financial / Money
  stablecoin: 'green',
  lending: 'green',
  payments: 'green',

  // Trading / Exchange
  dex: 'blue',
  trading: 'blue',
  exchange: 'blue',
  amm: 'blue',

  // DeFi ecosystem
  defi: 'purple',
  yield: 'purple',
  vault: 'purple',

  // NFT / Gaming / Entertainment
  nft: 'pink',
  gaming: 'pink',
  collectibles: 'pink',
  gambling: 'pink',

  // Infrastructure / Technical
  bridge: 'yellow',
  oracle: 'yellow',
  layer2: 'yellow',
  'layer-2': 'yellow',
  l2: 'yellow',

  // Governance / Identity
  governance: 'indigo',
  dao: 'indigo',
  identity: 'indigo',
  ens: 'indigo',

  // Risk / Warning
  'high-risk': 'red',
  blocked: 'red',
  deprecated: 'red',

  // Generic / Infrastructure (gray)
  infrastructure: 'gray',
  developer_tools: 'gray',
};

/**
 * Get a consistent badge color for a label.
 * Uses semantic mappings for known categories, falls back to gray for unknown labels.
 *
 * @param label - The label text
 * @returns A BadgeColor based on semantic meaning, or gray for unknown labels
 */
export function getLabelColor(label: string): BadgeColor {
  const normalized = label.toLowerCase().trim().replace(/_/g, '-');

  // Check for exact semantic color mapping
  if (normalized in SEMANTIC_COLORS) {
    return SEMANTIC_COLORS[normalized];
  }

  // Check for partial matches (e.g., "fungible_tokens" contains "token")
  for (const [key, color] of Object.entries(SEMANTIC_COLORS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return color;
    }
  }

  // Unknown labels get gray
  return 'gray';
}
