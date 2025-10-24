import type { ReactNode } from 'react';

/**
 * Props for the ItemNavigation component
 */
export interface ItemNavigationProps {
  /**
   * The current item number or identifier
   */
  currentItem: number | string;

  /**
   * Label for the item type (e.g., "Slot", "Block", "Page")
   */
  itemLabel: string;

  /**
   * Whether there is a next item available
   */
  hasNext: boolean;

  /**
   * Whether there is a previous item available
   */
  hasPrevious: boolean;

  /**
   * Callback when the next button is clicked
   */
  onNext: () => void;

  /**
   * Callback when the previous button is clicked
   */
  onPrevious: () => void;

  /**
   * Callback when jumping to a specific item
   * @param item - The item to jump to
   */
  onJumpTo?: (item: number | string) => void;

  /**
   * Whether to show the jump to input field
   * @default true
   */
  showJumpTo?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Loading state - disables all interactions
   * @default false
   */
  loading?: boolean;

  /**
   * Optional leading icon or content
   */
  leadingContent?: ReactNode;

  /**
   * Optional trailing icon or content
   */
  trailingContent?: ReactNode;
}
