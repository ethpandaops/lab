import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Alert } from '@/components/Feedback/Alert';
import { BarChart } from '@/components/Charts/Bar';
import { useThemeColors } from '@/hooks/useThemeColors';
import type {
  PreparedBlocksComparisonChartProps,
  ProcessedBlock,
  ChartStats,
} from './PreparedBlocksComparisonChart.types';
import type { FctPreparedBlock } from '@/api/types.gen';

/**
 * Parse client name from meta_client_name field
 * Extracts the execution client name (e.g., "geth", "besu", "nethermind")
 *
 * @param metaClientName - Full client name string (e.g., "geth-lighthouse-1")
 * @returns Execution client name or "unknown"
 */
function parseExecutionClient(metaClientName?: string): string {
  if (!metaClientName) return 'unknown';

  // Common execution client patterns
  const lowerName = metaClientName.toLowerCase();
  if (lowerName.includes('geth')) return 'geth';
  if (lowerName.includes('besu')) return 'besu';
  if (lowerName.includes('nethermind')) return 'nethermind';
  if (lowerName.includes('erigon')) return 'erigon';
  if (lowerName.includes('reth')) return 'reth';

  // Fallback: take first part before delimiter
  const parts = metaClientName.split(/[-_]/);
  return parts[0] || 'unknown';
}

/**
 * Calculate total reward for a block in wei
 * Reward = execution_payload_value + consensus_payload_value
 *
 * @param block - Block data
 * @returns Total reward in wei as string
 */
function calculateRewardWei(block: FctPreparedBlock | PreparedBlocksComparisonChartProps['proposedBlock']): string {
  if (!block) return '0';

  const execValue = BigInt(block.execution_payload_value || '0');
  const consensusValue = BigInt(block.consensus_payload_value || '0');

  return (execValue + consensusValue).toString();
}

/**
 * Convert wei to ETH
 *
 * @param weiValue - Value in wei as string
 * @returns Value in ETH
 */
function weiToEth(weiValue: string): number {
  const wei = BigInt(weiValue);
  const eth = Number(wei) / 1e18;
  return eth;
}

/**
 * PreparedBlocksComparisonChart - Compares alternative blocks built by infrastructure
 *
 * Shows a horizontal bar chart comparing the rewards of prepared blocks (by execution client)
 * versus the actually proposed block. Highlights which execution client would have been optimal
 * and calculates the missed opportunity (delta) if any.
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
 * />
 * ```
 */
export function PreparedBlocksComparisonChart({
  preparedBlocks,
  proposedBlock,
  winningBidTimestamp,
}: PreparedBlocksComparisonChartProps): JSX.Element {
  const themeColors = useThemeColors();

  // Process blocks and calculate rewards
  const { processedBlocks, stats, filteredCount } = useMemo((): {
    processedBlocks: ProcessedBlock[];
    stats: ChartStats;
    filteredCount: number;
  } => {
    // Filter prepared blocks to only show those created before or at the winning bid timestamp
    let filteredPreparedBlocks = preparedBlocks;
    const originalCount = preparedBlocks.length;

    if (winningBidTimestamp !== undefined && winningBidTimestamp !== null) {
      filteredPreparedBlocks = preparedBlocks.filter(block => {
        // Use event_date_time field which is when the block was prepared
        return block.event_date_time && block.event_date_time <= winningBidTimestamp;
      });
    }

    // Group prepared blocks by execution client and take the best (highest reward) from each
    const clientMap = new Map<string, ProcessedBlock>();

    for (const block of filteredPreparedBlocks) {
      const clientName = parseExecutionClient(block.meta_client_name);
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
  }, [preparedBlocks, proposedBlock, winningBidTimestamp]);

  // Prepare data for BarChart component
  const { chartData, chartLabels, tooltipFormatter } = useMemo(() => {
    const labels = processedBlocks.map(b => b.clientName);
    const data = processedBlocks.map(b => ({
      value: b.rewardEth,
      color: b.isProposed ? themeColors.accent : themeColors.success,
    }));

    const formatter = (params: unknown) => {
      if (!Array.isArray(params) || params.length === 0) return '';
      const param = params[0] as { name: string; value: number; dataIndex: number };
      const block = processedBlocks[param.dataIndex];

      let tooltip = `<strong>${param.name}</strong><br/>`;
      tooltip += `Reward: ${param.value.toFixed(6)} ETH<br/>`;

      if (!block.isProposed && 'execution_payload_transactions_count' in block.originalBlock) {
        const txCount = (block.originalBlock as FctPreparedBlock).execution_payload_transactions_count;
        tooltip += `Transactions: ${txCount?.toLocaleString() || 0}<br/>`;
        tooltip += `Version: ${block.clientVersion}`;
      }

      return tooltip;
    };

    return { chartData: data, chartLabels: labels, tooltipFormatter: formatter };
  }, [processedBlocks, themeColors.accent, themeColors.success]);

  // Handle empty data
  if (preparedBlocks.length === 0) {
    return (
      <PopoutCard title="Prepared Blocks Comparison" modalSize="full">
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
    ? `${stats.preparedBlockCount} prepared blocks • Best: ${stats.bestClientName} (${stats.bestPreparedRewardEth.toFixed(2)} ETH)`
    : undefined;

  return (
    <PopoutCard title="Prepared Blocks Comparison" subtitle={subtitle} modalSize="full">
      {({ inModal }) => (
        <div className="space-y-4">
          {/* Disclaimer about prepared blocks */}
          <Alert
            variant="info"
            description="Alternative blocks built by our infrastructure. These blocks were prepared but not selected by the validator."
          />

          {/* Show filter info if blocks were filtered */}
          {filteredCount > 0 && (
            <div className="text-sm text-muted">
              Showing {stats.preparedBlockCount} blocks prepared before winning bid ({filteredCount} filtered out)
            </div>
          )}

          <div className={inModal ? 'h-96' : 'h-72'}>
            <BarChart
              data={chartData}
              labels={chartLabels}
              orientation="horizontal"
              height="100%"
              axisName="Total Reward (ETH)"
              labelFormatter="{c} ETH"
              tooltipFormatter={tooltipFormatter}
              animationDuration={0}
            />
          </div>
        </div>
      )}
    </PopoutCard>
  );
}
