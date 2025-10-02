import { useMemo } from 'react';

interface DetailsViewProps {
  loading: boolean;
  isMissing: boolean;
  slotData?: {
    block: {
      execution_payload_transactions_count?: number;
      block_total_bytes?: number;
      execution_payload_base_fee_per_gas?: number;
      execution_payload_gas_used?: number;
      execution_payload_gas_limit?: number;
    };
    proposer: {
      proposer_validator_index: number;
    };
    entity?: string;
    timings: {
      block_seen?: Record<string, number>;
      block_first_seen_p2p?: Record<string, number>;
      blob_seen?: Record<string, Record<string, number>>;
    };
    nodes: {
      [clientName: string]: {
        name: string;
        username: string;
        geo: {
          city: string;
          country: string;
          continent: string;
        };
      };
    };
  };
}

export function DetailsView({ loading, isMissing, slotData }: DetailsViewProps) {
  // Find the first node that saw the block (both API and P2P)
  const firstSeenLocations = useMemo(() => {
    if (!slotData?.timings || !slotData?.nodes) return { api: null, p2p: null };

    let firstApiNode = null;
    let firstP2pNode = null;
    let firstApiTime = Infinity;
    let firstP2pTime = Infinity;

    // Check API events
    Object.entries(slotData.timings.block_seen || {}).forEach(([node, time]) => {
      if (time < firstApiTime) {
        firstApiTime = time;
        firstApiNode = node;
      }
    });

    // Check P2P events
    Object.entries(slotData.timings.block_first_seen_p2p || {}).forEach(([node, time]) => {
      if (time < firstP2pTime) {
        firstP2pTime = time;
        firstP2pNode = node;
      }
    });

    return {
      api:
        firstApiNode && slotData.nodes[firstApiNode]
          ? {
              city: slotData.nodes[firstApiNode].geo.city,
              country: slotData.nodes[firstApiNode].geo.country,
              continent: slotData.nodes[firstApiNode].geo.continent,
              time: firstApiTime,
            }
          : null,
      p2p:
        firstP2pNode && slotData.nodes[firstP2pNode]
          ? {
              city: slotData.nodes[firstP2pNode].geo.city,
              country: slotData.nodes[firstP2pNode].geo.country,
              continent: slotData.nodes[firstP2pNode].geo.continent,
              time: firstP2pTime,
            }
          : null,
    };
  }, [slotData]);

  return (
    <div className="lg:col-span-4 backdrop-blur-md bg-surface/80">
      <h3 className="text-lg font-sans font-bold text-primary mb-4">Details</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {loading ? (
          <>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={i >= 4 ? 'col-span-2' : ''}>
                <div className="h-3 w-16 bg-active rounded mb-2 animate-pulse" />
                <div className="h-4 w-24 bg-active rounded animate-pulse" />
              </div>
            ))}
          </>
        ) : isMissing ? (
          <>
            <div>
              <h4 className="text-xs font-mono text-tertiary">Proposer</h4>
              <p className="text-sm font-mono font-medium text-muted">-</p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-tertiary">Txns</h4>
              <p className="text-sm font-mono font-medium text-muted">-</p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-tertiary">Size</h4>
              <p className="text-sm font-mono font-medium text-muted">-</p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-tertiary">Blobs</h4>
              <p className="text-sm font-mono font-medium text-muted">-</p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-tertiary">Base Fee</h4>
              <p className="text-sm font-mono font-medium text-muted">-</p>
            </div>
            <div className="col-span-2">
              <h4 className="text-xs font-mono text-tertiary">Gas / Limit</h4>
              <p className="text-sm font-mono font-medium text-muted">-</p>
            </div>
            <div className="col-span-2">
              <h4 className="text-xs font-mono text-tertiary">Block First Seen</h4>
              <p className="text-sm font-mono font-medium text-muted">-</p>
            </div>
          </>
        ) : (
          <>
            <div className="col-span-2 mb-2">
              <h4 className="text-xs font-mono text-tertiary">Proposer</h4>
              <p className="text-sm font-mono font-medium text-primary">
                <a
                  href={`https://beaconcha.in/validator/${slotData?.proposer.proposer_validator_index}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent transition-colors"
                >
                  {slotData?.proposer.proposer_validator_index}
                </a>
              </p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-tertiary">Transactions</h4>
              <p className="text-sm font-mono font-medium text-primary">
                {slotData?.block.execution_payload_transactions_count?.toLocaleString() || 0}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-tertiary">Size</h4>
              <p className="text-sm font-mono font-medium text-primary">
                {slotData?.block.block_total_bytes
                  ? `${(slotData.block.block_total_bytes / 1024).toFixed(1)}KB`
                  : 'Unknown'}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-tertiary">Blobs</h4>
              <p className="text-sm font-mono font-medium text-primary">
                {(() => {
                  if (!slotData) return 0;
                  const maxBlobIndex = Object.values(slotData.timings.blob_seen || {}).reduce((max, obj) => {
                    const indices = Object.keys(obj).map(Number);
                    return indices.length ? Math.max(max, Math.max(...indices)) : max;
                  }, -1);
                  return maxBlobIndex + 1;
                })()}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-tertiary">Base Fee</h4>
              <p className="text-sm font-mono font-medium text-primary">
                {slotData?.block.execution_payload_base_fee_per_gas
                  ? `${(slotData.block.execution_payload_base_fee_per_gas / 1e9).toFixed(2)} Gwei`
                  : 'Unknown'}
              </p>
            </div>
            <div className="col-span-2">
              <h4 className="text-xs font-mono text-tertiary">Gas / Limit</h4>
              <p className="text-sm font-mono font-medium text-primary">
                {slotData?.block.execution_payload_gas_used && slotData?.block.execution_payload_gas_limit
                  ? `${(slotData.block.execution_payload_gas_used / 1e6).toFixed(1)}M / ${(slotData.block.execution_payload_gas_limit / 1e6).toFixed(1)}M`
                  : 'Unknown'}
              </p>
            </div>
            <div className="col-span-2">
              <h4 className="text-xs font-mono text-tertiary">Block First Seen</h4>
              <div className="space-y-1">
                <p className="text-sm font-mono font-medium text-primary">
                  {firstSeenLocations.p2p ? (
                    <>
                      <span className="text-purple-500">P2P: </span>
                      {firstSeenLocations.p2p.country}
                      <span className="text-tertiary ml-2">
                        ({firstSeenLocations.p2p.continent}) at {(firstSeenLocations.p2p.time / 1000).toFixed(2)}s
                      </span>
                    </>
                  ) : (
                    'Unknown'
                  )}
                </p>
                <p className="text-sm font-mono font-medium text-primary">
                  {firstSeenLocations.api ? (
                    <>
                      <span className="text-accent">API: </span>
                      {firstSeenLocations.api.country}
                      <span className="text-tertiary ml-2">
                        ({firstSeenLocations.api.continent}) at {(firstSeenLocations.api.time / 1000).toFixed(2)}s
                      </span>
                    </>
                  ) : (
                    'Unknown'
                  )}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
