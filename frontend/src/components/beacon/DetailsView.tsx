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
  // Find the first node that saw the block
  const firstSeenLocation = useMemo(() => {
    if (!slotData?.timings.block_seen || !slotData?.nodes) return null;

    let firstNode = null;
    let firstTime = Infinity;

    // Check both P2P and API events
    Object.entries(slotData.timings.block_seen || {}).forEach(([node, time]) => {
      if (time < firstTime) {
        firstTime = time;
        firstNode = node;
      }
    });
    Object.entries(slotData.timings.block_first_seen_p2p || {}).forEach(([node, time]) => {
      if (time < firstTime) {
        firstTime = time;
        firstNode = node;
      }
    });

    if (!firstNode || !slotData.nodes[firstNode]) return null;

    const nodeInfo = slotData.nodes[firstNode];
    return {
      city: nodeInfo.geo.city,
      country: nodeInfo.geo.country,
      continent: nodeInfo.geo.continent,
      time: firstTime
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
              <p className="text-sm font-mono font-medium text-cyber-neon">
                {firstSeenLocation ? (
                  <>
                    {firstSeenLocation.city}, {firstSeenLocation.country}
                    <span className="text-cyber-neon/70 ml-2">
                      ({firstSeenLocation.continent}) at {(firstSeenLocation.time / 1000).toFixed(2)}s
                    </span>
                  </>
                ) : 'Unknown'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 