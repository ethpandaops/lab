import { type JSX, useState, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Card } from '@/components/Layout/Card';

export interface BlockHeaderProps {
  /** Current block number being displayed */
  blockNumber: number;
  /** Number of transactions in the block */
  transactionCount: number;
  /** Total gas used in the block */
  totalGasUsed: number;
  /** Min available block from bounds */
  minBlock: number;
  /** Max available block from bounds */
  maxBlock: number;
  /** Callback when navigating to a different block */
  onBlockChange: (blockNumber: number) => void;
  /** Whether data is loading */
  isLoading?: boolean;
}

/**
 * Format gas value with comma separators
 */
function formatGas(value: number): string {
  return value.toLocaleString();
}

/**
 * Block header with navigation controls
 */
export function BlockHeader({
  blockNumber,
  transactionCount,
  totalGasUsed,
  minBlock,
  maxBlock,
  onBlockChange,
  isLoading = false,
}: BlockHeaderProps): JSX.Element {
  const [jumpInput, setJumpInput] = useState('');
  const [showJumpInput, setShowJumpInput] = useState(false);

  const canGoBack = blockNumber > minBlock;
  const canGoForward = blockNumber < maxBlock;

  const handlePrev = useCallback(() => {
    if (canGoBack) {
      onBlockChange(blockNumber - 1);
    }
  }, [blockNumber, canGoBack, onBlockChange]);

  const handleNext = useCallback(() => {
    if (canGoForward) {
      onBlockChange(blockNumber + 1);
    }
  }, [blockNumber, canGoForward, onBlockChange]);

  const handleJump = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const target = parseInt(jumpInput, 10);
      if (!isNaN(target) && target >= minBlock && target <= maxBlock) {
        onBlockChange(target);
        setJumpInput('');
        setShowJumpInput(false);
      }
    },
    [jumpInput, minBlock, maxBlock, onBlockChange]
  );

  const handleLatest = useCallback(() => {
    onBlockChange(maxBlock);
  }, [maxBlock, onBlockChange]);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Block Info */}
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-muted">Block</p>
            <p className="font-mono text-xl font-semibold text-foreground">{blockNumber.toLocaleString()}</p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <p className="text-xs text-muted">Transactions</p>
            <p className="text-lg font-medium text-foreground">{transactionCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Total Gas</p>
            <p className="text-lg font-medium text-foreground">{formatGas(totalGasUsed)}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          {/* Jump to block */}
          {showJumpInput ? (
            <form onSubmit={handleJump} className="flex items-center gap-2">
              <input
                type="text"
                value={jumpInput}
                onChange={e => setJumpInput(e.target.value)}
                placeholder="Block #"
                className="w-28 rounded-sm border border-border bg-surface px-2 py-1.5 text-sm text-foreground placeholder:text-muted focus:ring-2 focus:ring-primary/50 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="rounded-sm bg-primary px-2 py-1.5 text-sm text-white hover:bg-primary/90"
              >
                Go
              </button>
              <button
                type="button"
                onClick={() => setShowJumpInput(false)}
                className="rounded-sm px-2 py-1.5 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
              <button
                onClick={() => setShowJumpInput(true)}
                className="flex items-center gap-1 rounded-sm px-2 py-1.5 text-sm text-muted transition-colors hover:bg-surface hover:text-foreground"
                title="Jump to block"
              >
                <MagnifyingGlassIcon className="size-4" />
                <span className="hidden sm:inline">Jump</span>
              </button>

              <div className="h-6 w-px bg-border" />

              {/* Prev/Next */}
              <button
                onClick={handlePrev}
                disabled={!canGoBack || isLoading}
                className="rounded-sm p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                title="Previous block"
              >
                <ChevronLeftIcon className="size-5" />
              </button>

              <button
                onClick={handleNext}
                disabled={!canGoForward || isLoading}
                className="rounded-sm p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                title="Next block"
              >
                <ChevronRightIcon className="size-5" />
              </button>

              {/* Latest button */}
              {blockNumber < maxBlock && (
                <>
                  <div className="h-6 w-px bg-border" />
                  <button
                    onClick={handleLatest}
                    disabled={isLoading}
                    className="rounded-sm bg-primary/10 px-2 py-1.5 text-sm text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                  >
                    Latest
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Block range indicator */}
      <div className="mt-3 text-xs text-muted">
        Indexed blocks: {minBlock.toLocaleString()} – {maxBlock.toLocaleString()}
      </div>
    </Card>
  );
}
