import { type JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { ScrollArea } from '@/components/Layout/ScrollArea';
import { useContractTop100Data } from '../../hooks';
import { ContractRow } from '../ContractRow';
import { ContractTop100ListSkeleton } from './ContractTop100ListSkeleton';

/**
 * Sidebar component displaying the top 100 contracts by storage bytes.
 * Shows a scrollable list of contracts with rank, name/address, and size.
 */
export function ContractTop100List(): JSX.Element {
  const { data, isLoading, error } = useContractTop100Data();

  return (
    <Card className="h-[30rem] overflow-hidden rounded-sm">
      {/* Header */}
      <div className="bg-card border-b border-border px-3 py-2">
        <h3 className="text-base font-semibold text-foreground">Top 100 Contracts</h3>
        <p className="text-xs text-muted">By Storage Size</p>
      </div>

      {/* Content */}
      <ScrollArea className="h-[calc(30rem-52px)]">
        <div className="pb-10">
          {isLoading && <ContractTop100ListSkeleton />}

          {error && <div className="px-4 py-8 text-center text-sm text-muted">Failed to load contracts</div>}

          {!isLoading && !error && data && data.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted">No contracts found</div>
          )}

          {!isLoading && !error && data && data.length > 0 && (
            <div className="divide-y divide-border/50">
              {data.map(contract => (
                <ContractRow key={contract.contract_address ?? contract.rank} contract={contract} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
