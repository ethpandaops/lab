import { type JSX } from 'react';
import { Dialog } from '@/components/Overlays/Dialog';
import { Disclosure } from '@/components/Layout/Disclosure';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import type { BlockDetailsModalProps } from './BlockDetailsModal.types';
import type { ParsedBlock } from '../../hooks';

/**
 * Formats a wei value to ETH with proper formatting
 */
function formatEth(wei: string | null | undefined): string {
  if (!wei) return '0 ETH';
  const eth = parseFloat(wei) / 1e18;
  return `${eth.toFixed(6)} ETH`;
}

/**
 * Formats bytes to KB/MB
 */
function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Formats a percentage
 */
function formatPercent(used: number | null | undefined, limit: number | null | undefined): string {
  if (!used || !limit) return '0%';
  return `${((used / limit) * 100).toFixed(2)}%`;
}

/**
 * Modal displaying details of blocks built by a specific client in a specific slot
 */
export function BlockDetailsModal({
  open,
  onClose,
  slot,
  client,
  isExecutionClient,
  blocks,
}: BlockDetailsModalProps): JSX.Element {
  // Filter blocks to only those built by this specific client using pre-parsed values
  const filteredBlocks = blocks.filter(block => {
    const targetClient = isExecutionClient ? block.parsedExecutionClient : block.parsedConsensusClient;
    return targetClient === client;
  });

  // Group blocks by node (meta_client_name) - same logic as the matrix view
  // Each node may prepare multiple blocks, but we deduplicate identical blocks
  const nodeMap = new Map<string, ParsedBlock[]>();
  filteredBlocks.forEach(block => {
    const nodeName = block.meta_client_name;
    if (!nodeName) return;

    if (!nodeMap.has(nodeName)) {
      nodeMap.set(nodeName, []);
    }
    nodeMap.get(nodeName)!.push(block);
  });

  // Deduplicate blocks within each node using composite key
  const deduplicatedNodeMap = new Map<string, ParsedBlock[]>();
  nodeMap.forEach((blocks, nodeName) => {
    const seenBlocks = new Set<string>();
    const uniqueBlocks = blocks.filter(block => {
      const compositeKey = [
        block.execution_payload_block_number,
        block.execution_payload_transactions_count,
        block.execution_payload_gas_used,
        block.execution_payload_value,
      ].join('|');

      if (seenBlocks.has(compositeKey)) return false; // Skip duplicates
      seenBlocks.add(compositeKey);
      return true;
    });
    deduplicatedNodeMap.set(nodeName, uniqueBlocks);
  });

  // Convert to array of node groups
  const nodeGroups = Array.from(deduplicatedNodeMap.entries()).map(([nodeName, nodeBlocks]) => ({
    nodeName,
    blocks: nodeBlocks,
    // Use the first block as representative for summary stats
    representativeBlock: nodeBlocks[0],
  }));

  const nodeCount = nodeGroups.length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Block Details - Slot ${slot.toLocaleString()}`}
      description={`${client} (${isExecutionClient ? 'Execution' : 'Consensus'} Client)`}
      size="full"
    >
      <div>
        {/* Individual Nodes */}
        <div className="space-y-2">
          <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">Nodes ({nodeCount})</h3>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {nodeGroups.map((nodeGroup, index) => (
              <NodeCard key={nodeGroup.nodeName} nodeGroup={nodeGroup} index={index} />
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

interface NodeGroup {
  nodeName: string;
  blocks: ParsedBlock[];
  representativeBlock: ParsedBlock;
}

/**
 * Card displaying details for a single node and all its prepared blocks
 */
function NodeCard({ nodeGroup, index }: { nodeGroup: NodeGroup; index: number }): JSX.Element {
  const { nodeName, blocks, representativeBlock } = nodeGroup;
  const executionClient = representativeBlock.parsedExecutionClient;
  const consensusClient = representativeBlock.parsedConsensusClient;

  // Calculate total transactions across all blocks from this node
  const totalTxs = blocks.reduce((sum, b) => sum + (b.execution_payload_transactions_count || 0), 0);

  const title = (
    <div className="flex items-center gap-4">
      <span className="font-mono text-xs text-muted">#{index + 1}</span>
      <span className="flex-1 truncate font-mono text-sm">{nodeName}</span>
      <div className="flex items-center gap-3 text-xs text-muted">
        {blocks.length > 1 && (
          <>
            <span className="rounded-sm bg-primary/20 px-1.5 py-0.5 font-medium text-primary">
              {blocks.length} blocks
            </span>
            <span className="text-muted/50">•</span>
          </>
        )}
        {executionClient && (
          <div className="flex items-center gap-1.5">
            <ClientLogo client={executionClient} size={16} />
            <span>{executionClient}</span>
          </div>
        )}
        {executionClient && consensusClient && <span className="text-muted/50">•</span>}
        {consensusClient && (
          <div className="flex items-center gap-1.5">
            <ClientLogo client={consensusClient} size={16} />
            <span>{consensusClient}</span>
          </div>
        )}
        <span className="text-muted/50">•</span>
        <span>
          {totalTxs} tx{totalTxs !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );

  // Use the representative block (first block) for display
  const block = representativeBlock;

  return (
    <Disclosure title={title}>
      <div className="grid grid-cols-3 gap-4 pb-2">
        {/* Block Information */}
        <div className="space-y-2">
          <div className="text-xs font-semibold tracking-wide text-primary uppercase">Block Information</div>

          <div>
            <div className="text-xs text-muted">Block Number</div>
            <div className="font-mono text-sm text-foreground">
              {block.execution_payload_block_number?.toLocaleString() || 'N/A'}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted">Block Version</div>
            <div className="font-mono text-sm text-foreground">{block.block_version || 'N/A'}</div>
          </div>

          <div>
            <div className="text-xs text-muted">Block Size</div>
            <div className="font-mono text-sm text-foreground">{formatBytes(block.block_total_bytes)}</div>
            <div className="font-mono text-xs text-muted">
              {formatBytes(block.block_total_bytes_compressed)} compressed
            </div>
          </div>

          <div>
            <div className="text-xs text-muted">Transactions</div>
            <div className="font-mono text-sm text-foreground">{block.execution_payload_transactions_count || 0}</div>
            <div className="font-mono text-xs text-muted">
              {formatBytes(block.execution_payload_transactions_total_bytes)}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted">Gas Used / Limit</div>
            <div className="font-mono text-sm text-foreground">
              {block.execution_payload_gas_used?.toLocaleString() || 0} /{' '}
              {block.execution_payload_gas_limit?.toLocaleString() || 0}
            </div>
            <div className="font-mono text-xs text-muted">
              {formatPercent(block.execution_payload_gas_used, block.execution_payload_gas_limit)} used
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div className="space-y-2">
          <div className="text-xs font-semibold tracking-wide text-primary uppercase">Client Information</div>

          <div>
            <div className="text-xs text-muted">Node</div>
            <div className="font-mono text-sm text-foreground">{block.meta_client_name || 'Unknown'}</div>
            <div className="font-mono text-xs text-muted">{block.meta_client_version || 'N/A'}</div>
          </div>

          <div>
            <div className="text-xs text-muted">Implementation</div>
            <div className="font-mono text-sm text-foreground">{block.meta_client_implementation || 'N/A'}</div>
          </div>

          <div>
            <div className="text-xs text-muted">Consensus</div>
            <div className="flex items-center gap-2">
              {consensusClient && <ClientLogo client={consensusClient} size={20} />}
              <div>
                <div className="font-mono text-sm text-foreground">{consensusClient || 'Unknown'}</div>
                <div className="font-mono text-xs text-muted">{block.meta_consensus_version || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted">Execution</div>
            <div className="flex items-center gap-2">
              {executionClient && <ClientLogo client={executionClient} size={20} />}
              <div className="font-mono text-sm text-foreground">{executionClient || 'Unknown'}</div>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted">Location</div>
            <div className="font-mono text-sm text-foreground">
              {block.meta_client_geo_city || 'Unknown'}, {block.meta_client_geo_country_code || 'N/A'}
            </div>
          </div>
        </div>

        {/* Payload Values */}
        <div className="space-y-2">
          <div className="text-xs font-semibold tracking-wide text-primary uppercase">Payload Values</div>

          <div>
            <div className="text-xs text-muted">Execution Value</div>
            <div className="font-mono text-sm text-foreground">{formatEth(block.execution_payload_value)}</div>
          </div>

          <div>
            <div className="text-xs text-muted">Consensus Value</div>
            <div className="font-mono text-sm text-foreground">{formatEth(block.consensus_payload_value)}</div>
          </div>

          <div className="mt-4 rounded-sm bg-background p-3">
            <div className="text-xs font-medium text-muted">Block Context</div>
            <div className="mt-1 text-xs leading-relaxed text-muted">
              This block was built locally by a node running {block.meta_client_name}. It represents what the node would
              have proposed if selected as a block proposer for slot {block.slot?.toLocaleString()}. This data is useful
              for comparing different client implementations and their transaction selection strategies.
            </div>
          </div>
        </div>
      </div>
    </Disclosure>
  );
}
