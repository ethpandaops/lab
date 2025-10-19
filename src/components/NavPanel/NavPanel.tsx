import { type JSX } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { NetworkSelector } from '@/components/NetworkSelector';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { NavLinks } from '@/components/NavLinks';
import { NetworkSummary } from '@/components/NetworkSummary';
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
    <Transition show={isOpen}>
      <Dialog onClose={onClose} className="relative z-50 lg:hidden">
        {/* Backdrop */}
        <TransitionChild
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <DialogBackdrop className="fixed top-[64px] right-0 bottom-0 left-0 bg-black/50" />
        </TransitionChild>

        {/* Panel */}
        <TransitionChild
          enter="transition ease-in-out duration-300"
          enterFrom="-translate-x-full"
          enterTo="translate-x-0"
          leave="transition ease-in-out duration-300"
          leaveFrom="translate-x-0"
          leaveTo="-translate-x-full"
        >
          <DialogPanel className="fixed top-[64px] left-0 flex h-[calc(100%-64px)] w-72 flex-col bg-slate-800 shadow-xl">
            {/* Content area */}
            <div className="flex flex-1 flex-col overflow-y-auto">
              {/* Network Selector */}
              {showNetworkSelector && (
                <div className="border-b border-slate-700/30 px-4 py-4">
                  <NetworkSelector showLabel={false} />
                </div>
              )}

              {/* Breadcrumbs */}
              {showBreadcrumbs && (
                <div className="border-b border-slate-700/30 px-4 py-4">
                  <Breadcrumbs />
                </div>
              )}

              {/* Navigation Links */}
              {showNavLinks && (
                <div className="flex-1 border-b border-slate-700/30 px-4 py-4">
                  <NavLinks orientation="vertical" />
                </div>
              )}

              {/* Network Summary at bottom */}
              {showNetworkSummary && (
                <div className="mt-auto">
                  <NetworkSummary />
                </div>
              )}
            </div>
          </DialogPanel>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}
