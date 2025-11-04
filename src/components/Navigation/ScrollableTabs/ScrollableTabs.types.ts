import type { ReactNode } from 'react';

export interface ScrollableTabsProps {
  /**
   * The TabList children (Tab components)
   */
  children: ReactNode;

  /**
   * Additional CSS classes to apply to the container
   */
  className?: string;
}
