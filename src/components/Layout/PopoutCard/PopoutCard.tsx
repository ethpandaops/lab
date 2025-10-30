import { type JSX, useState } from 'react';
import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import { Card } from '@/components/Layout/Card';
import { Dialog } from '@/components/Overlays/Dialog';
import { ScrollAnchor } from '@/components/Navigation/ScrollAnchor';
import type { PopoutCardProps } from './PopoutCard.types';

/**
 * PopoutCard - A card component with an expand icon that opens content in a larger modal
 *
 * Displays content in a compact card view with the ability to "pop out" into a full-size modal
 * for better viewing. This is a generic component for any content that benefits from
 * "expand to view larger" functionality.
 *
 * Features:
 * - Expand icon button (only clickable element for opening modal)
 * - Title with optional subtitle (not clickable)
 * - Hover effects on expand icon
 * - Content renders in both card and modal
 * - Configurable modal size
 * - Dark mode support
 *
 * @example
 * ```tsx
 * // Simple chart with title only
 * <PopoutCard title="Monthly Revenue">
 *   <BarChart data={monthlyData} labels={months} />
 * </PopoutCard>
 *
 * // Chart with subtitle
 * <PopoutCard
 *   title="Network Activity"
 *   subtitle="Last 24 hours"
 * >
 *   <LineChart data={activityData} />
 * </PopoutCard>
 *
 * // Full screen modal for complex content
 * <PopoutCard
 *   title="Detailed Analysis"
 *   modalSize="full"
 * >
 *   <ComplexDashboard />
 * </PopoutCard>
 *
 * ```
 */
export function PopoutCard({
  title,
  subtitle,
  children,
  modalSize = 'xl',
  className,
  anchorId,
  allowContentOverflow = false,
}: PopoutCardProps): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Determine if children is a render function or static content
  const isRenderFunction = typeof children === 'function';

  // Render content based on whether it's in modal or card
  const cardContent = isRenderFunction ? children({ inModal: false }) : children;
  const modalContent = isRenderFunction ? children({ inModal: true }) : children;

  // Title element (may be wrapped with ScrollAnchor)
  const titleElement = (
    <h3 className="truncate text-lg/7 font-semibold text-foreground dark:text-foreground">{title}</h3>
  );

  return (
    <>
      <Card
        className={className}
        header={
          <div className="flex w-full items-center justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              {anchorId ? (
                <ScrollAnchor id={anchorId} showLinkIcon={false}>
                  {titleElement}
                </ScrollAnchor>
              ) : (
                titleElement
              )}
              {subtitle && <p className="text-sm text-muted dark:text-muted">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="group shrink-0 rounded-sm p-1 transition-colors hover:bg-muted/20 focus:ring-3 focus:ring-primary/50 focus:outline-hidden"
              aria-label={`Open ${title} in modal`}
            >
              <ArrowsPointingOutIcon className="size-5 text-muted transition-colors group-hover:text-foreground dark:text-muted dark:group-hover:text-foreground" />
            </button>
          </div>
        }
        rounded
        allowContentOverflow={allowContentOverflow}
      >
        {cardContent}
      </Card>

      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={title}
        description={subtitle}
        size={modalSize}
      >
        {modalContent}
      </Dialog>
    </>
  );
}
