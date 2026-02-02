import { type JSX, useState, useCallback, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Alert } from '@/components/Feedback/Alert';
import { Card } from '@/components/Layout/Card';
import { useNetwork } from '@/hooks/useNetwork';
import { useBlockTransactions } from './hooks/useBlockTransactions';
import { BlockHeader, TransactionList, GasProfilerSkeleton, TransactionSearchInput } from './components';

/**
 * Get block number from URL search params
 */
function getBlockFromUrl(): number | null {
  const params = new URLSearchParams(window.location.search);
  const block = params.get('block');
  return block ? parseInt(block, 10) : null;
}

/**
 * Update URL with block number
 */
function updateUrl(blockNumber: number | null): void {
  const url = new URL(window.location.href);
  if (blockNumber !== null) {
    url.searchParams.set('block', String(blockNumber));
  } else {
    url.searchParams.delete('block');
  }
  url.searchParams.delete('tx'); // Clear tx param in block explorer mode
  window.history.replaceState({}, '', url.toString());
}

/**
 * Gas Profiler page - Block explorer style with transaction gas analysis
 */
export function IndexPage(): JSX.Element {
  // Get initial block from URL
  const initialBlock = getBlockFromUrl();

  // Block number state (null = use latest from bounds)
  const [blockNumber, setBlockNumber] = useState<number | null>(initialBlock);

  // Expanded transaction hash
  const [expandedTxHash, setExpandedTxHash] = useState<string | null>(null);

  // Show search modal
  const [showSearch, setShowSearch] = useState(false);

  // Get current network for fork-aware calculations
  const { currentNetwork } = useNetwork();

  // Fetch block transactions
  const { data, isLoading, error, bounds, boundsLoading } = useBlockTransactions({
    blockNumber,
  });

  // Sync URL when block changes
  useEffect(() => {
    if (data?.blockNumber) {
      updateUrl(data.blockNumber);
    }
  }, [data?.blockNumber]);

  // Handle block navigation
  const handleBlockChange = useCallback((newBlock: number) => {
    setBlockNumber(newBlock);
    setExpandedTxHash(null);
  }, []);

  // Handle transaction click to expand/collapse
  const handleTransactionClick = useCallback((txHash: string) => {
    setExpandedTxHash(prev => (prev === txHash ? null : txHash));
  }, []);

  // Handle search submit
  const handleSearch = useCallback((txHash: string, block: number) => {
    setBlockNumber(block);
    setExpandedTxHash(txHash);
    setShowSearch(false);
  }, []);

  // Handle search clear
  const handleSearchClear = useCallback(() => {
    setShowSearch(false);
  }, []);

  // Loading state
  if (boundsLoading || (isLoading && !data)) {
    return (
      <Container>
        <Header
          title="Gas Profiler"
          description="Explore block transactions and analyze gas consumption with call tree visualization"
        />
        <GasProfilerSkeleton />
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container>
        <Header
          title="Gas Profiler"
          description="Explore block transactions and analyze gas consumption with call tree visualization"
        />
        <Alert variant="error" title="Error loading block data" description={error.message} />
      </Container>
    );
  }

  // No bounds available
  if (!bounds) {
    return (
      <Container>
        <Header
          title="Gas Profiler"
          description="Explore block transactions and analyze gas consumption with call tree visualization"
        />
        <Alert
          variant="warning"
          title="No data available"
          description="Gas profiling data is not yet available. Blocks are still being indexed."
        />
      </Container>
    );
  }

  return (
    <Container>
      <Header
        title="Gas Profiler"
        description="Explore block transactions and analyze gas consumption with call tree visualization"
      />

      {/* Search toggle button */}
      {!showSearch && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 rounded-sm bg-surface px-3 py-2 text-sm text-muted transition-colors hover:bg-surface/80 hover:text-foreground"
          >
            <MagnifyingGlassIcon className="size-4" />
            Search transaction
          </button>
        </div>
      )}

      {/* Search panel (collapsible) */}
      {showSearch && (
        <Card className="mb-6 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Search Transaction</h3>
            <button onClick={() => setShowSearch(false)} className="text-xs text-muted hover:text-foreground">
              Cancel
            </button>
          </div>
          <TransactionSearchInput
            txHash=""
            blockNumber=""
            onSearch={handleSearch}
            onClear={handleSearchClear}
            isLoading={isLoading}
          />
        </Card>
      )}

      {/* Block Header with navigation */}
      {data && (
        <div className="mb-6">
          <BlockHeader
            blockNumber={data.blockNumber}
            transactionCount={data.transactionCount}
            totalGasUsed={data.totalGasUsed}
            minBlock={bounds.min}
            maxBlock={bounds.max}
            onBlockChange={handleBlockChange}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Transaction list */}
      {data && (
        <TransactionList
          transactions={data.transactions}
          expandedTxHash={expandedTxHash}
          onTransactionClick={handleTransactionClick}
          blockNumber={data.blockNumber}
          network={currentNetwork}
        />
      )}
    </Container>
  );
}
