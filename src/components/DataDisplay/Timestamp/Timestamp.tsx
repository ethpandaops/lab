import { type JSX, useState } from 'react';
import clsx from 'clsx';
import { formatTimestamp, getRelativeTime } from '@/utils/time';
import { TimestampModal } from './TimestampModal';
import type { TimestampProps } from './Timestamp.types';

/**
 * Timestamp component with click-to-view-details modal
 *
 * A clickable timestamp component that displays time in various formats.
 * When clicked, opens a modal showing the timestamp in multiple formats:
 * - Local and UTC timestamps
 * - Unix timestamp
 * - Beacon chain slot and epoch
 * - Discord-style relative formats
 *
 * @example Basic usage with relative time
 * ```tsx
 * <Timestamp timestamp={Date.now() / 1000} />
 * // Displays: "2 minutes ago" (clickable)
 * ```
 *
 * @example Custom format
 * ```tsx
 * <Timestamp timestamp={Date.now() / 1000} format="long" />
 * // Displays: "Tuesday, April 20, 2021 4:20 PM" (clickable)
 * ```
 *
 * @example Custom rendering
 * ```tsx
 * <Timestamp timestamp={Date.now() / 1000} format="custom">
 *   {(ts) => `Custom: ${new Date(ts * 1000).toISOString()}`}
 * </Timestamp>
 * ```
 *
 * @example Disable modal
 * ```tsx
 * <Timestamp timestamp={Date.now() / 1000} disableModal />
 * // Displays time but is not clickable
 * ```
 */
export function Timestamp({
  timestamp,
  format = 'relative',
  children,
  className = '',
  disableModal = false,
}: TimestampProps): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Format the displayed timestamp
  const formattedTimestamp = (() => {
    if (format === 'custom') {
      if (typeof children === 'function') {
        return children(timestamp);
      }
      return children;
    }

    switch (format) {
      case 'relative':
        return getRelativeTime(timestamp);
      case 'short':
        return formatTimestamp(timestamp, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      case 'long':
        return formatTimestamp(timestamp, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      default:
        return getRelativeTime(timestamp);
    }
  })();

  const handleClick = (): void => {
    if (!disableModal) {
      setIsModalOpen(true);
    }
  };

  const handleClose = (): void => {
    setIsModalOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disableModal}
        className={clsx(
          'inline-flex items-center font-mono text-sm/5',
          !disableModal && 'cursor-pointer underline decoration-dotted underline-offset-4 hover:text-primary',
          disableModal && 'cursor-default',
          className
        )}
        aria-label={`View timestamp details: ${formattedTimestamp}`}
      >
        {formattedTimestamp}
      </button>

      {!disableModal && <TimestampModal open={isModalOpen} onClose={handleClose} timestamp={timestamp} />}
    </>
  );
}
