import { type ReactNode } from 'react';

export interface TimelineItem {
  /**
   * Unique identifier for the item
   */
  id: string;

  /**
   * Timestamp in milliseconds when this item occurred
   */
  timestamp: number;

  /**
   * Content to render for this item
   */
  content: ReactNode;

  /**
   * Optional icon element to show before the content
   */
  icon?: ReactNode;

  /**
   * Optional status to determine styling
   * - 'active': Currently happening (highlighted)
   * - 'completed': Already happened (normal styling)
   * - 'pending': Not yet happened (dimmed)
   */
  status?: 'active' | 'completed' | 'pending';
}

export interface ScrollingTimelineProps {
  /**
   * Array of timeline items to display
   */
  items: TimelineItem[];

  /**
   * Current time in milliseconds for auto-scrolling
   */
  currentTime: number;

  /**
   * Optional className for custom styling
   */
  className?: string;

  /**
   * Height of the container (default: '500px')
   */
  height?: string;

  /**
   * Whether scrolling is enabled (default: true)
   */
  autoScroll?: boolean;

  /**
   * Format function for the timestamp display
   * @param timestamp - The timestamp in milliseconds
   * @returns Formatted string to display
   */
  formatTime?: (timestamp: number) => string;
}
