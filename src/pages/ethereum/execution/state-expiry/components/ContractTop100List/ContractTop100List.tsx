import { type JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { ScrollArea } from '@/components/Layout/ScrollArea';
import { useContractTop100Data } from '../../hooks';
import { ContractRow, ContractCard } from '../ContractRow';
import { ContractTop100ListSkeleton, ContractTop100ListSkeletonMobile } from './ContractTop100ListSkeleton';
import { TableColGroup } from './TableColGroup';

interface ContractTop100ListProps {
  /** Display variant - 'contained' uses Card with fixed height ScrollArea, 'full' renders without container */
  variant?: 'contained' | 'full';
}

/**
 * Component displaying the top 100 contracts by storage bytes.
 * Shows a table on desktop and card layout on mobile.
 *
 * @param variant - 'contained' (default) wraps in Card with ScrollArea, 'full' renders directly
 */
export function ContractTop100List({ variant = 'contained' }: ContractTop100ListProps): JSX.Element {
  const { data, isLoading, error } = useContractTop100Data();

  // Desktop table content
  const tableContent = (
    <>
      {isLoading && <ContractTop100ListSkeleton />}

      {error && <div className="px-4 py-8 text-center text-sm text-muted">Failed to load contracts</div>}

      {!isLoading && !error && data && data.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-muted">No contracts found</div>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <table className="w-full min-w-[600px] table-fixed border-collapse">
          <TableColGroup />
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="border-b border-border/50 text-[10px] font-medium text-muted uppercase">
              <th className="px-2 py-1.5 text-center">#</th>
              <th className="px-2 py-1.5 text-left">Contract</th>
              <th className="px-2 py-1.5 text-left">Owner</th>
              <th className="px-2 py-1.5 text-right">Size</th>
              <th className="px-2 py-1.5 text-right">Slots</th>
              <th className="px-2 py-1.5 text-right" title="Savings with 1 year expiry policy">
                1y Expiry
              </th>
              <th className="px-2 py-1.5 text-right" title="Savings with 2 year expiry policy">
                2y Expiry
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.map(item => (
              <ContractRow key={item.contract.contract_address ?? item.contract.rank} item={item} />
            ))}
          </tbody>
        </table>
      )}
    </>
  );

  // Mobile card content
  const mobileContent = (
    <>
      {isLoading && <ContractTop100ListSkeletonMobile />}

      {error && <div className="px-4 py-8 text-center text-sm text-muted">Failed to load contracts</div>}

      {!isLoading && !error && data && data.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-muted">No contracts found</div>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <div>
          {data.map(item => (
            <ContractCard key={item.contract.contract_address ?? item.contract.rank} item={item} />
          ))}
        </div>
      )}
    </>
  );

  if (variant === 'full') {
    return (
      <>
        {/* Mobile: Card layout */}
        <div className="md:hidden">{mobileContent}</div>
        {/* Desktop: Table layout */}
        <div className="hidden overflow-x-auto md:block">{tableContent}</div>
      </>
    );
  }

  return (
    <Card className="h-[30rem] overflow-hidden rounded-sm">
      {/* Title */}
      <div className="bg-card border-b border-border px-3 py-2">
        <h3 className="text-base font-semibold text-foreground">Top 100 Contracts</h3>
        <p className="text-xs text-muted">By Storage Size · Expiry Savings</p>
      </div>

      {/* Mobile: Card layout */}
      <ScrollArea orientation="vertical" className="h-[calc(30rem-52px)] md:hidden">
        <div className="pb-10">{mobileContent}</div>
      </ScrollArea>

      {/* Desktop: Table layout */}
      <ScrollArea orientation="both" className="hidden h-[calc(30rem-52px)] md:block">
        <div className="pb-10">{tableContent}</div>
      </ScrollArea>
    </Card>
  );
}
