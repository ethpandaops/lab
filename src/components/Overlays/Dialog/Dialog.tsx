import { type JSX, Fragment } from 'react';
import {
  Dialog as HeadlessDialog,
  DialogPanel,
  DialogTitle,
  Description,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { DialogProps } from './Dialog.types';

const sizeClasses = {
  sm: 'w-full max-w-96', // 384px - 24rem, constrained by viewport
  md: 'w-full max-w-[28rem]', // 448px
  lg: 'w-full max-w-[32rem]', // 512px
  xl: 'w-full max-w-[56rem]', // 896px (increased from 672px for wider aspect ratio)
  full: 'w-full max-w-[80rem]', // 1280px
  fullscreen: 'w-[90vw] max-h-[90vh]', // 90% of viewport
};

/**
 * Dialog component built on Headless UI's Dialog
 *
 * A modal dialog that overlays the page content with a backdrop.
 * Supports different sizes, optional title/description, and custom footer.
 *
 * Features:
 * - Backdrop with blur effect
 * - Smooth transitions
 * - Keyboard support (Esc to close)
 * - Focus trap
 * - Multiple sizes
 * - Optional close button
 * - Custom footer
 * - Dark mode support
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * <Dialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Delete account"
 *   description="Are you sure you want to delete your account?"
 *   footer={
 *     <>
 *       <Button variant="secondary" onClick={() => setIsOpen(false)}>
 *         Cancel
 *       </Button>
 *       <Button variant="danger" onClick={handleDelete}>
 *         Delete
 *       </Button>
 *     </>
 *   }
 * >
 *   <p>This action cannot be undone.</p>
 * </Dialog>
 * ```
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  footer,
  className = '',
  allowContentOverflow = false,
  noPadding = false,
  panelRef,
  hideCloseButton = false,
}: DialogProps): JSX.Element {
  return (
    <Transition show={open} as={Fragment}>
      <HeadlessDialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm dark:bg-black/50" aria-hidden="true" />
        </TransitionChild>

        {/* Dialog container */}
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <DialogPanel
              ref={panelRef}
              className={clsx(
                'divide-y divide-border rounded-sm bg-surface shadow-xl dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-border',
                size === 'fullscreen' && 'flex flex-col overflow-auto',
                allowContentOverflow && size !== 'fullscreen' ? 'overflow-visible' : undefined,
                !allowContentOverflow && size !== 'fullscreen' ? 'overflow-hidden' : undefined,
                sizeClasses[size],
                className
              )}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {title && (
                      <DialogTitle className="text-lg leading-6 font-semibold text-foreground dark:text-foreground">
                        {title}
                      </DialogTitle>
                    )}
                    {description && (
                      <Description className="text-sm leading-5 text-muted dark:text-muted">{description}</Description>
                    )}
                  </div>
                  {showCloseButton && !hideCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="shrink-0 rounded-sm p-1.5 text-muted transition-colors hover:bg-border hover:text-foreground dark:hover:bg-muted/20 dark:hover:text-foreground"
                      aria-label="Close dialog"
                    >
                      <XMarkIcon className="size-5" />
                    </button>
                  )}
                </div>
              )}

              {/* Content */}
              <div
                className={clsx(
                  noPadding ? 'p-0' : 'px-4 py-4 sm:px-6 sm:py-5',
                  size === 'fullscreen' && 'flex-1 overflow-auto',
                  size !== 'fullscreen' && 'max-h-[calc(100dvh-10rem)] overflow-y-auto'
                )}
              >
                {!title && !showCloseButton && description && (
                  <Description className="mb-4 text-sm text-muted dark:text-muted">{description}</Description>
                )}
                {children}
              </div>

              {/* Footer */}
              {footer && <div className="flex items-center justify-end gap-3 px-6 py-4">{footer}</div>}
            </DialogPanel>
          </TransitionChild>
        </div>
      </HeadlessDialog>
    </Transition>
  );
}
