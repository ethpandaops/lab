import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Alert } from '@/components/Feedback/Alert';
import { BarChart } from '@/components/Charts/Bar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { weiToEth, extractExecutionClient } from '@/utils';
import type {
  PreparedBlocksComparisonChartProps,
  ProcessedBlock,
  ChartStats,
} from './PreparedBlocksComparisonChart.types';
import type { FctPreparedBlock } from '@/api/types.gen';

/**
 * Calculate execution layer reward for a block in wei
 * Only uses execution_payload_value for fair comparison with MEV bids
 *
 * @param block - Block data
 * @returns Execution layer reward in wei as string
 */
function calculateRewardWei(block: FctPreparedBlock | PreparedBlocksComparisonChartProps['proposedBlock']): string {
  if (!block) return '0';

  const execValue = BigInt(block.execution_payload_value || '0');

  return execValue.toString();
}

/**
 * PreparedBlocksComparisonChart - Compares alternative blocks built by infrastructure
 *
 * Shows a horizontal bar chart comparing the rewards of prepared blocks (by execution client)
 * versus the actually proposed block. Highlights which execution client would have been optimal
 * and calculates the missed opportunity (delta) if any.
 *
 * Filters prepared blocks by timestamp:
 * - If `winningBidTimestamp` is provided: shows blocks prepared before MEV bid (MEV boost scenario)
 * - Otherwise uses `slotStartTime`: shows blocks prepared before slot start (local building scenario)
 *
 * @example
 * ```tsx
 * <PreparedBlocksComparisonChart
 *   preparedBlocks={[
 *     { meta_client_name: 'geth-1', execution_payload_value: '...', ... },
 *     { meta_client_name: 'besu-1', execution_payload_value: '...', ... },
 *   ]}
 *   proposedBlock={{
 *     execution_payload_value: '...',
 *     consensus_payload_value: '...',
 *   }}
 *   winningBidTimestamp={1234567890}
 *   slotStartTime={1234567800}
 * />
 * ```
 */
