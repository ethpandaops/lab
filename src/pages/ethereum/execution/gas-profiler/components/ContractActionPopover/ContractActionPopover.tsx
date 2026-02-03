import { type JSX, useEffect, useRef, useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import { CircleStackIcon, FireIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ContractActionPopoverProps {
  /** Contract address */
  address: string;
  /** Contract name (optional) */
  contractName?: string | null;
  /** Gas consumed by this contract */
  gas: number;
  /** Percentage of total gas */
  percentage: number;
  /** Position of the popover */
  position: { x: number; y: number };
  /** Callback to close the popover */
  onClose: () => void;
  /** Callback when navigating to gas details */
  onViewGasDetails?: () => void;
  /** Transaction hash (for linking to call page) */
  txHash?: string;
  /** Block number for navigation context */
  blockNumber?: number;
  /** Call frame ID (for linking to specific call page) */
  callFrameId?: number;
}

/**
 * ContractActionPopover - A popover with options to view gas details or storage
 *
 * Used when clicking on treemap segments to provide navigation options.
 */
export function ContractActionPopover({
  address,
  contractName,
  gas,
  percentage,
  position,
  onClose,
  onViewGasDetails,
  txHash,
  blockNumber,
  callFrameId,
}: ContractActionPopoverProps): JSX.Element {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Close on Escape key
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedPosition = useCallback(() => {
    const popoverWidth = 240;
    const popoverHeight = 200;
    const padding = 16;

    let { x, y } = position;

    // Adjust if would overflow right
    if (x + popoverWidth > window.innerWidth - padding) {
      x = window.innerWidth - popoverWidth - padding;
    }

    // Adjust if would overflow bottom
    if (y + popoverHeight > window.innerHeight - padding) {
      y = y - popoverHeight - 10; // Show above instead
    }

    // Ensure not off left/top
    x = Math.max(padding, x);
    y = Math.max(padding, y);

    return { x, y };
  }, [position]);

  const { x, y } = adjustedPosition();
  const displayName = contractName || `${address.slice(0, 8)}...${address.slice(-6)}`;

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 w-60 overflow-hidden rounded-sm border border-border bg-background shadow-lg"
      style={{ left: x, top: y }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{displayName}</div>
          <div className="mt-0.5 font-mono text-xs text-muted">
            {gas.toLocaleString()} gas ({percentage.toFixed(1)}%)
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-2 rounded-sm p-1 text-muted transition-colors hover:bg-background hover:text-foreground"
        >
          <XMarkIcon className="size-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="p-2">
        {/* View Gas Details - link to call page if we have txHash and callFrameId */}
        {txHash && callFrameId !== undefined ? (
          <Link
            to="/ethereum/execution/gas-profiler/tx/$txHash/call/$callId"
            params={{ txHash, callId: String(callFrameId) }}
            search={blockNumber ? { block: blockNumber } : {}}
            className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface"
          >
            <FireIcon className="size-4 text-primary" />
            <span>View Gas Details</span>
          </Link>
        ) : txHash ? (
          <Link
            to="/ethereum/execution/gas-profiler/tx/$txHash"
            params={{ txHash }}
            search={blockNumber ? { block: blockNumber } : {}}
            onClick={onViewGasDetails}
            className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface"
          >
            <FireIcon className="size-4 text-primary" />
            <span>View Gas Details</span>
          </Link>
        ) : onViewGasDetails ? (
          <button
            onClick={() => {
              onViewGasDetails();
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface"
          >
            <FireIcon className="size-4 text-primary" />
            <span>View Gas Details</span>
          </button>
        ) : null}

        {/* View Storage */}
        <Link
          to="/ethereum/contracts/$address"
          params={{ address }}
          className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface"
        >
          <CircleStackIcon className="size-4 text-cyan-500" />
          <span>View Contract Storage</span>
        </Link>
      </div>
    </div>
  );
}
