import { useMemo } from 'react';

interface DetailsViewProps {
  loading: boolean
  isMissing: boolean
  slotData?: {
    block: {
      execution_payload_transactions_count?: number
      block_total_bytes?: number
      execution_payload_base_fee_per_gas?: number
      execution_payload_gas_used?: number
      execution_payload_gas_limit?: number
    }
    timings: {
      block_seen?: Record<string, number>
      block_first_seen_p2p?: Record<string, number>
      blob_seen?: Record<string, Record<string, number>>
    }
    nodes: {
      [clientName: string]: {
        name: string
        username: string
        geo: {
          city: string
          country: string
          continent: string
        }
      }
    }
  }
}

export function DetailsView({ loading, isMissing, slotData }: DetailsViewProps): JSX.Element {
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
      api: firstApiNode && slotData.nodes[firstApiNode] ? {
        city: slotData.nodes[firstApiNode].geo.city,
        country: slotData.nodes[firstApiNode].geo.country,
        continent: slotData.nodes[firstApiNode].geo.continent,
        time: firstApiTime
      } : null,
      p2p: firstP2pNode && slotData.nodes[firstP2pNode] ? {
        city: slotData.nodes[firstP2pNode].geo.city,
        country: slotData.nodes[firstP2pNode].geo.country,
        continent: slotData.nodes[firstP2pNode].geo.continent,
        time: firstP2pTime
      } : null
    };
  }, [slotData]);

  return (
    <div className="lg:col-span-3 backdrop-blur-md rounded-lg border border-cyber-neon/20 p-6 bg-cyber-dark/80">
      <h3 className="text-lg font-sans font-bold text-cyber-neon mb-4">Details</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {loading ? (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={i === 4 || i === 5 ? 'col-span-2' : ''}>
                <div className="h-3 w-16 bg-cyber-neon/10 rounded mb-2 animate-pulse" />
                <div className="h-4 w-24 bg-cyber-neon/10 rounded animate-pulse" />
              </div>
            ))}
          </>
        ) : isMissing ? (
          <>
            <div>
              <h4 className="text-xs font-mono text-cyber-neon/70">Txns</h4>
              <p className="text-sm font-mono font-medium text-cyber-neon/50">-</p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-cyber-neon/70">Size</h4>
              <p className="text-sm font-mono font-medium text-cyber-neon/50">-</p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-cyber-neon/70">Blobs</h4>
              <p className="text-sm font-mono font-medium text-cyber-neon/50">-</p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-cyber-neon/70">Base Fee</h4>
              <p className="text-sm font-mono font-medium text-cyber-neon/50">-</p>
            </div>
            <div className="col-span-2">
              <h4 className="text-xs font-mono text-cyber-neon/70">Gas / Limit</h4>
              <p className="text-sm font-mono font-medium text-cyber-neon/50">-</p>
            </div>
            <div className="col-span-2">
              <h4 className="text-xs font-mono text-cyber-neon/70">First Seen</h4>
              <p className="text-sm font-mono font-medium text-cyber-neon/50">-</p>
            </div>
          </>
        ) : (
          <>
            <div>
              <h4 className="text-xs font-mono text-cyber-neon/70">Txns</h4>
              <p className="text-sm font-mono font-medium text-cyber-neon">
                {slotData?.block.execution_payload_transactions_count?.toLocaleString() || 0}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-cyber-neon/70">Size</h4>
              <p className="text-sm font-mono font-medium text-cyber-neon">
                {slotData?.block.block_total_bytes ? 
                  `${(slotData.block.block_total_bytes / 1024).toFixed(1)}KB` : 
                  'Unknown'}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-cyber-neon/70">Blobs</h4>
              <p className="text-sm font-mono font-medium text-cyber-neon">
                {(() => {
                  if (!slotData) return 0;
                  const maxBlobIndex = Object.values(slotData.timings.blob_seen || {})
                    .reduce((max, obj) => {
                      const indices = Object.keys(obj).map(Number);
                      return indices.length ? Math.max(max, Math.max(...indices)) : max;
                    }, -1);
                  return maxBlobIndex + 1;
                })()}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-cyber-neon/70">Base Fee</h4>
              <p className="text-sm font-mono font-medium text-cyber-neon">
                {slotData?.block.execution_payload_base_fee_per_gas ? 
                  `${(slotData.block.execution_payload_base_fee_per_gas / 1e9).toFixed(2)} Gwei` : 
                  'Unknown'}
              </p>
            </div>
            <div className="col-span-2">
              <h4 className="text-xs font-mono text-cyber-neon/70">Gas / Limit</h4>
              <p className="text-sm font-mono font-medium text-cyber-neon">
                {slotData?.block.execution_payload_gas_used && slotData?.block.execution_payload_gas_limit ? 
                  `${(slotData.block.execution_payload_gas_used / 1e6).toFixed(1)}M / ${(slotData.block.execution_payload_gas_limit / 1e6).toFixed(1)}M` : 
                  'Unknown'}
              </p>
            </div>
            <div className="col-span-2">
              <h4 className="text-xs font-mono text-cyber-neon/70">First Seen</h4>
              <div className="space-y-1">
                <p className="text-sm font-mono font-medium text-cyber-neon">
                  {firstSeenLocations.api ? (
                    <>
                      <span className="text-cyber-blue">API: </span>
                      {firstSeenLocations.api.country}
                      <span className="text-cyber-neon/70 ml-2">
                        ({firstSeenLocations.api.continent}) at {(firstSeenLocations.api.time / 1000).toFixed(2)}s
                      </span>
                    </>
                  ) : 'Unknown'}
                </p>
                <p className="text-sm font-mono font-medium text-cyber-neon">
                  {firstSeenLocations.p2p ? (
                    <>
                      <span className="text-cyber-green">P2P: </span>
                      {firstSeenLocations.p2p.country}
                      <span className="text-cyber-neon/70 ml-2">
                        ({firstSeenLocations.p2p.continent}) at {(firstSeenLocations.p2p.time / 1000).toFixed(2)}s
                      </span>
                    </>
                  ) : 'Unknown'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 