import type { ReactNode } from 'react';

export interface TabProps {
  /**
   * Tab content
   */
  children: ReactNode;

  /**
   * Optional badge content (e.g., count, label)
   */
  badge?: ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Optional URL hash to set when tab is selected (e.g., "slots" for #slots)
   */
  hash?: string;
}
