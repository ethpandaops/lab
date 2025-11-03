import { type JSX, useState, useRef, useMemo } from 'react';
import {
  ArrowsPointingOutIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { Card } from '@/components/Layout/Card';
import { Dialog } from '@/components/Overlays/Dialog';
import { ScrollAnchor } from '@/components/Navigation/ScrollAnchor';
import { Dropdown, DropdownSection, DropdownItem } from '@/components/Elements/Dropdown';
import { CopyToClipboard } from '@/components/Elements/CopyToClipboard';
import { NetworkIcon } from '@/components/Ethereum/NetworkIcon';
import { useChartDownload } from '@/hooks/useChartDownload';
import { useNetwork } from '@/hooks/useNetwork';
import type { PopoutCardProps } from './PopoutCard.types';

/**
 * PopoutCard - A card component with expand and download icons
 *
 * Displays content in a compact card view with the ability to "pop out" into a full-size modal
 * for better viewing, and download the entire card as an image with ethpandaops branding.
 *
 * Features:
 * - Expand icon button (opens content in modal)
 * - Download icon button (captures card as image with logo)
 * - Title with optional subtitle
 * - Hover effects on icons
 * - Content renders in both card and modal
 * - Configurable modal size
 * - Dark mode support
 * - Smart icon hiding during screenshot (replaces buttons with logo)
 *
 * @example
 * ```tsx
 * // Simple chart with title only
 * <PopoutCard title="Monthly Revenue">
 *   <BarChart data={monthlyData} labels={months} />
 * </PopoutCard>
 *
 * // Chart with subtitle and custom download filename
 * <PopoutCard
 *   title="Network Activity"
 *   subtitle="Last 24 hours"
 *   downloadFilename="network-activity-24h"
 * >
 *   <LineChart data={activityData} />
 * </PopoutCard>
 *
 * // Disable download if not needed
 * <PopoutCard
 *   title="Interactive Dashboard"
 *   enableDownload={false}
 * >
 *   <ComplexDashboard />
 * </PopoutCard>
 * ```
 */
export function PopoutCard({
  title,
  subtitle,
  modalSubtitle,
  modalDescription,
  modalDescriptionPosition = 'below',
  children,
  modalSize = 'xl',
  className,
  anchorId,
  allowContentOverflow = false,
  enableDownload = true,
  downloadFilename,
  appendMetadataToDownload = true,
  downloadMetadataTitle,
  downloadMetadataSubtitle,
  downloadMetadataNetwork,
}: PopoutCardProps): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [showModalLogo, setShowModalLogo] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const { downloadElement, getElementImageDataUrl } = useChartDownload();

  // useNetwork is optional - it may not be available in test environments or outside NetworkProvider
  let currentNetwork;
  try {
    const network = useNetwork();
    currentNetwork = network.currentNetwork;
  } catch {
    // NetworkProvider not available
    currentNetwork = undefined;
  }

  // Determine if children is a render function or static content
  const isRenderFunction = typeof children === 'function';

  // Render content based on whether it's in modal or card
  // Memoize to prevent re-creating React elements on every PopoutCard render
  const cardContent = useMemo(
    () => (isRenderFunction ? children({ inModal: false }) : children),
    [children, isRenderFunction]
  );
  const modalContent = useMemo(
    () => (isRenderFunction ? children({ inModal: true }) : children),
    [children, isRenderFunction]
  );

  // Title element (may be wrapped with ScrollAnchor)
  const titleElement = (
    <h3 className="truncate text-lg/7 font-semibold text-foreground dark:text-foreground">{title}</h3>
  );

  // Combine subtitle and modalSubtitle for modal description
  const modalDescriptionText = [subtitle, modalSubtitle].filter(Boolean).join(' • ');

  // Render modal description box
  const descriptionBox = modalDescription ? (
    <div className="rounded-sm bg-muted/10 px-4 py-3">
      <p className="text-sm text-foreground dark:text-foreground">{modalDescription}</p>
    </div>
  ) : null;

  // Metadata footer for downloads (only shown during screenshot capture)
  const metadataTitle = downloadMetadataTitle || document.title;
  const metadataSubtitle = downloadMetadataSubtitle || window.location.href;
  const metadataNetwork = downloadMetadataNetwork || currentNetwork?.display_name || '';
  const metadataFooter =
    appendMetadataToDownload && showMetadata ? (
      <div className="-mx-6 mt-4 -mb-5 grid grid-cols-12 gap-4 border-t border-border bg-muted/5 px-6 py-3">
        <div className="col-span-9 space-y-1">
          <p className="text-xs font-medium text-foreground">{metadataTitle}</p>
          <p className="text-xs text-muted">{metadataSubtitle}</p>
        </div>
        {metadataNetwork && (
          <div className="col-span-3 flex items-center justify-end">
            <div className="inline-flex items-center gap-2 rounded-sm bg-muted/10 px-3 py-1.5">
              <NetworkIcon networkName={currentNetwork?.name || 'mainnet'} className="size-3.5" />
              <p className="text-xs leading-none font-medium text-foreground">{metadataNetwork}</p>
            </div>
          </div>
        )}
      </div>
    ) : null;

  /**
   * Handle download with smart icon hiding and logo injection
   */
  const handleDownload = async (): Promise<void> => {
    // Use modal content if modal is open, otherwise use card
    const element = isModalOpen ? modalContentRef.current : cardRef.current;
    if (!element || isDownloading) {
      return;
    }

    setIsDownloading(true);

    try {
      // Step 1: Hide icons, show logo, and show metadata footer
      if (isModalOpen) {
        setShowModalLogo(true);
      } else {
        setShowLogo(true);
      }
      if (appendMetadataToDownload) {
        setShowMetadata(true);
      }

      // Wait for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 2: Capture the content with logo and metadata visible
      const filename = downloadFilename || title.toLowerCase().replace(/\s+/g, '-');

      await downloadElement(element, {
        filename,
        includeHeader: false,
        watermark: true,
        pixelRatio: 2,
      });
    } catch (error) {
      console.error('Failed to download chart:', error);
    } finally {
      // Step 3: Restore icons and hide metadata
      setShowModalLogo(false);
      setShowLogo(false);
      setShowMetadata(false);
      setIsDownloading(false);
    }
  };

  /**
   * Handle copy to clipboard with toast notification
   */
  const handleCopyToClipboard = async (): Promise<Blob> => {
    // Use modal content if modal is open, otherwise use card
    const element = isModalOpen ? modalContentRef.current : cardRef.current;
    if (!element) {
      throw new Error('Element not found');
    }

    if (isDownloading) {
      throw new Error('Download already in progress');
    }

    setIsDownloading(true);

    try {
      // Step 1: Hide icons, show logo, and show metadata footer
      if (isModalOpen) {
        setShowModalLogo(true);
      } else {
        setShowLogo(true);
      }
      if (appendMetadataToDownload) {
        setShowMetadata(true);
      }

      // Wait for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 2: Get image data URL
      const dataUrl = await getElementImageDataUrl(element, {
        includeHeader: false,
        watermark: true,
        pixelRatio: 2,
      });

      // Step 3: Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      return blob;
    } finally {
      // Step 4: Restore icons and hide metadata
      setShowModalLogo(false);
      setShowLogo(false);
      setShowMetadata(false);
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div ref={cardRef} className="h-full">
        <Card
          className={clsx('flex h-full flex-col', className)}
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

              {/* Action buttons - hidden during screenshot, replaced with logo */}
              {showLogo ? (
                <div className="shrink-0">
                  <img src="/images/ethpandaops.png" alt="ethPandaOps" className="h-10 w-auto" />
                </div>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  {enableDownload && (
                    <Dropdown
                      trigger={
                        <button
                          type="button"
                          disabled={isDownloading}
                          className="group rounded-sm p-1 transition-colors hover:bg-muted/20 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-primary/50 disabled:opacity-50"
                          aria-label="Export options"
                        >
                          <EllipsisVerticalIcon className="size-5 text-muted transition-colors group-hover:text-foreground dark:text-muted dark:group-hover:text-foreground" />
                        </button>
                      }
                      align="right"
                    >
                      <DropdownSection>
                        <DropdownItem icon={<ArrowDownTrayIcon className="size-5" />} onClick={handleDownload}>
                          Download
                        </DropdownItem>
                        <CopyToClipboard
                          content={handleCopyToClipboard}
                          successMessage="Copied to clipboard!"
                          errorMessage="Failed to copy image"
                        >
                          {({ onClick }) => (
                            <DropdownItem icon={<ClipboardDocumentIcon className="size-5" />} onClick={onClick}>
                              Copy to clipboard
                            </DropdownItem>
                          )}
                        </CopyToClipboard>
                      </DropdownSection>
                    </Dropdown>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="group rounded-sm p-1 transition-colors hover:bg-muted/20 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-primary/50"
                    aria-label={`Open ${title} in modal`}
                  >
                    <ArrowsPointingOutIcon className="size-5 text-muted transition-colors group-hover:text-foreground dark:text-muted dark:group-hover:text-foreground" />
                  </button>
                </div>
              )}
            </div>
          }
          rounded
          allowContentOverflow={allowContentOverflow}
        >
          {cardContent}
          {metadataFooter}
        </Card>
      </div>

      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        allowContentOverflow={true}
        panelRef={modalContentRef}
        hideCloseButton={showModalLogo}
        title={
          <div className="flex w-full items-center justify-between gap-4">
            <span className="truncate">{title}</span>
            {/* Show logo or dropdown in modal title */}
            {showModalLogo ? (
              <div className="shrink-0">
                <img src="/images/ethpandaops.png" alt="ethPandaOps" className="h-10 w-auto" />
              </div>
            ) : (
              enableDownload && (
                <Dropdown
                  trigger={
                    <button
                      type="button"
                      disabled={isDownloading}
                      className="group shrink-0 rounded-sm p-1 transition-colors hover:bg-muted/20 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-primary/50 disabled:opacity-50"
                      aria-label="Export options"
                    >
                      <EllipsisVerticalIcon className="size-5 text-muted transition-colors group-hover:text-foreground dark:text-muted dark:group-hover:text-foreground" />
                    </button>
                  }
                  align="right"
                >
                  <DropdownSection>
                    <DropdownItem icon={<ArrowDownTrayIcon className="size-5" />} onClick={handleDownload}>
                      Download
                    </DropdownItem>
                    <CopyToClipboard
                      content={handleCopyToClipboard}
                      successMessage="Copied to clipboard!"
                      errorMessage="Failed to copy image"
                    >
                      {({ onClick }) => (
                        <DropdownItem icon={<ClipboardDocumentIcon className="size-5" />} onClick={onClick}>
                          Copy to clipboard
                        </DropdownItem>
                      )}
                    </CopyToClipboard>
                  </DropdownSection>
                </Dropdown>
              )
            )}
          </div>
        }
        description={modalDescriptionText}
        size={modalSize}
      >
        {modalDescriptionPosition === 'above' && descriptionBox && <div className="mb-4">{descriptionBox}</div>}
        {modalContent}
        {modalDescriptionPosition === 'below' && descriptionBox && <div className="mt-4">{descriptionBox}</div>}
        {metadataFooter}
      </Dialog>
    </>
  );
}
