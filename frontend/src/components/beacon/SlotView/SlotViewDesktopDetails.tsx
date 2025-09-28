import { memo } from 'react';
import clsx from 'clsx';
import { analyzeSlotData } from './slotAnalysis';
import type { WinningBid } from './types';

interface SlotViewDesktopDetailsProps {
  slot?: number;
  network: string;
  slotData: any;
  winningBid: WinningBid | null;
}

function SlotViewDesktopDetailsComponent({
  slot,
  network,
  slotData,
  winningBid,
}: SlotViewDesktopDetailsProps) {
  const analysis = analyzeSlotData(slotData);

  const firstBlockSeenInfo = (() => {
    const times = [
      ...Object.values(slotData?.timings?.blockSeen || {}).map(time => Number(time)),
      ...Object.values(slotData?.timings?.blockFirstSeenP2p || {}).map(time => Number(time)),
    ];
    const firstTime = times.length > 0 ? Math.min(...times) : null;
    const firstNode = Object.entries(slotData?.timings?.blockSeen || {})
      .concat(Object.entries(slotData?.timings?.blockFirstSeenP2p || {}))
      .find(([_, time]) => Number(time) === firstTime)?.[0];
    const nodeData = firstNode ? slotData?.nodes[firstNode] : null;
    const country = nodeData?.geo?.country || nodeData?.geo?.continent || 'Unknown';

    return firstTime ? `${(firstTime / 1000).toFixed(2)}s (${country})` : '-';
  })();

  const blobCount = (() => {
    if (!slotData?.timings?.blobSeen && !slotData?.timings?.blobFirstSeenP2p) return 0;
    const blobIndices = new Set();

    if (slotData?.timings?.blobSeen) {
      Object.values(slotData.timings.blobSeen).forEach((nodeData: any) => {
        if ('timings' in nodeData) {
          Object.keys(nodeData.timings).forEach(index => blobIndices.add(index));
        } else {
          Object.keys(nodeData).forEach(index => blobIndices.add(index));
        }
      });
    }

    if (slotData?.timings?.blobFirstSeenP2p) {
      Object.values(slotData.timings.blobFirstSeenP2p).forEach((nodeData: any) => {
        if ('timings' in nodeData) {
          Object.keys(nodeData.timings).forEach(index => blobIndices.add(index));
        } else {
          Object.keys(nodeData).forEach(index => blobIndices.add(index));
        }
      });
    }

    return blobIndices.size;
  })();

  const nodesSeen = (() => {
    const nodes = new Set([
      ...Object.keys(slotData?.timings?.blockSeen || {}),
      ...Object.keys(slotData?.timings?.blockFirstSeenP2p || {}),
    ]);
    return nodes.size || 0;
  })();

  const attestationsInfo = (() => {
    const totalAttestations =
      slotData?.attestations?.windows?.reduce(
        (sum: number, window: any) => sum + window.validatorIndices.length,
        0,
      ) || 0;
    const maxAttestations = slotData?.attestations?.maximumVotes || 0;
    return `${totalAttestations.toLocaleString()} / ${maxAttestations.toLocaleString()}`;
  })();

  return (
    <div className="h-full w-[20%] border-r border-subtle">
      <div className="h-full overflow-y-auto">
        <div className="space-y-4 p-4">
          {/* Slot Header */}
          <div className="mb-3 p-2">
            <div className="mb-1 text-4xl font-sans font-black text-primary">
              <a
                href={`https://beaconcha.in/slot/${slot}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent"
              >
                {slot}
              </a>
            </div>
            <div className="text-sm font-mono">
              <span className="text-tertiary">
                by{' '}
                {slotData?.entity && ['mainnet', 'hoodi', 'sepolia'].includes(network) ? (
                  <a
                    href={`https://ethseer.io/entity/${slotData.entity}?network=${network}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent/80"
                  >
                    {slotData.entity}
                  </a>
                ) : (
                  <span className="text-accent">{slotData?.entity || 'Unknown'}</span>
                )}
              </span>
            </div>
            {slotData?.block?.blockVersion && (
              <div className="mt-2 flex gap-1">
                <div className="inline-flex items-center rounded border border-cyber-neon bg-cyber-dark px-1.5 py-0.5 text-[10px] font-mono font-medium text-cyber-neon">
                  {slotData.block.blockVersion.toUpperCase()}
                </div>
              </div>
            )}
          </div>

          {/* Analysis Section */}
          {slotData && (
            <div className="mb-3 space-y-0.5 rounded bg-surface/30 p-2 text-xs font-mono">
              {/* Block Timing */}
              <div
                className={clsx(
                  'grid grid-cols-[16px_1fr] items-start gap-1',
                  analysis.firstBlockTime === null && 'text-tertiary',
                  analysis.firstBlockTime !== null &&
                    analysis.firstBlockTime <= 2000 &&
                    'text-success',
                  analysis.firstBlockTime !== null &&
                    analysis.firstBlockTime > 2000 &&
                    analysis.firstBlockTime <= 3000 &&
                    'text-warning',
                  analysis.firstBlockTime !== null &&
                    analysis.firstBlockTime > 3000 &&
                    'text-error',
                )}
              >
                <div className="flex justify-center">
                  {analysis.firstBlockTime === null
                    ? '○'
                    : analysis.firstBlockTime > 3000
                      ? '⚠️'
                      : analysis.firstBlockTime > 2000
                        ? '⚡'
                        : '✓'}
                </div>
                <div className="text-[10px]">
                  {analysis.firstBlockTime === null
                    ? 'Block timing unknown'
                    : analysis.firstBlockTime > 3000
                      ? `Block proposed late (${(analysis.firstBlockTime / 1000).toFixed(2)}s)`
                      : analysis.firstBlockTime > 2000
                        ? `Block slightly delayed (${(analysis.firstBlockTime / 1000).toFixed(2)}s)`
                        : `Block on time (${(analysis.firstBlockTime / 1000).toFixed(2)}s)`}
                </div>
              </div>

              {/* Blob Timing */}
              <div
                className={clsx(
                  'grid grid-cols-[16px_1fr] items-start gap-1',
                  (!analysis.firstBlobTime ||
                    !analysis.firstBlockTime ||
                    analysis.blobCount === 0) &&
                    'text-tertiary',
                  analysis.blobCount > 0 &&
                    analysis.firstBlobTime &&
                    analysis.firstBlockTime &&
                    analysis.firstBlobTime - analysis.firstBlockTime <= 500 &&
                    'text-success',
                  analysis.blobCount > 0 &&
                    analysis.firstBlobTime &&
                    analysis.firstBlockTime &&
                    analysis.firstBlobTime - analysis.firstBlockTime > 500 &&
                    analysis.firstBlobTime - analysis.firstBlockTime <= 1000 &&
                    'text-warning',
                  analysis.blobCount > 0 &&
                    analysis.firstBlobTime &&
                    analysis.firstBlockTime &&
                    analysis.firstBlobTime - analysis.firstBlockTime > 1000 &&
                    'text-error',
                )}
              >
                <div className="flex justify-center">
                  {analysis.blobCount === 0
                    ? '○'
                    : !analysis.firstBlobTime || !analysis.firstBlockTime
                      ? '○'
                      : analysis.firstBlobTime - analysis.firstBlockTime > 1000
                        ? '⚠️'
                        : analysis.firstBlobTime - analysis.firstBlockTime > 500
                          ? '⚡'
                          : '✓'}
                </div>
                <div className="text-[10px]">
                  {analysis.blobCount === 0
                    ? 'No blobs in block'
                    : !analysis.firstBlobTime || !analysis.firstBlockTime
                      ? `Blobs: ${analysis.blobCount}`
                      : analysis.firstBlobTime - analysis.firstBlockTime > 1000
                        ? `Slow blob delivery (+${((analysis.firstBlobTime - analysis.firstBlockTime) / 1000).toFixed(2)}s)`
                        : analysis.firstBlobTime - analysis.firstBlockTime > 500
                          ? `Moderate blob delay (+${((analysis.firstBlobTime - analysis.firstBlockTime) / 1000).toFixed(2)}s)`
                          : `Fast blob delivery (+${((analysis.firstBlobTime - analysis.firstBlockTime) / 1000).toFixed(2)}s)`}
                </div>
              </div>

              {/* Gas Usage */}
              <div
                className={clsx(
                  'grid grid-cols-[16px_1fr] items-start gap-1',
                  !analysis.gasUsagePercent && 'text-tertiary',
                  analysis.gasUsagePercent && analysis.gasUsagePercent <= 80 && 'text-success',
                  analysis.gasUsagePercent && analysis.gasUsagePercent > 80 && 'text-warning',
                )}
              >
                <div className="flex justify-center">
                  {!analysis.gasUsagePercent
                    ? '○'
                    : analysis.gasUsagePercent > 95
                      ? '⚡'
                      : analysis.gasUsagePercent > 80
                        ? '⚡'
                        : '✓'}
                </div>
                <div className="text-[10px]">
                  {!analysis.gasUsagePercent
                    ? 'Gas usage unknown'
                    : analysis.gasUsagePercent > 95
                      ? `High gas usage (${analysis.gasUsagePercent.toFixed(1)}%)`
                      : analysis.gasUsagePercent > 80
                        ? `Elevated gas usage (${analysis.gasUsagePercent.toFixed(1)}%)`
                        : `Normal gas usage (${analysis.gasUsagePercent.toFixed(1)}%)`}
                </div>
              </div>

              {/* Participation */}
              <div
                className={clsx(
                  'grid grid-cols-[16px_1fr] items-start gap-1',
                  !analysis.participation && 'text-tertiary',
                  analysis.participation && analysis.participation >= 80 && 'text-success',
                  analysis.participation &&
                    analysis.participation >= 66 &&
                    analysis.participation < 80 &&
                    'text-warning',
                  analysis.participation && analysis.participation < 66 && 'text-error',
                )}
              >
                <div className="flex justify-center">
                  {!analysis.participation
                    ? '○'
                    : analysis.participation < 66
                      ? '⚠️'
                      : analysis.participation < 80
                        ? '⚡'
                        : '✓'}
                </div>
                <div className="text-[10px]">
                  {!analysis.participation
                    ? 'Participation unknown'
                    : analysis.participation < 66
                      ? `Low participation (${analysis.participation.toFixed(1)}%)`
                      : analysis.participation < 80
                        ? `Moderate participation (${analysis.participation.toFixed(1)}%)`
                        : `Good participation (${analysis.participation.toFixed(1)}%)`}
                </div>
              </div>

              {/* MEV Relay */}
              {analysis.hasMevRelay ? (
                <div className="grid grid-cols-[16px_1fr] items-start gap-1 text-amber-400">
                  <div className="flex justify-center">⚡</div>
                  <div className="text-[10px]">
                    Delivered via {Object.keys(slotData.deliveredPayloads).length} MEV{' '}
                    {Object.keys(slotData.deliveredPayloads).length === 1 ? 'Relay' : 'Relays'}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-[16px_1fr] items-start gap-1 text-success">
                  <div className="flex justify-center">✓</div>
                  <div className="text-[10px]">Block built locally</div>
                </div>
              )}
            </div>
          )}

          {/* Block Info */}
          <div className="space-y-2 text-xs font-mono">
            {/* Epoch & Proposer Info */}
            <div className="rounded bg-surface/50 p-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <div className="text-tertiary">Epoch</div>
                  <div className="text-primary">
                    <a
                      href={`https://beaconcha.in/epoch/${Math.floor(slot! / 32)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-accent"
                    >
                      {Math.floor(slot! / 32)}
                    </a>
                  </div>
                </div>
                <div>
                  <div className="text-tertiary">Slot in Epoch</div>
                  <div className="text-primary">
                    <a
                      href={`https://beaconcha.in/slot/${slot}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-accent"
                    >
                      {(slot! % 32) + 1}/32
                    </a>
                  </div>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-x-4">
                  <div>
                    <div className="text-tertiary">Validator</div>
                    <div className="text-primary">
                      <a
                        href={`https://beaconcha.in/validator/${String(slotData?.proposer?.proposerValidatorIndex)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-accent"
                      >
                        {String(slotData?.proposer?.proposerValidatorIndex) || 'Unknown'}
                      </a>
                    </div>
                  </div>
                  {slotData?.block?.executionPayloadBlockNumber ? (
                    <div>
                      <div className="text-tertiary">Block</div>
                      <div className="text-primary">
                        <a
                          href={`https://etherscan.io/block/${String(slotData.block.executionPayloadBlockNumber)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-colors hover:text-accent"
                        >
                          {String(slotData.block.executionPayloadBlockNumber)}
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Block Stats */}
            <div className="rounded bg-surface/50 p-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <div className="text-tertiary">Txns</div>
                  <div className="text-primary">
                    {slotData?.block?.executionPayloadTransactionsCount?.toLocaleString() || '0'}
                  </div>
                </div>

                {slotData?.block?.blockTotalBytes ? (
                  <div>
                    <div className="text-tertiary">Size</div>
                    <div className="text-primary">
                      {(Number(slotData.block.blockTotalBytes) / 1024).toFixed(1)}KB
                    </div>
                  </div>
                ) : null}

                {slotData?.block?.executionPayloadGasUsed ? (
                  <div className="col-span-2 grid grid-cols-2 gap-x-4">
                    <div>
                      <div className="text-tertiary">Gas</div>
                      <div className="text-primary">
                        {(Number(slotData.block.executionPayloadGasUsed) / 1e6).toFixed(1)}M /{' '}
                        {(Number(slotData.block.executionPayloadGasLimit!) / 1e6).toFixed(1)}M
                      </div>
                    </div>
                    {slotData?.block?.executionPayloadBaseFeePerGas ? (
                      <div>
                        <div className="text-tertiary">Base Fee</div>
                        <div className="text-primary">
                          {(Number(slotData.block.executionPayloadBaseFeePerGas) / 1e9).toFixed(2)}{' '}
                          Gwei
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Network Stats */}
            <div className="rounded bg-surface/50 p-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="col-span-2">
                  <div className="text-tertiary">Block First Seen</div>
                  <div className="text-primary">{firstBlockSeenInfo}</div>
                </div>
                <div>
                  <div className="text-tertiary">Blobs</div>
                  <div className="text-primary">{blobCount}</div>
                </div>
                <div>
                  <div className="text-tertiary">Nodes Seen</div>
                  <div className="text-primary">{nodesSeen}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-tertiary">Attestations</div>
                  <div className="text-primary">{attestationsInfo}</div>
                </div>
              </div>
            </div>

            {/* MEV Information Section */}
            <div className="mt-2 rounded bg-surface/50 p-2">
              <div className="mb-1.5 text-sm font-medium text-primary">MEV Data</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono">
                <div>
                  <div className="text-tertiary">Bid Value</div>
                  {winningBid ? (
                    <div className="font-medium text-primary text-amber-400">
                      {winningBid.formattedEth} ETH
                    </div>
                  ) : (
                    <div className="text-tertiary">0.0000 ETH</div>
                  )}
                </div>
                <div>
                  <div className="text-tertiary">Bid Time</div>
                  {winningBid ? (
                    <div className="text-primary">{winningBid.formattedTime}</div>
                  ) : (
                    <div className="text-tertiary">--</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const SlotViewDesktopDetails = memo(
  SlotViewDesktopDetailsComponent,
  (prev, next) =>
    prev.slot === next.slot &&
    prev.network === next.network &&
    prev.slotData === next.slotData &&
    prev.winningBid === next.winningBid,
);
