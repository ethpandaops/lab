import type { ReactNode } from 'react';
import type { DialogSize } from '@/components/Overlays/Dialog';

export interface PopoutCardRenderProps {
  /**
   * Whether the content is being rendered in the modal (true) or card (false)
   */
  inModal: boolean;
}

export interface PopoutCardProps {
  /**
   * Main title - displayed in card header (single line, truncated if too long)
   */
  title: string;
  /**
   * Optional subtitle - creates a second row if provided
   */
  subtitle?: string;
  /**
   * Additional subtitle text shown only in the modal (not in card view).
   * Appears after the main subtitle in the modal's description area.
   */
  modalSubtitle?: string;
  /**
   * Descriptive text shown only in the modal body (not in card view).
   * Useful for providing additional context or explanation when viewing the expanded content.
   */
  modalDescription?: string;
  /**
   * Position of the modal description relative to the main content.
   * - 'above': Description appears before the content (use when context is critical)
   * - 'below': Description appears after the content (default - content is immediately visible)
   */
  modalDescriptionPosition?: 'above' | 'below';
  /**
   * Content to display in both card and modal.
   * Can be a ReactNode or a render function that receives { inModal: boolean }
   * to adjust sizing based on context.
   *
   * @example
   * ```tsx
   * // Static content (same size everywhere)
   * <PopoutCard title="Chart">
   *   <MyChart />
   * </PopoutCard>
   *
   * // Dynamic content (larger in modal)
   * <PopoutCard title="Chart">
   *   {({ inModal }) => (
   *     <div className={inModal ? "min-h-[600px]" : "h-72"}>
   *       <MyChart />
   *     </div>
   *   )}
   * </PopoutCard>
   * ```
   */
  children: ReactNode | ((props: PopoutCardRenderProps) => ReactNode);
  /**
   * Size of modal when opened (default: 'xl')
   */
  modalSize?: DialogSize;
  /**
   * Additional className for the card container
   */
  className?: string;
  /**
   * Optional anchor ID for deep linking to this card.
   * When provided, wraps the title with ScrollAnchor for URL-based navigation.
   */
  anchorId?: string;
  /**
   * Allow content to overflow card boundaries (useful for tooltips, dropdowns). Default: false
   */
  allowContentOverflow?: boolean;
  /**
   * Enable download functionality with built-in button. Default: true
   */
  enableDownload?: boolean;
  /**
   * Custom filename for downloaded image (without extension). Default: uses title
   */
  downloadFilename?: string;
  /**
   * Append metadata footer to downloaded images. Default: true
   * When true, adds a slim footer with title and subtitle to screenshots.
   */
  appendMetadataToDownload?: boolean;
  /**
   * Custom title for download metadata footer. Default: document.title
   * Only used when appendMetadataToDownload is true.
   */
  downloadMetadataTitle?: string;
  /**
   * Custom subtitle for download metadata footer. Default: window.location.href
   * Only used when appendMetadataToDownload is true.
   */
  downloadMetadataSubtitle?: string;
  /**
   * Custom network name for download metadata footer. Default: current network's display_name
   * Only used when appendMetadataToDownload is true.
   */
  downloadMetadataNetwork?: string;
}
