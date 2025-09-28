import { memo } from 'react';
import clsx from 'clsx';
import { analyzeSlotData } from './slotAnalysis';
import type { WinningBid } from './types';

interface SlotViewMobileDetailsProps {
  slot?: number;
  network: string;
  slotData: any;
  winningBid: WinningBid | null;
  onViewStats: () => void;
}

function SlotViewMobileDetailsComponent({
  slot,
  network,
  slotData,
  winningBid,
  onViewStats,
}: SlotViewMobileDetailsProps) {
  const analysis = analyzeSlotData(slotData);

  return (
    <div className="border-b border-subtle">
      <div className="p-1.5">
        {/* Slot Header */}
        <div className="mb-1 flex items-center justify-between">
          <div>
            <div className="text-xl font-sans font-black text-primary">
              <a
                href={`https://beaconcha.in/slot/${slot}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Slot {slot}
              </a>
            </div>
            <div className="text-[10px] font-mono text-tertiary">
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
            </div>
            {slotData?.block?.blockVersion && (
              <div className="mt-1 flex gap-1">
                <div className="inline-flex items-center rounded border border-cyber-neon bg-cyber-dark px-1.5 py-0.5 text-[10px] font-mono font-medium text-cyber-neon">
                  {slotData.block.blockVersion.toUpperCase()}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onViewStats}
            className="rounded-full bg-accent px-2 py-1 text-xs font-medium text-black shadow-lg transition-colors hover:bg-accent/90"
          >
            View Stats
          </button>
        </div>

        {/* Analysis Section */}
        {slotData && (
          <div className="space-y-0.5 rounded bg-surface/30 text-xs font-mono">
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
                analysis.firstBlockTime !== null && analysis.firstBlockTime > 3000 && 'text-error',
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
                (!analysis.firstBlobTime || !analysis.firstBlockTime || analysis.blobCount === 0) &&
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

        {/* MEV Information */}
        <div className="mt-1.5 rounded bg-surface/30 p-1.5">
          <div className="mb-1 text-[10px] font-medium text-primary">MEV Data</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-mono text-primary">
            <div>
              <div className="text-tertiary">Bid Value</div>
              {winningBid ? (
                <div className="font-medium text-amber-400">{winningBid.formattedEth} ETH</div>
              ) : (
                <div className="text-tertiary">0.0000 ETH</div>
              )}
            </div>
            <div>
              <div className="text-tertiary">Bid Time</div>
              {winningBid ? (
                <div>{winningBid.formattedTime}</div>
              ) : (
                <div className="text-tertiary">--</div>
              )}
            </div>
            <div>
              <div className="text-tertiary">Relay</div>
              {winningBid ? <div>{winningBid.relay}</div> : <div className="text-tertiary">--</div>}
            </div>
            <div>
              <div className="text-tertiary">Builder</div>
              {winningBid ? (
                <div className="truncate" title={winningBid.builderPubkey}>
                  {winningBid.builderPubkey?.substring(0, 6)}...
                </div>
              ) : (
                <div className="text-tertiary">--</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const SlotViewMobileDetails = memo(
  SlotViewMobileDetailsComponent,
  (prev, next) =>
    prev.slot === next.slot &&
    prev.network === next.network &&
    prev.slotData === next.slotData &&
    prev.winningBid === next.winningBid,
);
