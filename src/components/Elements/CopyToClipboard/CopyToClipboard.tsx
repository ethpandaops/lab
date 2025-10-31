import { type JSX, useState } from 'react';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { Notification } from '@/components/Overlays/Notification';
import type { CopyToClipboardProps } from './CopyToClipboard.types';

/**
 * CopyToClipboard - A button component that copies content to clipboard
 *
 * Copies text or binary data (like images) to the system clipboard and shows
 * a success toast notification. Supports synchronous content (string/Blob) or
 * async content preparation (useful for generating images dynamically).
 *
 * Features:
 * - Copy text or binary data (images, etc.)
 * - Async content preparation support
 * - Success/error toast notifications
 * - Default clipboard icon or custom trigger
 * - Customizable success/error messages
 * - Disabled state support
 * - Dark mode support
 * - Optional callbacks for success/error
 *
 * @example
 * ```tsx
 * // Simple text copy with default icon
 * <CopyToClipboard content="Hello World" />
 *
 * // Image copy (Blob) with custom message
 * <CopyToClipboard
 *   content={imageBlob}
 *   successMessage="Image copied!"
 * />
 *
 * // Async content preparation (e.g., capture element to image)
 * <CopyToClipboard
 *   content={async () => {
 *     const blob = await captureElementToBlob(element);
 *     return blob;
 *   }}
 *   successMessage="Image copied!"
 * />
 *
 * // Custom trigger button
 * <CopyToClipboard content="Copy me">
 *   <button className="btn-primary">
 *     Copy Text
 *   </button>
 * </CopyToClipboard>
 *
 * // With callbacks
 * <CopyToClipboard
 *   content="Hello"
 *   onSuccess={() => console.log('Copied!')}
 *   onError={(err) => console.error('Failed:', err)}
 * />
 * ```
 */
export function CopyToClipboard({
  content,
  successMessage = 'Copied to clipboard!',
  errorMessage = 'Failed to copy to clipboard',
  children,
  className = '',
  ariaLabel = 'Copy to clipboard',
  onSuccess,
  onError,
  disabled = false,
}: CopyToClipboardProps): JSX.Element {
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);

  /**
   * Handle copy to clipboard
   */
  const handleCopy = async (): Promise<void> => {
    if (disabled) {
      return;
    }

    try {
      // Resolve content if it's a function
      let resolvedContent: string | Blob;
      if (typeof content === 'function') {
        resolvedContent = await content();
      } else {
        resolvedContent = content;
      }

      // Copy to clipboard based on content type
      if (typeof resolvedContent === 'string') {
        // Copy plain text
        await navigator.clipboard.writeText(resolvedContent);
      } else {
        // Copy blob (e.g., image)
        await navigator.clipboard.write([
          new ClipboardItem({
            [resolvedContent.type]: resolvedContent,
          }),
        ]);
      }

      // Show success notification
      setShowSuccessNotification(true);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);

      // Show error notification
      setShowErrorNotification(true);

      // Call error callback if provided
      if (onError) {
        onError(error as Error);
      }
    }
  };

  // Determine if children is a render function
  const isRenderFunction = typeof children === 'function';

  return (
    <>
      {children ? (
        isRenderFunction ? (
          // Render function pattern - pass onClick handler
          <>{children({ onClick: handleCopy })}</>
        ) : (
          // Static children - wrap with clickable div
          <div onClick={handleCopy}>{children}</div>
        )
      ) : (
        // Default clipboard icon button
        <button
          type="button"
          onClick={handleCopy}
          disabled={disabled}
          className={`group rounded-sm p-1 transition-colors hover:bg-muted/20 focus:ring-3 focus:ring-primary/50 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          aria-label={ariaLabel}
        >
          <ClipboardDocumentIcon className="size-5 text-muted transition-colors group-hover:text-foreground dark:text-muted dark:group-hover:text-foreground" />
        </button>
      )}

      {/* Success notification */}
      <Notification
        open={showSuccessNotification}
        onClose={() => setShowSuccessNotification(false)}
        variant="success"
        position="top-center"
        duration={3000}
      >
        {successMessage}
      </Notification>

      {/* Error notification */}
      <Notification
        open={showErrorNotification}
        onClose={() => setShowErrorNotification(false)}
        variant="danger"
        position="top-center"
        duration={3000}
      >
        {errorMessage}
      </Notification>
    </>
  );
}
