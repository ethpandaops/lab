import type { ReactNode } from 'react';

/**
 * A single item in the card chain
 */
export interface CardChainItem {
  /** Unique identifier for the item */
  id: string | number;
  /** Label displayed above the main value (e.g., "BLOCK", "EPOCH") */
  label: string;
  /** Main value displayed prominently (e.g., block number) */
  value: string | number;
  /** Optional stats displayed below the main value */
  stats?: Array<{ label: string; value: string | number }>;
  /** Fill percentage for background visualization (0-100) */
  fillPercentage?: number;
  /** Whether this item should be highlighted (e.g., "latest") */
  isHighlighted?: boolean;
}

/**
 * Props for the CardChain component
 */
export interface CardChainProps {
  /** Array of items to display in the chain */
  items: CardChainItem[];
  /** Badge text for highlighted items (default: "LATEST") */
  highlightBadgeText?: string;
  /** Custom wrapper for each item (for links, tooltips, etc.) */
  renderItemWrapper?: (item: CardChainItem, index: number, children: ReactNode) => ReactNode;
  /** Callback when "load previous" arrow is clicked */
  onLoadPrevious?: () => void;
  /** Callback when "load next" arrow is clicked */
  onLoadNext?: () => void;
  /** Whether there are previous items to load */
  hasPreviousItems?: boolean;
  /** Whether there are next items to load */
  hasNextItems?: boolean;
  /** Loading state - shows skeleton items */
  isLoading?: boolean;
  /** Number of skeleton items to show when loading (default: 6) */
  skeletonCount?: number;
  /** Additional CSS class for the container */
  className?: string;
}
