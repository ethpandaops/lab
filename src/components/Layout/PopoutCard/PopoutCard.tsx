import { type JSX, useState } from 'react';
import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import { Card } from '@/components/Layout/Card';
import { Dialog } from '@/components/Overlays/Dialog';
import type { PopoutCardProps } from './PopoutCard.types';

/**
 * PopoutCard - A card component with a clickable header that opens content in a larger modal
 *
 * Displays content in a compact card view with the ability to "pop out" into a full-size modal
 * for better viewing. This is a generic component for any content that benefits from
 * "expand to view larger" functionality.
 *
 * Features:
 * - Clickable header with hover effects
 * - Title with optional subtitle
 * - Icon indicator for expandability
 * - Content renders in both card and modal
 * - Configurable modal size
 * - Aspect ratio support for consistent sizing
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
 * // Custom aspect ratio
 * <PopoutCard
 *   title="Square Chart"
 *   aspectRatio="1/1"
 * >
 *   <MyChart height="100%" />
 * </PopoutCard>
 * ```
 */
export function PopoutCard({ title, subtitle, children, modalSize = 'xl', className }: PopoutCardProps): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Determine if children is a render function or static content
  const isRenderFunction = typeof children === 'function';

  // Render content based on whether it's in modal or card
  const cardContent = isRenderFunction ? children({ inModal: false }) : children;
  const modalContent = isRenderFunction ? children({ inModal: true }) : children;

  return (
    <>
      <Card
        className={className}
        header={
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="group flex w-full cursor-pointer items-center justify-between gap-4 text-left transition-colors hover:bg-muted/20"
            aria-label={`Open ${title} in modal`}
          >
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="truncate text-lg/7 font-semibold text-foreground dark:text-foreground">{title}</h3>
              {subtitle && <p className="text-sm text-muted dark:text-muted">{subtitle}</p>}
            </div>
            <ArrowsPointingOutIcon className="mt-0.5 size-5 shrink-0 text-muted transition-colors group-hover:text-foreground dark:text-muted dark:group-hover:text-foreground" />
          </button>
        }
        rounded
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
