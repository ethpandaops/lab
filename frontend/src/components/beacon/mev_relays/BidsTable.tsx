import React, { useState, useMemo } from 'react';
import { Card, CardBody } from '@/components/common/Card';
import { Copy, ArrowUpDown, Check } from 'lucide-react';
import clsx from 'clsx';

export interface Bid {
  relayName: string;
  value: number; // in ETH
  time: number; // relative to slot start in ms
  blockHash?: string;
  builderPubkey?: string;
  isWinning?: boolean;
}

interface BidsTableProps {
  bids: Bid[];
  relayColors: Record<string, string>;
  className?: string;
}

type SortField = 'relay' | 'value' | 'time' | 'builder' | 'blockHash';
type SortDirection = 'asc' | 'desc';

export const BidsTable: React.FC<BidsTableProps> = ({ 
  bids, 
  relayColors,
  className 
}) => {
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const itemsPerPage = 10;

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Copy block hash to clipboard
  const copyToClipboard = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Sort and paginate bids
  const sortedBids = useMemo(() => {
    return [...bids].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'relay':
          comparison = a.relayName.localeCompare(b.relayName);
          break;
        case 'value':
          comparison = a.value - b.value;
          break;
        case 'time':
          comparison = a.time - b.time;
          break;
        case 'builder':
          comparison = (a.builderPubkey || '').localeCompare(b.builderPubkey || '');
          break;
        case 'blockHash':
          comparison = (a.blockHash || '').localeCompare(b.blockHash || '');
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [bids, sortField, sortDirection]);

  // Calculate pagination
  const totalPages = Math.ceil(sortedBids.length / itemsPerPage);
  const paginatedBids = sortedBids.slice(
    page * itemsPerPage, 
    (page + 1) * itemsPerPage
  );

  // Render sort indicator
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    
    return (
      <ArrowUpDown 
        className={clsx(
          "inline-block ml-1 h-3 w-3",
          sortDirection === 'asc' ? "rotate-0" : "rotate-180"
        )} 
      />
    );
  };

  // Truncate string with ellipsis in the middle
  const truncateMiddle = (str: string, startChars = 6, endChars = 4) => {
    if (!str) return '';
    if (str.length <= startChars + endChars) return str;
    return `${str.substring(0, startChars)}...${str.substring(str.length - endChars)}`;
  };

  return (
    <Card className={className}>
      <CardBody>
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-secondary border-b border-subtle">
              <tr>
                <th 
                  className="py-2 px-3 font-medium cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleSort('relay')}
                >
                  Relay {renderSortIndicator('relay')}
                </th>
                <th 
                  className="py-2 px-3 font-medium cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleSort('value')}
                >
                  Value (ETH) {renderSortIndicator('value')}
                </th>
                <th 
                  className="py-2 px-3 font-medium cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleSort('time')}
                >
                  Time (s) {renderSortIndicator('time')}
                </th>
                <th 
                  className="py-2 px-3 font-medium cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleSort('builder')}
                >
                  Builder {renderSortIndicator('builder')}
                </th>
                <th 
                  className="py-2 px-3 font-medium cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleSort('blockHash')}
                >
                  Block Hash {renderSortIndicator('blockHash')}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedBids.map((bid, index) => (
                <tr 
                  key={`${bid.relayName}-${bid.blockHash}-${index}`}
                  className={clsx(
                    "border-b border-subtle/50 hover:bg-surface/50 transition-colors",
                    bid.isWinning ? "bg-success/10" : ""
                  )}
                >
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: relayColors[bid.relayName] || '#888' }}
                      />
                      <span className={bid.isWinning ? "font-medium text-primary" : "text-secondary"}>
                        {bid.relayName}
                        {bid.isWinning && <span className="ml-2 text-xs text-success">Winner</span>}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 font-mono text-secondary">
                    {bid.value.toFixed(4)}
                  </td>
                  <td className="py-2 px-3 font-mono text-secondary">
                    {(bid.time / 1000).toFixed(3)}
                  </td>
                  <td className="py-2 px-3 font-mono text-secondary">
                    {bid.builderPubkey ? truncateMiddle(bid.builderPubkey) : 'N/A'}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-secondary">
                        {bid.blockHash ? truncateMiddle(bid.blockHash) : 'N/A'}
                      </span>
                      {bid.blockHash && (
                        <button
                          onClick={() => copyToClipboard(bid.blockHash!)}
                          className="text-tertiary hover:text-primary transition-colors"
                          title="Copy block hash"
                        >
                          {copiedHash === bid.blockHash ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedBids.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-tertiary">
                    No bids available for this slot.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 text-xs">
            <div className="text-tertiary">
              Showing {page * itemsPerPage + 1}-{Math.min((page + 1) * itemsPerPage, sortedBids.length)} of {sortedBids.length}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className={clsx(
                  "px-2 py-1 rounded border border-subtle",
                  page === 0 
                    ? "opacity-50 cursor-not-allowed" 
                    : "hover:bg-surface/70 text-secondary hover:text-primary"
                )}
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
                className={clsx(
                  "px-2 py-1 rounded border border-subtle",
                  page === totalPages - 1 
                    ? "opacity-50 cursor-not-allowed" 
                    : "hover:bg-surface/70 text-secondary hover:text-primary"
                )}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default BidsTable;