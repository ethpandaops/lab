import type { ReactNode } from 'react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertAction {
  /**
   * The label for the action button
   */
  label: string;

  /**
   * Callback when the action is clicked
   */
  onClick: () => void;
}

export interface AlertProps {
  /**
   * The visual style variant of the alert
   * @default 'info'
   */
  variant?: AlertVariant;

  /**
   * Icon to display on the left
   * If not provided, a default icon will be shown based on variant
   */
  icon?: ReactNode;

  /**
   * The alert title
   */
  title?: string;

  /**
   * The alert description/message
   */
  description?: string | ReactNode;

  /**
   * List of items to display (for error lists)
   */
  items?: string[];

  /**
   * Action buttons to display
   */
  actions?: AlertAction[];

  /**
   * Link content for right-aligned link (uses TanStack Router Link)
   */
  link?: {
    label: string;
    to: string;
  };

  /**
   * Callback when dismiss button is clicked
   */
  onDismiss?: () => void;

  /**
   * Use accent border variant instead of full background
   * @default false
   */
  accentBorder?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}
