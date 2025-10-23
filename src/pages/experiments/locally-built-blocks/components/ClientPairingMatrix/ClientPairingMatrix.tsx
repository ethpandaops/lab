import { type JSX, useState } from 'react';
import clsx from 'clsx';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { BlockDetailsModal } from '../BlockDetailsModal';
import { getIntensity } from '../../utils';
import type { ClientPairingMatrixProps } from './ClientPairingMatrix.types';
import type { ParsedBlock } from '../../hooks';

/**
 * Displays a matrix showing which execution clients pair with which consensus clients
 * Each cell shows the count of blocks built by that specific client combination
 */
export function ClientPairingMatrix({
  executionClients,
  consensusClients,
  pairingMap,
  maxPairingCount,
  allBlocks,
}: ClientPairingMatrixProps): JSX.Element {
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedExecutionClient, setSelectedExecutionClient] = useState<string | null>(null);
  const [selectedConsensusClient, setSelectedConsensusClient] = useState<string | null>(null);
  const [selectedBlocks, setSelectedBlocks] = useState<ParsedBlock[]>([]);

  /**
   * Get pairing count from map
   */
  const getPairingCount = (execClient: string, consensusClient: string): number => {
    const key = `${execClient}:${consensusClient}`;
    return pairingMap.get(key) || 0;
  };

  /**
   * Handle cell click to open modal with pairing details
   */
  const handleCellClick = (execClient: string, consensusClient: string): void => {
    // Filter all blocks to only those matching this pairing
    const pairingBlocks = allBlocks.filter(
      block => block.parsedExecutionClient === execClient && block.parsedConsensusClient === consensusClient
    );

    if (pairingBlocks.length > 0) {
      setSelectedExecutionClient(execClient);
      setSelectedConsensusClient(consensusClient);
      setSelectedBlocks(pairingBlocks);
      setModalOpen(true);
    }
  };

  const handleCloseModal = (): void => {
    setModalOpen(false);
    setSelectedExecutionClient(null);
    setSelectedConsensusClient(null);
    setSelectedBlocks([]);
  };

  if (executionClients.length === 0 || consensusClients.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="text-muted">No client pairings found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-2 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-1 rounded-full bg-primary"></span>
          <h2 className="text-lg font-semibold text-foreground">Client Pairings</h2>
        </div>
        <p className="ml-3 text-sm text-muted">
          Unique execution + consensus client combinations across all visible slots
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <div className="inline-block min-w-full p-4">
          {/* Consensus client headers */}
          <div className="mb-4 flex gap-0.5">
            <div className="w-28 shrink-0" /> {/* Empty corner for execution client labels */}
            {consensusClients.map(client => (
              <div key={client} className="flex min-w-20 flex-1 flex-col items-center gap-1 px-1">
                <ClientLogo client={client} size={16} />
                <div className="text-xs font-medium text-foreground">{client}</div>
              </div>
            ))}
          </div>

          {/* Execution clients (rows) */}
          <div className="space-y-0.5">
            {executionClients.map(execClient => (
              <div key={execClient} className="flex gap-0.5">
                <div className="flex w-28 shrink-0 items-center gap-2">
                  <ClientLogo client={execClient} size={16} />
                  <span className="text-xs font-medium text-foreground">{execClient}</span>
                </div>
                {consensusClients.map(consensusClient => {
                  const count = getPairingCount(execClient, consensusClient);
                  return (
                    <button
                      type="button"
                      key={`${execClient}-${consensusClient}`}
                      onClick={() => handleCellClick(execClient, consensusClient)}
                      className={clsx(
                        'flex min-w-20 flex-1 items-center justify-center rounded-sm border text-sm font-medium',
                        'h-10 transition-all',
                        count > 0 ? 'cursor-pointer hover:scale-105 hover:shadow-md' : 'cursor-not-allowed opacity-50',
                        getIntensity(count, maxPairingCount)
                      )}
                      title={`${execClient} + ${consensusClient}: ${count} unique node${count !== 1 ? 's' : ''}`}
                      disabled={count === 0}
                    >
                      {count > 0 && count}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Block Details Modal - showing all blocks from this pairing across all slots */}
      {selectedExecutionClient !== null && selectedConsensusClient !== null && (
        <BlockDetailsModal
          open={modalOpen}
          onClose={handleCloseModal}
          slot={null}
          client={`${selectedExecutionClient} + ${selectedConsensusClient}`}
          isExecutionClient={null}
          blocks={selectedBlocks}
        />
      )}
    </div>
  );
}