export function PreparedBlocksComparisonChart({
  preparedBlocks,
  proposedBlock,
  winningBidTimestamp,
  slotStartTime,
}: PreparedBlocksComparisonChartProps): JSX.Element {
  const themeColors = useThemeColors();

  // Process blocks and calculate rewards
  const { processedBlocks, stats, filteredCount } = useMemo((): {
    processedBlocks: ProcessedBlock[];
    stats: ChartStats;
    filteredCount: number;
  } => {
    // Filter prepared blocks to only show those created before or at the cutoff time
    // If winningBidTimestamp is available, use it (MEV boost scenario)
    // Otherwise, fall back to slotStartTime (local building scenario)
    let filteredPreparedBlocks = preparedBlocks;
    const originalCount = preparedBlocks.length;

    const cutoffTime = winningBidTimestamp ?? slotStartTime;

    if (cutoffTime !== undefined && cutoffTime !== null) {
      filteredPreparedBlocks = preparedBlocks.filter(block => {
        // Use event_date_time field which is when the block was prepared
        return block.event_date_time && block.event_date_time <= cutoffTime;
      });
    }

    // Group prepared blocks by execution client and take the best (highest reward) from each
    const clientMap = new Map<string, ProcessedBlock>();

    for (const block of filteredPreparedBlocks) {
      // Extract execution client from meta_client_name (searches for known client names)
      const clientName = extractExecutionClient(block.meta_client_name) || 'Unknown';
      const rewardWei = calculateRewardWei(block);
      const rewardEth = weiToEth(rewardWei);

      const existing = clientMap.get(clientName);
      if (!existing || rewardEth > existing.rewardEth) {
        clientMap.set(clientName, {
          clientName,
          clientVersion: block.meta_client_version || 'unknown',
          transactionCount: block.execution_payload_transactions_count || 0,
          rewardEth,
          rewardWei,
          isProposed: false,
          originalBlock: block,
        });
      }
    }

    const processed: ProcessedBlock[] = Array.from(clientMap.values());

    // Add proposed block if available
    let proposedRewardEth = 0;
    if (proposedBlock) {
      const rewardWei = calculateRewardWei(proposedBlock);
      proposedRewardEth = weiToEth(rewardWei);

      processed.push({
        clientName: 'Proposed Block',
        clientVersion: '',
        transactionCount: 0,
        rewardEth: proposedRewardEth,
        rewardWei,
        isProposed: true,
        originalBlock: proposedBlock,
      });
    }

    // Sort by reward descending
    processed.sort((a, b) => b.rewardEth - a.rewardEth);

    // Calculate stats
    const bestPrepared = processed.find(b => !b.isProposed);
    const bestPreparedRewardEth = bestPrepared?.rewardEth || 0;
    const bestClientName = bestPrepared?.clientName || null;
    const deltaEth = bestPreparedRewardEth - proposedRewardEth;
    const deltaPercent = proposedRewardEth > 0 ? (deltaEth / proposedRewardEth) * 100 : 0;

    const chartStats: ChartStats = {
      preparedBlockCount: filteredPreparedBlocks.length,
      bestClientName,
      bestPreparedRewardEth,
      proposedRewardEth,
      deltaEth,
      deltaPercent,
    };

    return {
      processedBlocks: processed,
      stats: chartStats,
      filteredCount: originalCount - filteredPreparedBlocks.length,
    };
  }, [preparedBlocks, proposedBlock, winningBidTimestamp, slotStartTime]);

  // Prepare data for BarChart component
  const { chartData, chartLabels, tooltipFormatter } = useMemo(() => {
    const labels = processedBlocks.map(b => b.clientName);
    const data = processedBlocks.map(b => ({
      value: b.rewardEth,
      color: b.isProposed ? themeColors.accent : themeColors.success,
    }));

    const formatter = (params: unknown): string => {
      if (!Array.isArray(params) || params.length === 0) return '';
      const param = params[0] as { name: string; value: number | number[]; data: { value: number }; dataIndex: number };
      const block = processedBlocks[param.dataIndex];

      // Handle both direct value and data.value formats
      const value = typeof param.value === 'number' ? param.value : (param.data?.value ?? 0);

      let tooltip = `<strong>${param.name}</strong><br/>`;
      tooltip += `Reward: ${value.toFixed(5)} ETH<br/>`;

      if (!block.isProposed && 'execution_payload_transactions_count' in block.originalBlock) {
        const txCount = (block.originalBlock as FctPreparedBlock).execution_payload_transactions_count;
        tooltip += `Transactions: ${txCount?.toLocaleString() || 0}<br/>`;
      }

      return tooltip;
    };

    return { chartData: data, chartLabels: labels, tooltipFormatter: formatter };
  }, [processedBlocks, themeColors.accent, themeColors.success]);

  // Handle empty data
  if (preparedBlocks.length === 0) {
    return (
      <PopoutCard title="Prepared Blocks Comparison" anchorId="prepared-blocks" modalSize="full">
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex h-96 items-center justify-center text-muted'
                : 'flex h-72 items-center justify-center text-muted'
            }
          >
            <p>No prepared blocks available for comparison</p>
          </div>
        )}
      </PopoutCard>
    );
  }

  // Build subtitle with statistics
  const subtitle = stats.bestClientName
    ? `${stats.preparedBlockCount} prepared blocks • Best: ${stats.bestClientName} (${stats.bestPreparedRewardEth.toFixed(5)} ETH)`
    : undefined;

  return (
    <PopoutCard title="Prepared Blocks Comparison" anchorId="prepared-blocks" subtitle={subtitle} modalSize="full">
      {({ inModal }) => (
        <div className="space-y-4">
          {/* Disclaimer about prepared blocks */}
          <Alert
            variant="info"
            description="Alternative blocks built by nodes the ethPandaOps team operates. This shows the hypothetical rewards of the best prepared block for each execution client compared to the actually proposed block."
          />

          {/* Show filter info if blocks were filtered */}
          {filteredCount > 0 && (
            <div className="text-sm text-muted">
              Showing {stats.preparedBlockCount} blocks prepared before{' '}
              {winningBidTimestamp ? 'winning bid' : 'slot start'} ({filteredCount} filtered out)
            </div>
          )}

          <div className={inModal ? 'h-96' : 'h-72'}>
            <BarChart
              data={chartData}
              labels={chartLabels}
              orientation="horizontal"
              height="100%"
              axisName="Total Reward (ETH)"
              showLabel={false}
              tooltipFormatter={tooltipFormatter}
              animationDuration={0}
            />
          </div>
        </div>
      )}
    </PopoutCard>
  );
}
