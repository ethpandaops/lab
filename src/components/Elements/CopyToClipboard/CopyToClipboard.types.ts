import type { ReactNode } from 'react';

export interface CopyToClipboardRenderProps {
  /**
   * Click handler to trigger the copy action
   */
  onClick: () => void;
}

export interface CopyToClipboardProps {
  /**
   * Content to copy to clipboard.
   * Can be:
   * - string: Plain text to copy
   * - Blob: Binary data (e.g., image) to copy
   * - () => Promise<string | Blob>: Async function that prepares and returns content
   */
  content: string | Blob | (() => Promise<string | Blob>);
  /**
   * Optional custom success message shown in toast notification.
   * Default: "Copied to clipboard!"
   */
  successMessage?: string;
  /**
   * Optional custom error message shown in toast notification.
   * Default: "Failed to copy to clipboard"
   */
  errorMessage?: string;
  /**
   * Optional custom children to render as the trigger.
   * Can be:
   * - ReactNode: Static children (wrapped in a clickable div)
   * - (props: CopyToClipboardRenderProps) => ReactNode: Render function that receives onClick handler
   * If not provided, defaults to a clipboard icon button.
   */
  children?: ReactNode | ((props: CopyToClipboardRenderProps) => ReactNode);
  /**
   * Optional className for the trigger button (only applies to default icon button)
   */
  className?: string;
  /**
   * Optional aria-label for the trigger button
   * Default: "Copy to clipboard"
   */
  ariaLabel?: string;
  /**
   * Optional callback when copy succeeds
   */
  onSuccess?: () => void;
  /**
   * Optional callback when copy fails
   */
  onError?: (error: Error) => void;
  /**
   * Disabled state for the button
   * Default: false
   */
  disabled?: boolean;
}
