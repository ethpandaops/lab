import type { ReactNode } from 'react';

export interface TimestampProps {
  /**
   * Unix timestamp in seconds
   */
  timestamp: number;

  /**
   * Display format (default: 'relative')
   * - 'relative': Shows relative time (e.g., "2 minutes ago")
   * - 'short': Shows short date/time
   * - 'long': Shows long date/time
   * - 'custom': Use the `children` prop for custom formatting
   */
  format?: 'relative' | 'short' | 'long' | 'custom';

  /**
   * Custom render function or ReactNode
   * Used when format is 'custom'
   */
  children?: ReactNode | ((timestamp: number) => ReactNode);

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Disable the click-to-open modal behavior
   * @default false
   */
  disableModal?: boolean;
}

export interface TimestampModalContentProps {
  /**
   * Unix timestamp in seconds
   */
  timestamp: number;

  /**
   * Optional context to display as subtitle (e.g., "Slot 123456")
   */
  context?: string;
}
