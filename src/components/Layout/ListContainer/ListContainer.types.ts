import type { ReactNode } from 'react';

export type ListContainerVariant = 'simple' | 'card' | 'flat' | 'separate';

export interface ListContainerProps {
  /**
   * The list items to render
   */
  children?: ReactNode;

  /**
   * The variant style of the list container
   * @default 'simple'
   */
  variant?: ListContainerVariant;

  /**
   * Whether to display full-width on mobile devices (removes rounded corners and adjusts padding)
   * @default false
   */
  fullWidthOnMobile?: boolean;

  /**
   * Whether to use compact spacing (reduces padding between items)
   * @default false
   */
  compact?: boolean;

  /**
   * Whether to show dividers between list items
   * Note: Does not apply to 'separate' variant
   * @default true
   */
  withDividers?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * The HTML element to render as the list container
   * @default 'ul'
   */
  as?: 'ul' | 'ol' | 'div';
}

export interface ListItemProps {
  /**
   * The content of the list item
   */
  children: ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Click handler for interactive items
   */
  onClick?: () => void;
}
