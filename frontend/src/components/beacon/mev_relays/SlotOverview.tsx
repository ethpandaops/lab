import React from 'react';
import { Card, CardBody } from '@/components/common/Card';
import { Copy, Check } from 'lucide-react';
import clsx from 'clsx';

export interface SlotOverviewProps {
  slot?: number;
  proposer?: {
    proposerValidatorIndex: bigint;
    proposerPubkey?: string;
  };
  block?: {
    executionPayloadTransactionsCount?: bigint;
    blockTotalBytes?: bigint;
    executionPayloadBaseFeePerGas?: bigint;
    executionPayloadGasUsed?: bigint;
    executionPayloadGasLimit?: bigint;
    executionPayloadBlockNumber?: bigint;
    blockVersion?: string;
    executionPayloadBlockHash?: string;
  };
  winningBid?: {
    blockHash: string;
    value: number;
    relayName: string;
    builderPubkey?: string;
    formattedEth?: string;
    formattedTime?: string;
  } | null;
  relayColors: Record<string, string>;
  className?: string;
}

export const SlotOverview: React.FC<SlotOverviewProps> = ({
  slot,
  proposer,
  block,
  winningBid,
  relayColors,
  className
}) => {
  const [copiedHash, setCopiedHash] = React.useState<string | null>(null);

  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Format bytes to human-readable format
  const formatBytes = (bytes?: bigint) => {
    if (!bytes) return 'N/A';
    const num = Number(bytes);
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(2)} KB`;
    return `${(num / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Format gas to human-readable format
  const formatGas = (gas?: bigint) => {
    if (!gas) return 'N/A';
    const num = Number(gas);
    if (num < 1000) return num.toString();
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
    return `${(num / 1000000).toFixed(2)}M`;
  };

  // Format Gwei
  const formatGwei = (wei?: bigint) => {
    if (!wei) return 'N/A';
    return `${(Number(wei) / 1e9).toFixed(2)} Gwei`;
  };

  // Truncate string with ellipsis in the middle
  const truncateMiddle = (str: string, startChars = 6, endChars = 4) => {
    if (!str) return 'N/A';
    if (str.length <= startChars + endChars) return str;
    return `${str.substring(0, startChars)}...${str.substring(str.length - endChars)}`;
  };

  return (
    <div className={clsx("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
      {/* Proposer Information */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-sans font-bold text-primary mb-3">Proposer Information</h3>
          <div className="space-y-2">
            <div className="flex flex-col">
              <span className="text-xs text-tertiary">Slot</span>
              <span className="text-sm font-mono text-secondary">{slot || 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-tertiary">Validator Index</span>
              <span className="text-sm font-mono text-secondary">
                {proposer?.proposerValidatorIndex.toString() || 'N/A'}
              </span>
            </div>
            {proposer?.proposerPubkey && (
              <div className="flex flex-col">
                <span className="text-xs text-tertiary">Validator Public Key</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-secondary truncate">
                    {truncateMiddle(proposer.proposerPubkey, 10, 8)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(proposer.proposerPubkey!)}
                    className="text-tertiary hover:text-primary transition-colors"
                    title="Copy validator public key"
                  >
                    {copiedHash === proposer.proposerPubkey ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Winning Bid Information */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-sans font-bold text-primary mb-3">Winning Bid</h3>
          {winningBid ? (
            <div className="space-y-2">
              <div className="flex flex-col">
                <span className="text-xs text-tertiary">Relay</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: relayColors[winningBid.relayName] || '#888' }}
                  />
                  <span className="text-sm font-medium text-secondary">{winningBid.relayName}</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-tertiary">Value</span>
                <span className="text-sm font-mono text-success font-medium">
                  {winningBid.formattedEth || winningBid.value.toFixed(4)} ETH
                </span>
              </div>
              {winningBid.formattedTime && (
                <div className="flex flex-col">
                  <span className="text-xs text-tertiary">Time Received</span>
                  <span className="text-sm font-mono text-secondary">{winningBid.formattedTime}</span>
                </div>
              )}
              {winningBid.builderPubkey && (
                <div className="flex flex-col">
                  <span className="text-xs text-tertiary">Builder Public Key</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-secondary truncate">
                      {truncateMiddle(winningBid.builderPubkey, 10, 8)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(winningBid.builderPubkey!)}
                      className="text-tertiary hover:text-primary transition-colors"
                      title="Copy builder public key"
                    >
                      {copiedHash === winningBid.builderPubkey ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs text-tertiary">Block Hash</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-secondary truncate">
                    {truncateMiddle(winningBid.blockHash, 10, 8)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(winningBid.blockHash)}
                    className="text-tertiary hover:text-primary transition-colors"
                    title="Copy block hash"
                  >
                    {copiedHash === winningBid.blockHash ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-tertiary py-2">
              No winning bid identified yet.
            </div>
          )}
        </CardBody>
      </Card>

      {/* Block Information */}
      <Card className="md:col-span-2">
        <CardBody>
          <h3 className="text-lg font-sans font-bold text-primary mb-3">Block Payload Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {block?.executionPayloadBlockNumber ? (
              <div className="flex flex-col">
                <span className="text-xs text-tertiary">Execution Block Number</span>
                <span className="text-sm font-mono text-secondary">
                  {block.executionPayloadBlockNumber.toString()}
                </span>
              </div>
            ) : null}
            {block?.executionPayloadTransactionsCount ? (
              <div className="flex flex-col">
                <span className="text-xs text-tertiary">Transaction Count</span>
                <span className="text-sm font-mono text-secondary">
                  {block.executionPayloadTransactionsCount.toString()}
                </span>
              </div>
            ) : null}
            {block?.blockTotalBytes ? (
              <div className="flex flex-col">
                <span className="text-xs text-tertiary">Block Size</span>
                <span className="text-sm font-mono text-secondary">
                  {formatBytes(block.blockTotalBytes)}
                </span>
              </div>
            ) : null}
            {block?.executionPayloadGasUsed ? (
              <div className="flex flex-col">
                <span className="text-xs text-tertiary">Gas Used</span>
                <span className="text-sm font-mono text-secondary">
                  {formatGas(block.executionPayloadGasUsed)}
                </span>
              </div>
            ) : null}
            {block?.executionPayloadGasLimit ? (
              <div className="flex flex-col">
                <span className="text-xs text-tertiary">Gas Limit</span>
                <span className="text-sm font-mono text-secondary">
                  {formatGas(block.executionPayloadGasLimit)}
                </span>
              </div>
            ) : null}
            {block?.executionPayloadBaseFeePerGas ? (
              <div className="flex flex-col">
                <span className="text-xs text-tertiary">Base Fee</span>
                <span className="text-sm font-mono text-secondary">
                  {formatGwei(block.executionPayloadBaseFeePerGas)}
                </span>
              </div>
            ) : null}
            {block?.blockVersion ? (
              <div className="flex flex-col">
                <span className="text-xs text-tertiary">Block Version</span>
                <span className="text-sm font-mono text-secondary">
                  {block.blockVersion}
                </span>
              </div>
            ) : null}
          </div>
          
          {!block || (
            !block.executionPayloadBlockNumber && 
            !block.executionPayloadTransactionsCount && 
            !block.blockTotalBytes && 
            !block.executionPayloadGasUsed && 
            !block.executionPayloadGasLimit && 
            !block.executionPayloadBaseFeePerGas && 
            !block.blockVersion
          ) && (
            <div className="text-sm text-tertiary py-2">
              No block payload information available.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default SlotOverview;