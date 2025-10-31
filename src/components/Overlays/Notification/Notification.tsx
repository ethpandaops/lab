import { type JSX, Fragment, useEffect } from 'react';
import { Transition } from '@headlessui/react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { NotificationProps, NotificationPosition, NotificationVariant } from './Notification.types';

/**
 * Get position classes for notification placement
 */
const getPositionClasses = (position: NotificationPosition): string => {
  const positions: Record<NotificationPosition, string> = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
  };
  return positions[position];
};

/**
 * Get icon component for notification variant
 */
const getVariantIcon = (variant: NotificationVariant): typeof InformationCircleIcon => {
  const icons: Record<NotificationVariant, typeof InformationCircleIcon> = {
    info: InformationCircleIcon,
    success: CheckCircleIcon,
    warning: ExclamationTriangleIcon,
    danger: XCircleIcon,
  };
  return icons[variant];
};

/**
 * Get color classes for notification variant
 */
const getVariantClasses = (variant: NotificationVariant): string => {
  const variants: Record<NotificationVariant, string> = {
    info: 'bg-surface text-foreground border-border',
    success: 'bg-success text-white border-success',
    warning: 'bg-warning text-white border-warning',
    danger: 'bg-danger text-white border-danger',
  };
  return variants[variant];
};

/**
 * Notification component for brief, auto-dismissing messages
 *
 * A lightweight toast-style notification that appears at a configurable position
 * on the screen and automatically dismisses after a specified duration.
 *
 * Features:
 * - Auto-dismiss with configurable duration
 * - Multiple position options (corners and edges)
 * - Multiple variants (info, success, warning, danger)
 * - Smooth slide and fade transitions
 * - Optional close button
 * - Dark mode support
 *
 * @example
 * ```tsx
 * const [showNotification, setShowNotification] = useState(false);
 *
 * const handleCopy = () => {
 *   navigator.clipboard.writeText('copied text');
 *   setShowNotification(true);
 * };
 *
 * <Notification
 *   open={showNotification}
 *   onClose={() => setShowNotification(false)}
 *   variant="success"
 *   position="top-center"
 *   duration={3000}
 * >
 *   Copied to clipboard!
 * </Notification>
 * ```
 */
export function Notification({
  open,
  onClose,
  children,
  position = 'top-center',
  variant = 'info',
  duration = 3000,
  showCloseButton = false,
  className = '',
}: NotificationProps): JSX.Element {
  const Icon = getVariantIcon(variant);

  // Auto-dismiss after duration
  useEffect(() => {
    if (open && duration && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [open, duration, onClose]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center">
      <Transition
        show={open}
        as={Fragment}
        enter="ease-out duration-300"
        enterFrom="opacity-0 translate-y-2"
        enterTo="opacity-100 translate-y-0"
        leave="ease-in duration-200"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-2"
      >
        <div
          className={clsx(
            'pointer-events-auto fixed flex items-center gap-3 rounded-sm border px-4 py-3 shadow-lg',
            'dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-border',
            getPositionClasses(position),
            getVariantClasses(variant),
            className
          )}
          role="alert"
          aria-live="polite"
        >
          {/* Icon */}
          <Icon className="size-5 shrink-0" aria-hidden="true" />

          {/* Content */}
          <div className="text-sm leading-5 font-medium">{children}</div>

          {/* Close button */}
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-sm p-0.5 transition-opacity hover:opacity-70"
              aria-label="Close notification"
            >
              <XMarkIcon className="size-4" />
            </button>
          )}
        </div>
      </Transition>
    </div>
  );
}
