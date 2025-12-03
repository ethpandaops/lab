import type { ReactNode } from 'react';

export interface InfoBoxProps {
  /**
   * The content to display inside the info box
   */
  children: ReactNode;

  /**
   * Optional icon to display in the top-left corner
   * If not provided, a default information icon will be shown
   */
  icon?: ReactNode;

  /**
   * Whether to hide the icon
   * @default false
   */
  hideIcon?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}
