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
   * Main title - displayed as clickable header (single line, truncated if too long)
   */
  title: string;
  /**
   * Optional subtitle - creates a second row if provided
   */
  subtitle?: string;
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
   * CSS aspect ratio for content container (e.g., "16/9", "4/3", "1/1")
   * Default: "16/9"
   */
  aspectRatio?: string;
}
