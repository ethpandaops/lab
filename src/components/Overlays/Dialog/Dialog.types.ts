import type { ReactNode, Ref } from 'react';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'fullscreen';

export interface DialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;
  /**
   * Callback when the dialog should close
   */
  onClose: () => void;
  /**
   * Dialog title
   */
  title?: ReactNode;
  /**
   * Dialog description
   */
  description?: ReactNode;
  /**
   * Dialog content
   */
  children: ReactNode;
  /**
   * Dialog size (default: 'md')
   */
  size?: DialogSize;
  /**
   * Whether to show the close button (default: true)
   */
  showCloseButton?: boolean;
  /**
   * Custom footer content (buttons, actions, etc.)
   */
  footer?: ReactNode;
  /**
   * Additional CSS classes for the dialog panel
   */
  className?: string;
  /**
   * Whether content should overflow (useful for dropdowns/selects) (default: false)
   */
  allowContentOverflow?: boolean;
  /**
   * Remove padding from dialog content area (useful for tables, full-width components). Default: false
   */
  noPadding?: boolean;
  /**
   * Ref to the dialog panel element (for screenshot capture)
   */
  panelRef?: Ref<HTMLDivElement>;
  /**
   * Hide the close button (used during screenshot capture)
   */
  hideCloseButton?: boolean;
}
