import type { ReactNode } from 'react';

export type BadgeColor = 'gray' | 'red' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple' | 'pink';

export type BadgeVariant = 'border' | 'flat';

export type BadgeSize = 'default' | 'small';

export interface BadgeProps {
  /**
   * Content to display in the badge
   */
  children: ReactNode;
  /**
   * Color of the badge
   * @default 'gray'
   */
  color?: BadgeColor;
  /**
   * Visual style variant
   * @default 'border'
   */
  variant?: BadgeVariant;
  /**
   * Size of the badge
   * @default 'default'
   */
  size?: BadgeSize;
  /**
   * Whether to use pill shape (fully rounded)
   * @default false
   */
  pill?: boolean;
  /**
   * Whether to show a colored dot indicator
   * @default false
   */
  dot?: boolean;
  /**
   * Callback when remove button is clicked. Shows remove button when provided.
   */
  onRemove?: () => void;
  /**
   * Whether to truncate text with ellipsis
   * @default false
   */
  truncate?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}
