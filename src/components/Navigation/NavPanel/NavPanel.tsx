import { type JSX } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { NetworkSelector } from '@/components/Network/NetworkSelector';
import { Breadcrumbs } from '@/components/Navigation/Breadcrumbs';
import { NavLinks } from '@/components/Navigation/NavLinks';
import { NetworkSummary } from '@/components/Network/NetworkSummary';
import { type NavPanelProps } from './NavPanel.types';

/**
 * Mobile navigation panel component.
 *
 * A slide-over panel that displays on mobile devices, containing:
 * - Network selector at the top
 * - Breadcrumbs navigation
 * - Navigation links (vertical layout)
 * - Network summary at the bottom
 *
 * Features:
 * - Slides in from the left
 * - Backdrop overlay positioned below header
 * - Close on backdrop click
 * - Keyboard accessible (ESC to close)
 * - Smooth transitions
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * <NavPanel
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 * />
 * ```
 */
export function NavPanel({
  isOpen,
  onClose,
  showNetworkSelector = false,
  showBreadcrumbs = true,
  showNavLinks = true,
  showNetworkSummary = false,
}: NavPanelProps): JSX.Element {
  return (
    <Dialog open={isOpen} onClose={onClose} transition className="relative z-50 lg:hidden">
      {/* Backdrop */}
      <DialogBackdrop
        transition
        className="fixed top-[64px] right-0 bottom-0 left-0 bg-black/50 transition duration-300 ease-out data-[closed]:opacity-0"
      />

      {/* Panel */}
      <DialogPanel
        transition
        className="bg-nav fixed top-[64px] left-0 flex h-[calc(100%-64px)] w-72 flex-col shadow-xl transition duration-300 ease-in-out data-[closed]:-translate-x-full"
      >
        {/* Content area */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Network Selector */}
          {showNetworkSelector && (
            <div className="border-subtle border-b px-4 py-4">
              <NetworkSelector showLabel={false} />
            </div>
          )}

          {/* Breadcrumbs */}
          {showBreadcrumbs && (
            <div className="border-subtle border-b px-4 py-4">
              <Breadcrumbs />
            </div>
          )}

          {/* Navigation Links */}
          {showNavLinks && (
            <div className="border-subtle flex-1 border-b px-4 py-4">
              <NavLinks orientation="vertical" />
            </div>
          )}

          {/* Network Summary at bottom */}
          {showNetworkSummary && (
            <div className="mt-auto">
              <NetworkSummary orientation="vertical" />
            </div>
          )}
        </div>
      </DialogPanel>
    </Dialog>
  );
}
