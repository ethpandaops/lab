import { type JSX, useState, useCallback } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export interface TransactionSearchInputProps {
  /** Current transaction hash value */
  txHash: string;
  /** Current block number value */
  blockNumber: string;
  /** Callback when search is submitted */
  onSearch: (txHash: string, blockNumber: number) => void;
  /** Callback when input is cleared */
  onClear: () => void;
  /** Whether data is currently loading */
  isLoading?: boolean;
}

/**
 * Validates an Ethereum transaction hash
 */
function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Transaction hash search input with validation
 */
export function TransactionSearchInput({
  txHash,
  blockNumber,
  onSearch,
  onClear,
  isLoading = false,
}: TransactionSearchInputProps): JSX.Element {
  const [txHashInput, setTxHashInput] = useState(txHash);
  const [blockNumberInput, setBlockNumberInput] = useState(blockNumber);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedHash = txHashInput.trim();
      const trimmedBlock = blockNumberInput.trim();

      if (!trimmedHash) {
        setError('Please enter a transaction hash');
        return;
      }

      if (!isValidTxHash(trimmedHash)) {
        setError('Invalid transaction hash format. Must be 0x followed by 64 hex characters.');
        return;
      }

      if (!trimmedBlock) {
        setError('Please enter a block number');
        return;
      }

      const blockNum = parseInt(trimmedBlock, 10);
      if (isNaN(blockNum) || blockNum < 0) {
        setError('Invalid block number. Must be a positive integer.');
        return;
      }

      setError(null);
      onSearch(trimmedHash, blockNum);
    },
    [txHashInput, blockNumberInput, onSearch]
  );

  const handleClear = useCallback(() => {
    setTxHashInput('');
    setBlockNumberInput('');
    setError(null);
    onClear();
  }, [onClear]);

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-3">
        {/* Transaction Hash Input */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon className={clsx('size-5', isLoading ? 'animate-pulse text-primary' : 'text-muted')} />
          </div>
          <input
            type="text"
            value={txHashInput}
            onChange={e => {
              setTxHashInput(e.target.value);
              setError(null);
            }}
            placeholder="Transaction hash (0x...)"
            className={clsx(
              'block w-full rounded-sm border bg-surface py-2.5 pr-10 pl-10 font-mono text-sm text-foreground placeholder:text-muted focus:ring-2 focus:ring-primary/50 focus:outline-none',
              error ? 'border-danger' : 'border-border'
            )}
            disabled={isLoading}
          />
          {txHashInput && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-foreground"
            >
              <XMarkIcon className="size-5" />
            </button>
          )}
        </div>

        {/* Block Number Input */}
        <div className="w-36">
          <input
            type="text"
            value={blockNumberInput}
            onChange={e => {
              setBlockNumberInput(e.target.value);
              setError(null);
            }}
            placeholder="Block #"
            className={clsx(
              'block w-full rounded-sm border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:ring-2 focus:ring-primary/50 focus:outline-none',
              error ? 'border-danger' : 'border-border'
            )}
            disabled={isLoading}
          />
        </div>

        {/* Search Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-sm bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          Analyze
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      <p className="mt-1.5 text-xs text-muted">
        Block number is required for efficient queries. You can find it on Etherscan or other block explorers.
      </p>
    </form>
  );
}
