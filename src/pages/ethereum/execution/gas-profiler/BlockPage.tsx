import { type JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearch, useNavigate, Link } from '@tanstack/react-router';
import { Tab as HeadlessTab } from '@headlessui/react';
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  QueueListIcon,
  FireIcon,
  ArrowsPointingOutIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import ReactECharts from 'echarts-for-react';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { Tab } from '@/components/Navigation/Tab';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Alert } from '@/components/Feedback/Alert';
import { useThemeColors } from '@/hooks/useThemeColors';
import { EtherscanIcon } from '@/components/Ethereum/EtherscanIcon';
import { TenderlyIcon } from '@/components/Ethereum/TenderlyIcon';
import { GasTooltip } from '@/components/DataDisplay/GasTooltip';
import { intBlockOpcodeGasServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { useBlockTransactions, type TransactionSummary } from './hooks/useBlockTransactions';
import {
  GasProfilerSkeleton,
  TransactionSummaryCard,
  OpcodeAnalysis,
  CategoryPieChart,
  GasFormula,
  ContractInteractionsTable,
  CallsVsGasChart,
  TopItemsByGasTable,
  GasHistogram,
  TRANSACTION_BUCKETS,
  BlockOpcodeHeatmap,
  ContractActionPopover,
} from './components';
import type { ContractInteractionItem, TopGasItem } from './components';
import { useNetwork } from '@/hooks/useNetwork';
import { CATEGORY_COLORS, CALL_TYPE_COLORS, getOpcodeCategory } from './utils';
import type { GasProfilerBlockSearch } from './IndexPage.types';

/**
 * Available call types for filtering
 */
const CALL_TYPES = ['CALL', 'CREATE', 'CREATE2', 'DELEGATECALL', 'STATICCALL'] as const;

/**
 * Format gas value with comma separators
 */
function formatGas(value: number): string {
  return value.toLocaleString();
}

/**
 * Sort field type for transactions table
 */
type TransactionSortField = 'index' | 'gas' | 'calls' | 'depth';

/**
 * Filter and sort transactions based on current settings
 */
function filterAndSortTransactions(
  transactions: TransactionSummary[],
  sort: TransactionSortField,
  sortDir: 'asc' | 'desc',
  callTypeFilter?: string
): TransactionSummary[] {
  // Filter by call type if specified
  let filtered = transactions;
  if (callTypeFilter) {
    filtered = transactions.filter(tx => tx.rootCallType === callTypeFilter);
  }

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'gas':
        return a.totalGasUsed - b.totalGasUsed;
      case 'calls':
        return a.frameCount - b.frameCount;
      case 'depth':
        return a.maxDepth - b.maxDepth;
      case 'index':
      default:
        return a.transactionIndex - b.transactionIndex;
    }
  });

  return sortDir === 'desc' ? sorted.reverse() : sorted;
}

// Tab hash values for URL-based navigation
const BLOCK_TAB_HASHES = ['overview', 'opcodes', 'transactions', 'calls'] as const;

/**
 * Block detail page - shows all transactions in a block with analytics
 */
export function BlockPage(): JSX.Element {
  const { blockNumber: blockNumberParam } = useParams({
    from: '/ethereum/execution/gas-profiler/block/$blockNumber',
  });
  const search = useSearch({ from: '/ethereum/execution/gas-profiler/block/$blockNumber' }) as GasProfilerBlockSearch;
  const navigate = useNavigate({ from: '/ethereum/execution/gas-profiler/block/$blockNumber' });
  const colors = useThemeColors();
  const { currentNetwork } = useNetwork();

  const blockNumber = parseInt(blockNumberParam, 10);

  // Load more state for transaction list
  const INITIAL_VISIBLE_COUNT = 10;
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  // Local state for table sorting (avoids scroll reset from URL param changes)
  const [sortField, setSortField] = useState<TransactionSortField>('gas');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // State for contract action popover
  const [contractPopover, setContractPopover] = useState<{
    address: string;
    name: string | null;
    gas: number;
    percentage: number;
    position: { x: number; y: number };
    txHash?: string;
  } | null>(null);

  // Tab state based on URL hash
  const getTabIndexFromHash = useCallback(() => {
    const hash = window.location.hash.slice(1);
    const index = BLOCK_TAB_HASHES.indexOf(hash as (typeof BLOCK_TAB_HASHES)[number]);
    return index >= 0 ? index : 0;
  }, []);
  const [selectedTabIndex, setSelectedTabIndex] = useState(getTabIndexFromHash);

  // Listen for popstate (browser back/forward) to sync tab with hash
  useEffect(() => {
    const handlePopState = (): void => {
      setSelectedTabIndex(getTabIndexFromHash());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getTabIndexFromHash]);

  // Fetch block transactions
  const { data, isLoading, error, bounds, boundsLoading } = useBlockTransactions({
    blockNumber,
  });

  // Fetch block opcode gas data (all opcodes for block-wide aggregation)
  const { data: opcodeData } = useQuery({
    ...intBlockOpcodeGasServiceListOptions({
      query: {
        block_number_eq: blockNumber,
        order_by: 'gas DESC',
        page_size: 10000, // Fetch all opcodes
      },
    }),
    enabled: !isNaN(blockNumber),
  });

  // Handle sort change (uses local state to avoid scroll reset)
  const handleSortChange = useCallback(
    (newSort: TransactionSortField) => {
      if (sortField === newSort) {
        // Toggle direction
        setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        // Default to desc for gas/calls/depth (show highest first), asc for index
        const defaultDir = newSort === 'index' ? 'asc' : 'desc';
        setSortField(newSort);
        setSortDir(defaultDir);
      }
    },
    [sortField]
  );

  // Handle call type filter change
  const handleFilterChange = useCallback(
    (callType: string | undefined) => {
      navigate({
        search: prev => ({
          ...prev,
          callType,
        }),
      });
    },
    [navigate]
  );

  // Handle treemap click - navigate to transaction page
  const handleTreemapClick = useCallback(
    (params: { data?: { txHash?: string; txIndex?: number } }) => {
      const txHash = params.data?.txHash;
      // Only navigate if it's a real transaction (not the "Other" aggregate)
      if (txHash && params.data?.txIndex !== undefined && params.data.txIndex >= 0) {
        navigate({
          to: '/ethereum/execution/gas-profiler/tx/$txHash',
          params: { txHash },
          search: { block: blockNumber },
        });
      }
    },
    [navigate, blockNumber]
  );

  // Filter and sort transactions (default to gas desc if not specified)
  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    return filterAndSortTransactions(data.transactions, sortField, sortDir, search.callType);
  }, [data?.transactions, sortField, sortDir, search.callType]);

  // Calculate total gas for percentage (from all transactions, not filtered)
  const totalBlockGas = useMemo(() => {
    return (data?.transactions ?? []).reduce((sum, tx) => sum + tx.totalGasUsed, 0);
  }, [data?.transactions]);

  // Max call depth in block
  const maxBlockDepth = useMemo(() => {
    if (!data?.transactions?.length) return 0;
    return Math.max(...data.transactions.map(tx => tx.maxDepth));
  }, [data?.transactions]);

  // Get unique call types in this block
  const availableCallTypes = useMemo(() => {
    if (!data?.transactions) return [];
    const types = new Set(data.transactions.map(tx => tx.rootCallType));
    return CALL_TYPES.filter(t => types.has(t));
  }, [data?.transactions]);

  // Block opcode data (from API) - transformed for OpcodeAnalysis component
  const opcodeStats = useMemo(() => {
    if (!opcodeData?.int_block_opcode_gas) return [];
    return opcodeData.int_block_opcode_gas.map(op => ({
      opcode: op.opcode ?? 'UNKNOWN',
      totalGas: op.gas ?? 0,
      count: op.count ?? 0,
    }));
  }, [opcodeData]);

  // Calculate opcode category breakdown for pie chart (by gas)
  const opcodeCategoryData = useMemo(() => {
    if (!opcodeStats.length) return [];
    const categoryMap = new Map<string, number>();

    for (const op of opcodeStats) {
      const category = getOpcodeCategory(op.opcode);
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + op.totalGas);
    }

    return [...categoryMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [opcodeStats]);

  // Calculate opcode category breakdown for pie chart (by count)
  const opcodeCategoryCountData = useMemo(() => {
    if (!opcodeStats.length) return [];
    const categoryMap = new Map<string, number>();

    for (const op of opcodeStats) {
      const category = getOpcodeCategory(op.opcode);
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + op.count);
    }

    return [...categoryMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [opcodeStats]);

  // Call type distribution for pie chart - by count
  const callTypeChartData = useMemo(() => {
    if (!data?.callTypeDistribution) return [];
    return data.callTypeDistribution.map(d => ({ name: d.callType, value: d.count }));
  }, [data?.callTypeDistribution]);

  // Call type distribution for pie chart - by gas
  const callTypeGasChartData = useMemo(() => {
    if (!data?.callTypeDistribution) return [];
    return data.callTypeDistribution.map(d => ({ name: d.callType, value: d.gasUsed }));
  }, [data?.callTypeDistribution]);

  // ============================================================================
  // CHART OPTIONS
  // ============================================================================

  // Gas Distribution Treemap (top 30 transactions by gas)
  const gasDistributionOption = useMemo(() => {
    if (!data?.transactions?.length) return {};

    const sortedTxs = [...data.transactions].sort((a, b) => b.totalGasUsed - a.totalGasUsed);
    const topTxs = sortedTxs.slice(0, 30);
    const otherGas = sortedTxs.slice(30).reduce((sum, tx) => sum + tx.totalGasUsed, 0);

    const treeData = topTxs.map((tx, i) => ({
      // Use contract name if available, otherwise truncated hash
      name: tx.targetName || `${tx.transactionHash.slice(0, 6)}...${tx.transactionHash.slice(-4)}`,
      value: tx.totalGasUsed,
      txHash: tx.transactionHash,
      txIndex: tx.transactionIndex,
      targetName: tx.targetName,
      targetAddress: tx.targetAddress,
      rootCallType: tx.rootCallType,
      frameCount: tx.frameCount,
      maxDepth: tx.maxDepth,
      hasErrors: tx.hasErrors,
      itemStyle: {
        color: tx.hasErrors
          ? '#ef4444'
          : [
              colors.primary,
              '#22c55e',
              '#f59e0b',
              '#8b5cf6',
              '#ec4899',
              '#06b6d4',
              '#84cc16',
              '#f97316',
              '#6366f1',
              '#14b8a6',
            ][i % 10],
      },
    }));

    if (otherGas > 0) {
      treeData.push({
        name: `Other (${sortedTxs.length - 30} TXs)`,
        value: otherGas,
        txHash: '',
        txIndex: -1,
        targetName: null,
        targetAddress: null,
        rootCallType: '',
        frameCount: 0,
        maxDepth: 0,
        hasErrors: false,
        itemStyle: { color: colors.muted },
      });
    }

    return {
      series: [
        {
          type: 'treemap',
          data: treeData,
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          label: {
            show: true,
            formatter: (params: { name: string; value: number }) => {
              const pct = ((params.value / totalBlockGas) * 100).toFixed(1);
              return `${params.name}\n${pct}%`;
            },
            color: '#fff',
            fontSize: 11,
            overflow: 'truncate',
            ellipsis: '...',
          },
          upperLabel: {
            show: false,
          },
          itemStyle: {
            borderColor: colors.background,
            borderWidth: 2,
            gapWidth: 1,
          },
          // Hide labels in cells smaller than this threshold
          visibleMin: 300,
          // Show pointer cursor on hover
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
        },
      ],
      tooltip: {
        backgroundColor: colors.background,
        borderColor: colors.border,
        padding: 0,
        appendToBody: true,
        formatter: (params: {
          name: string;
          value: number;
          data: {
            txIndex: number;
            txHash: string;
            targetName: string | null;
            targetAddress: string | null;
            rootCallType: string;
            frameCount: number;
            maxDepth: number;
            hasErrors: boolean;
          };
        }) => {
          const pct = ((params.value / totalBlockGas) * 100).toFixed(2);
          const d = params.data;

          // "Other" aggregated row
          if (d.txIndex < 0) {
            return `
              <div style="padding: 12px;">
                <div style="font-weight: 600; font-size: 14px; color: ${colors.foreground};">${params.name}</div>
                <div style="margin-top: 8px;">
                  <div style="color: ${colors.primary}; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">GAS</div>
                  <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 12px;">
                    <span style="color: ${colors.muted};">Total</span>
                    <span style="font-family: monospace; color: ${colors.foreground};">${formatGas(params.value)} gas</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-top: 2px; font-size: 12px;">
                    <span style="color: ${colors.muted};">% of Block</span>
                    <span style="font-family: monospace; color: ${colors.foreground};">${pct}%</span>
                  </div>
                </div>
              </div>
            `;
          }

          // Call type badge colors
          const callTypeBg: Record<string, string> = {
            CALL: '#3b82f6',
            CREATE: '#f97316',
            CREATE2: '#f59e0b',
            DELEGATECALL: '#a855f7',
            STATICCALL: '#06b6d4',
          };
          const badgeColor = callTypeBg[d.rootCallType] ?? '#6b7280';

          // Truncate hash for display
          const shortHash = d.txHash ? `${d.txHash.slice(0, 10)}...${d.txHash.slice(-8)}` : '';

          return `
            <div>
              <!-- Header -->
              <div style="padding: 8px 12px; border-bottom: 1px solid ${colors.border}; background: ${colors.surface};">
                <div style="font-weight: 600; font-size: 14px; color: ${colors.foreground}; font-family: monospace;">${shortHash}</div>
                ${d.targetName ? `<div style="color: ${colors.muted}; font-size: 12px; margin-top: 2px;">${d.targetName}</div>` : ''}
                <span style="display: inline-block; margin-top: 6px; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; color: white; background: ${badgeColor};">${d.rootCallType}</span>
              </div>

              <!-- Body -->
              <div style="padding: 12px;">
                <!-- Gas Section -->
                <div style="margin-bottom: 12px;">
                  <div style="color: ${colors.primary}; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">GAS</div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span style="color: ${colors.muted};">• Total</span>
                    <span style="font-family: monospace; color: ${colors.foreground};">${formatGas(params.value)} gas</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 2px;">
                    <span style="color: ${colors.muted};">• % of Block</span>
                    <span style="font-family: monospace; color: ${colors.foreground};">${pct}%</span>
                  </div>
                </div>

                <!-- Details Section -->
                <div>
                  <div style="color: ${colors.primary}; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">DETAILS</div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span style="color: ${colors.muted};">TX Index</span>
                    <span style="font-family: monospace; color: ${colors.foreground};">${d.txIndex}</span>
                  </div>
                  ${
                    d.targetAddress
                      ? `<div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 2px;">
                      <span style="color: ${colors.muted};">Target</span>
                      <span style="font-family: monospace; color: ${colors.foreground};">${d.targetAddress.slice(0, 8)}...${d.targetAddress.slice(-6)}</span>
                    </div>`
                      : ''
                  }
                  <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 2px;">
                    <span style="color: ${colors.muted};">Call Frames</span>
                    <span style="font-family: monospace; color: ${colors.foreground};">${d.frameCount.toLocaleString()}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 2px;">
                    <span style="color: ${colors.muted};">Max Depth</span>
                    <span style="font-family: monospace; color: ${colors.foreground};">${d.maxDepth}</span>
                  </div>
                </div>

                ${
                  d.hasErrors
                    ? `<!-- Error Indicator -->
                <div style="margin-top: 12px; padding: 6px 8px; border-radius: 4px; background: rgba(239, 68, 68, 0.1); display: flex; align-items: center; gap: 6px;">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: #ef4444;"></span>
                  <span style="color: #ef4444; font-size: 11px;">Transaction failed</span>
                </div>`
                    : ''
                }
              </div>
            </div>
          `;
        },
      },
    };
  }, [data?.transactions, totalBlockGas, colors]);

  // Block Gas Breakdown - aggregate intrinsic, EVM execution, and refunds
  const blockGasBreakdown = useMemo(() => {
    if (!data?.transactions?.length) {
      return { totalIntrinsic: 0, totalEvm: 0, totalRefund: 0, totalReceipt: 0 };
    }

    let totalIntrinsic = 0;
    let totalReceipt = 0;
    let totalRefund = 0;

    for (const tx of data.transactions) {
      totalReceipt += tx.totalGasUsed;
      totalIntrinsic += tx.intrinsicGas ?? 0;
      totalRefund += tx.gasRefund;
    }

    // EVM execution = Receipt + Refund - Intrinsic
    const totalEvm = totalReceipt + totalRefund - totalIntrinsic;

    return { totalIntrinsic, totalEvm, totalRefund, totalReceipt };
  }, [data?.transactions]);

  // Determine refund cap percentage based on fork (London changed from 50% to 20%)
  const refundCapPercent = useMemo(() => {
    const londonBlock = currentNetwork?.forks?.execution?.london?.block ?? 0;
    return blockNumber >= londonBlock ? '20%' : '50%';
  }, [blockNumber, currentNetwork]);

  // Top transactions by gas as TopGasItem[] for the reusable table component
  const topTransactionsItems = useMemo((): TopGasItem[] => {
    if (!data?.transactions?.length) return [];
    return [...data.transactions]
      .sort((a, b) => b.totalGasUsed - a.totalGasUsed)
      .map(tx => ({
        id: tx.transactionHash,
        name: tx.targetName,
        identifier: tx.transactionHash,
        gas: tx.totalGasUsed,
        index: tx.transactionIndex,
        hasError: tx.hasErrors,
      }));
  }, [data?.transactions]);

  // Transaction gas values for histogram
  const transactionGasValues = useMemo(() => {
    if (!data?.transactions?.length) return [];
    return data.transactions.map(tx => tx.totalGasUsed);
  }, [data?.transactions]);

  // Contract treemap data
  const contractTreemapOption = useMemo(() => {
    if (!data?.allContractsByGas?.length || !totalBlockGas) return {};

    const sortedContracts = [...data.allContractsByGas].sort((a, b) => b.gas - a.gas);
    const topContracts = sortedContracts.slice(0, 30);
    const otherGas = sortedContracts.slice(30).reduce((sum, c) => sum + c.gas, 0);

    const treeData = topContracts.map((c, i) => ({
      name: c.name || `${c.address.slice(0, 6)}...${c.address.slice(-4)}`,
      value: c.gas,
      address: c.address,
      callCount: c.callCount,
      callTypes: c.callTypes,
      firstTxHash: c.firstTxHash,
      itemStyle: {
        color: [
          colors.primary,
          '#22c55e',
          '#f59e0b',
          '#8b5cf6',
          '#ec4899',
          '#06b6d4',
          '#84cc16',
          '#f97316',
          '#6366f1',
          '#14b8a6',
        ][i % 10],
      },
    }));

    if (otherGas > 0) {
      treeData.push({
        name: `Other (${sortedContracts.length - 30} contracts)`,
        value: otherGas,
        address: '',
        callCount: 0,
        callTypes: [],
        firstTxHash: null,
        itemStyle: { color: colors.muted },
      });
    }

    return {
      series: [
        {
          type: 'treemap',
          data: treeData,
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          label: {
            show: true,
            formatter: (params: { name: string; value: number }) => {
              const pct = ((params.value / totalBlockGas) * 100).toFixed(1);
              return `${params.name}\n${pct}%`;
            },
            color: '#fff',
            fontSize: 11,
            overflow: 'truncate',
            ellipsis: '...',
          },
          itemStyle: {
            borderColor: colors.background,
            borderWidth: 2,
            gapWidth: 1,
          },
          visibleMin: 300,
        },
      ],
      tooltip: {
        show: false,
      },
    };
  }, [data?.allContractsByGas, colors, totalBlockGas]);

  // Count of flows shown in Sankey
  const sankeyFlowCount = useMemo(() => {
    if (!data?.txContractFlows?.length) return 0;
    return Math.min(data.txContractFlows.length, 15);
  }, [data?.txContractFlows]);

  // Sankey diagram showing tx → contract flow
  const contractFlowSankeyOption = useMemo(() => {
    if (!data?.txContractFlows?.length) return {};

    // Take only top 15 flows by gas for readability
    const topFlows = data.txContractFlows.slice(0, 15);

    // Get unique transactions and contracts from the top flows
    const txSet = new Set<string>();
    const contractSet = new Set<string>();
    for (const flow of topFlows) {
      txSet.add(flow.txHash);
      contractSet.add(flow.contractAddress);
    }

    // Build node list: transactions on left, contracts on right
    const nodes: { name: string; txHash?: string; itemStyle?: { color: string } }[] = [];
    const txNodeMap = new Map<string, number>();
    const contractNodeMap = new Map<string, number>();

    // Add transaction nodes (sorted by total gas for that tx)
    const txGasMap = new Map<string, number>();
    for (const flow of topFlows) {
      txGasMap.set(flow.txHash, (txGasMap.get(flow.txHash) ?? 0) + flow.gas);
    }
    const sortedTxs = [...txSet].sort((a, b) => (txGasMap.get(b) ?? 0) - (txGasMap.get(a) ?? 0));

    let nodeIdx = 0;
    for (const txHash of sortedTxs) {
      const flow = topFlows.find(f => f.txHash === txHash);
      const label = flow?.txName
        ? `TX ${flow.txIndex}: ${flow.txName.slice(0, 20)}${flow.txName.length > 20 ? '...' : ''}`
        : `TX ${flow?.txIndex ?? '?'}`;
      nodes.push({ name: label, txHash, itemStyle: { color: colors.primary } });
      txNodeMap.set(txHash, nodeIdx++);
    }

    // Add contract nodes (sorted by total gas for that contract)
    // Find the first txHash that called each contract for navigation
    const contractGasMap = new Map<string, number>();
    const contractFirstTx = new Map<string, string>();
    for (const flow of topFlows) {
      contractGasMap.set(flow.contractAddress, (contractGasMap.get(flow.contractAddress) ?? 0) + flow.gas);
      if (!contractFirstTx.has(flow.contractAddress)) {
        contractFirstTx.set(flow.contractAddress, flow.txHash);
      }
    }
    const sortedContracts = [...contractSet].sort(
      (a, b) => (contractGasMap.get(b) ?? 0) - (contractGasMap.get(a) ?? 0)
    );

    for (const addr of sortedContracts) {
      const flow = topFlows.find(f => f.contractAddress === addr);
      const name = flow?.contractName;
      const label = name
        ? `${name.slice(0, 25)}${name.length > 25 ? '...' : ''}`
        : `${addr.slice(0, 8)}...${addr.slice(-6)}`;
      nodes.push({ name: label, txHash: contractFirstTx.get(addr), itemStyle: { color: '#22c55e' } });
      contractNodeMap.set(addr, nodeIdx++);
    }

    // Build links with source/target names for tooltip
    const links = topFlows.map(flow => {
      const sourceIdx = txNodeMap.get(flow.txHash)!;
      const targetIdx = contractNodeMap.get(flow.contractAddress)!;
      return {
        source: sourceIdx,
        target: targetIdx,
        value: flow.gas,
        sourceName: nodes[sourceIdx].name,
        targetName: nodes[targetIdx].name,
        callCount: flow.callCount,
        txHash: flow.txHash,
      };
    });

    const totalFlowGas = topFlows.reduce((sum, f) => sum + f.gas, 0);

    return {
      series: [
        {
          type: 'sankey',
          layout: 'none',
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              opacity: 0.7,
            },
          },
          nodeAlign: 'justify',
          orient: 'horizontal',
          data: nodes,
          links,
          left: '5%',
          right: '12%',
          top: 15,
          bottom: 15,
          nodeWidth: 14,
          nodeGap: 14,
          draggable: false,
          lineStyle: {
            color: 'gradient',
            opacity: 0.35,
            curveness: 0.5,
          },
          itemStyle: {
            borderWidth: 0,
            borderRadius: 2,
          },
          label: {
            show: true,
            color: colors.foreground,
            fontSize: 11,
            fontWeight: 500,
            position: 'left',
            align: 'right',
            distance: 8,
          },
          levels: [
            {
              depth: 0,
              itemStyle: {
                color: colors.primary,
                shadowBlur: 4,
                shadowColor: 'rgba(0,0,0,0.1)',
              },
              label: {
                position: 'left',
                align: 'right',
                color: colors.foreground,
              },
            },
            {
              depth: 1,
              itemStyle: {
                color: '#10b981',
                shadowBlur: 4,
                shadowColor: 'rgba(0,0,0,0.1)',
              },
              label: {
                position: 'right',
                align: 'left',
                color: colors.foreground,
              },
            },
          ],
        },
      ],
      tooltip: {
        backgroundColor: colors.background,
        borderColor: colors.border,
        borderRadius: 8,
        padding: [12, 16],
        appendToBody: true,
        extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.15);',
        formatter: (params: {
          dataType: string;
          name: string;
          value: number;
          data: { sourceName?: string; targetName?: string; callCount?: number; name?: string };
        }) => {
          if (params.dataType === 'edge') {
            const d = params.data;
            const pct = ((params.value / totalFlowGas) * 100).toFixed(1);
            return `<div style="min-width: 180px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                <span style="color: ${colors.primary}; font-weight: 600;">${d.sourceName}</span>
                <span style="color: ${colors.muted};">→</span>
                <span style="color: #10b981; font-weight: 600;">${d.targetName}</span>
              </div>
              <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 12px;">
                <span style="color: ${colors.muted};">Gas</span>
                <span style="color: ${colors.foreground}; font-weight: 600; text-align: right;">${formatGas(params.value)} <span style="color: ${colors.muted}; font-weight: 400;">(${pct}%)</span></span>
                <span style="color: ${colors.muted};">Calls</span>
                <span style="color: ${colors.foreground}; font-weight: 500; text-align: right;">${d.callCount}</span>
              </div>
            </div>`;
          }
          // Node tooltip
          const isContract = params.name?.startsWith('0x') || params.data.name?.startsWith('0x');
          const nodeColor = isContract ? '#10b981' : colors.primary;
          return `<div style="font-weight: 600; color: ${nodeColor};">${params.data.name ?? params.name}</div>`;
        },
      },
    };
  }, [data?.txContractFlows, colors]);

  // Click handler for contracts treemap - show popover with options
  const handleContractTreemapClick = (params: {
    event?: { event?: MouseEvent };
    data?: { address?: string; name?: string; value?: number; firstTxHash?: string | null };
  }) => {
    const address = params.data?.address;
    if (!address) return; // Ignore "Other" segment

    const mouseEvent = params.event?.event;
    const x = mouseEvent?.clientX ?? 0;
    const y = mouseEvent?.clientY ?? 0;

    const gas = params.data?.value ?? 0;
    const percentage = totalBlockGas > 0 ? (gas / totalBlockGas) * 100 : 0;

    setContractPopover({
      address,
      name: params.data?.name ?? null,
      gas,
      percentage,
      position: { x, y },
      txHash: params.data?.firstTxHash ?? undefined,
    });
  };

  // Close contract popover
  const handleClosePopover = useCallback(() => {
    setContractPopover(null);
  }, []);

  // Click handler for Sankey diagram - navigate to transaction page
  const handleSankeyClick = (params: { data?: { txHash?: string }; dataType?: string }) => {
    const txHash = params.data?.txHash;
    if (txHash) {
      navigate({
        to: '/ethereum/execution/gas-profiler/tx/$txHash',
        params: { txHash },
        search: { block: blockNumber },
      });
    }
  };

  // Loading state
  if (boundsLoading || (isLoading && !data)) {
    return (
      <Container>
        <Header
          title={`Block ${formatGas(blockNumber)}`}
          description="Analyze gas consumption across all block transactions"
        />
        <GasProfilerSkeleton />
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container>
        <Header
          title={`Block ${formatGas(blockNumber)}`}
          description="Analyze gas consumption across all block transactions"
        />
        <Alert variant="error" title="Error loading block data" description={error.message} />
      </Container>
    );
  }

  // Block not found or out of bounds
  if (!data || !bounds || blockNumber < bounds.min || blockNumber > bounds.max) {
    return (
      <Container>
        <Header
          title={`Block ${formatGas(blockNumber)}`}
          description="Analyze gas consumption across all block transactions"
        />
        <Alert
          variant="warning"
          title="Block not available"
          description={`Block ${formatGas(blockNumber)} is not in the indexed range (${bounds ? formatGas(bounds.min) : '?'} - ${bounds ? formatGas(bounds.max) : '?'})`}
        />
        <div className="mt-4">
          <Link
            to="/ethereum/execution/gas-profiler"
            className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Back to Gas Profiler
          </Link>
        </div>
      </Container>
    );
  }

  const canGoPrev = blockNumber > bounds.min;
  const canGoNext = blockNumber < bounds.max;
  const failedCount = data.transactions.filter(tx => tx.hasErrors).length;

  return (
    <Container>
      <Header
        title={`Block ${formatGas(blockNumber)}`}
        description="Analyze gas consumption across all block transactions"
      />

      {/* Back link and block navigation */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/ethereum/execution/gas-profiler"
          className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Gas Profiler Home
        </Link>

        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
          <div className="flex items-center gap-2">
            <a
              href={`https://etherscan.io/block/${blockNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-surface p-1.5 text-muted transition-colors hover:text-foreground"
              title="View on Etherscan"
            >
              <EtherscanIcon className="size-4" />
            </a>
            <a
              href={`https://dashboard.tenderly.co/block/1/${blockNumber}/txs`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-surface p-1.5 transition-colors hover:opacity-80"
              title="View on Tenderly"
            >
              <TenderlyIcon className="size-4" />
            </a>
          </div>

          <div className="hidden h-4 w-px bg-border sm:block" />

          <div className="flex items-center gap-2">
            <Link
              to="/ethereum/execution/gas-profiler/block/$blockNumber"
              params={{ blockNumber: String(blockNumber - 1) }}
              disabled={!canGoPrev}
              className={clsx(
                'flex items-center gap-1 rounded-xs px-2 py-1 text-sm transition-colors',
                canGoPrev ? 'text-muted hover:bg-surface hover:text-foreground' : 'cursor-not-allowed text-muted/50'
              )}
            >
              <ChevronLeftIcon className="size-4" />
              Prev
            </Link>
            <span className="text-xs text-muted">
              {formatGas(bounds.min)} - {formatGas(bounds.max)}
            </span>
            <Link
              to="/ethereum/execution/gas-profiler/block/$blockNumber"
              params={{ blockNumber: String(blockNumber + 1) }}
              disabled={!canGoNext}
              className={clsx(
                'flex items-center gap-1 rounded-xs px-2 py-1 text-sm transition-colors',
                canGoNext ? 'text-muted hover:bg-surface hover:text-foreground' : 'cursor-not-allowed text-muted/50'
              )}
            >
              Next
              <ChevronRightIcon className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Block Summary - Always visible */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xs bg-primary/10 p-2">
              <QueueListIcon className="size-5 text-primary" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">{data.transactionCount}</div>
              <div className="text-xs text-muted">
                Transactions{failedCount > 0 && <span className="text-danger"> ({failedCount} failed)</span>}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xs bg-success/10 p-2">
              <FireIcon className="size-5 text-success" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">{formatGas(totalBlockGas)}</div>
              <div className="text-xs text-muted">Total Gas</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xs bg-cyan-500/10 p-2">
              <CodeBracketIcon className="size-5 text-cyan-500" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">{formatGas(data.totalCallFrames)}</div>
              <div className="text-xs text-muted">Total Calls</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xs bg-purple-500/10 p-2">
              <ArrowsPointingOutIcon className="size-5 text-purple-500" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">{maxBlockDepth}</div>
              <div className="text-xs text-muted">Max Depth</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabbed Content */}
      <HeadlessTab.Group selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
        <HeadlessTab.List className="mb-6 flex gap-1 border-b border-border">
          <Tab hash="overview">Overview</Tab>
          <Tab hash="opcodes">Opcodes</Tab>
          <Tab hash="transactions">Transactions</Tab>
          <Tab hash="calls">Calls</Tab>
        </HeadlessTab.List>

        <HeadlessTab.Panels>
          {/* Overview Tab */}
          <HeadlessTab.Panel>
            {/* Block Gas Breakdown - formula style */}
            <Card className="mb-6 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <h3 className="text-sm font-medium text-foreground">Block Gas Breakdown</h3>
                <span className="text-xs text-muted">{data.transactionCount} transactions</span>
              </div>
              <div className="bg-surface/30 px-4 py-5">
                <GasFormula
                  segments={[
                    {
                      label: 'Intrinsic',
                      value: blockGasBreakdown.totalIntrinsic,
                      color: 'blue',
                      tooltip: <GasTooltip type="intrinsic" context="block" size="md" />,
                    },
                    {
                      label: 'EVM Execution',
                      value: blockGasBreakdown.totalEvm,
                      color: 'purple',
                      operator: '+',
                      tooltip: <GasTooltip type="evm" context="block" size="md" />,
                    },
                    {
                      label: 'Refund',
                      value: blockGasBreakdown.totalRefund,
                      color: 'green',
                      operator: '-',
                      tooltip: <GasTooltip type="refund" context="block" size="md" capPercent={refundCapPercent} />,
                    },
                  ]}
                  result={{
                    label: 'Total Gas Used',
                    value: blockGasBreakdown.totalReceipt,
                    tooltip: <GasTooltip type="receipt" context="block" size="md" />,
                  }}
                  formatter={formatGas}
                />
              </div>
            </Card>

            {/* Gas Distribution - Full width treemap */}
            <PopoutCard
              title="Gas Distribution"
              subtitle="Top 30 transactions by gas · Which transactions consumed the most gas?"
              className="mb-6"
            >
              {({ inModal }) =>
                data.transactions.length > 0 ? (
                  <ReactECharts
                    option={gasDistributionOption}
                    style={{ height: inModal ? 500 : 280 }}
                    onEvents={{ click: handleTreemapClick }}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center text-sm text-muted"
                    style={{ height: inModal ? 500 : 280 }}
                  >
                    No transaction data
                  </div>
                )
              }
            </PopoutCard>

            {/* Top Transactions + Gas Histogram Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TopItemsByGasTable
                title="Top Transactions by Gas"
                subtitle="Which transactions consumed the most gas?"
                items={topTransactionsItems}
                totalGas={totalBlockGas}
                compactCount={5}
                modalCount={10}
                columns={{ first: '#', second: 'Transaction' }}
                getLinkProps={item => ({
                  to: '/ethereum/execution/gas-profiler/tx/$txHash',
                  params: { txHash: item.identifier },
                  search: { block: blockNumber },
                })}
                viewAll={{
                  count: data.transactions.length,
                  label: 'Transactions',
                  onClick: () => {
                    setSelectedTabIndex(2);
                    window.history.pushState(null, '', '#transactions');
                  },
                }}
              />
              <GasHistogram
                title="Transaction Size Distribution"
                subtitle="How is gas distributed across transactions?"
                values={transactionGasValues}
                buckets={TRANSACTION_BUCKETS}
                yAxisLabel="Transactions"
                tooltipLabel="transactions"
              />
            </div>
          </HeadlessTab.Panel>

          {/* Opcodes Tab */}
          <HeadlessTab.Panel>
            {/* Category pie charts */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <CategoryPieChart
                data={opcodeCategoryData}
                colorMap={CATEGORY_COLORS}
                title="Gas by Opcode Category"
                subtitle="Where was EVM gas spent?"
                percentLabel="of EVM gas"
                emptyMessage="No opcode data"
                height={280}
              />
              <CategoryPieChart
                data={opcodeCategoryCountData}
                colorMap={CATEGORY_COLORS}
                title="Count by Opcode Category"
                subtitle="How often did each category execute?"
                percentLabel="of executions"
                emptyMessage="No opcode data"
                height={280}
              />
            </div>

            {/* Block-wide opcode heatmap - with toggle for per-transaction view */}
            <div className="mb-6">
              <BlockOpcodeHeatmap
                blockNumber={blockNumber}
                opcodeStats={opcodeStats}
                transactions={data.transactions.map(tx => ({
                  transactionHash: tx.transactionHash,
                  transactionIndex: tx.transactionIndex,
                  targetName: tx.targetName,
                }))}
                defaultViewMode="transactions"
              />
            </div>

            {/* Opcode charts and table */}
            {opcodeStats.length > 0 ? (
              <OpcodeAnalysis opcodeStats={opcodeStats} maxOpcodes={10} />
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted">No opcode data available</p>
              </Card>
            )}
          </HeadlessTab.Panel>

          {/* Transactions Tab */}
          <HeadlessTab.Panel>
            {/* Filter bar */}
            {availableCallTypes.length > 1 && (
              <div className="mb-4 flex items-center gap-2">
                <FunnelIcon className="size-4 text-muted" />
                <span className="text-xs text-muted">Filter:</span>
                <button
                  onClick={() => handleFilterChange(undefined)}
                  className={clsx(
                    'rounded-xs px-2 py-1 text-xs transition-colors',
                    !search.callType ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-foreground'
                  )}
                >
                  All ({data.transactionCount})
                </button>
                {availableCallTypes.map(callType => {
                  const count = data.transactions.filter(tx => tx.rootCallType === callType).length;
                  return (
                    <button
                      key={callType}
                      onClick={() => handleFilterChange(callType)}
                      className={clsx(
                        'rounded-xs px-2 py-1 text-xs transition-colors',
                        search.callType === callType
                          ? 'bg-primary text-white'
                          : 'bg-surface text-muted hover:text-foreground'
                      )}
                    >
                      {callType} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Transactions Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-foreground">Transactions</h3>
                <p className="text-xs text-muted">All transactions in this block with gas profiling data.</p>
              </div>
              <span className="text-xs text-muted">{filteredTransactions.length} transactions</span>
            </div>

            {filteredTransactions.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted">
                  {search.callType
                    ? `No ${search.callType} transactions in this block`
                    : 'No transactions in this block'}
                </p>
              </Card>
            ) : (
              <div className="overflow-hidden rounded-sm border border-border">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="sticky top-0 bg-surface">
                      <tr>
                        <th
                          scope="col"
                          onClick={() => handleSortChange('index')}
                          className={clsx(
                            'cursor-pointer px-3 py-3.5 text-left text-sm font-semibold whitespace-nowrap transition-colors hover:text-primary',
                            sortField === 'index' ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          <span className="inline-flex items-center gap-1">
                            #
                            {sortField === 'index' && (
                              <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </span>
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold whitespace-nowrap text-foreground"
                        >
                          Transaction
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSortChange('gas')}
                          className={clsx(
                            'cursor-pointer px-3 py-3.5 text-right text-sm font-semibold whitespace-nowrap transition-colors hover:text-primary',
                            sortField === 'gas' ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          <span className="inline-flex items-center justify-end gap-1">
                            Gas
                            {sortField === 'gas' && (
                              <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </span>
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-right text-sm font-semibold whitespace-nowrap text-foreground"
                        >
                          %
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSortChange('calls')}
                          className={clsx(
                            'cursor-pointer px-3 py-3.5 text-right text-sm font-semibold whitespace-nowrap transition-colors hover:text-primary',
                            sortField === 'calls' ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          <span className="inline-flex items-center justify-end gap-1">
                            Calls
                            {sortField === 'calls' && (
                              <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </span>
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSortChange('depth')}
                          className={clsx(
                            'cursor-pointer px-3 py-3.5 text-right text-sm font-semibold whitespace-nowrap transition-colors hover:text-primary',
                            sortField === 'depth' ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          <span className="inline-flex items-center justify-end gap-1">
                            Max Depth
                            {sortField === 'depth' && (
                              <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface">
                      {filteredTransactions.slice(0, visibleCount).map(tx => {
                        const gasPercentage = totalBlockGas > 0 ? (tx.totalGasUsed / totalBlockGas) * 100 : 0;
                        return (
                          <TransactionSummaryCard
                            key={tx.transactionHash}
                            transaction={tx}
                            blockNumber={blockNumber}
                            gasPercentage={gasPercentage}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Show More Button */}
                {filteredTransactions.length > visibleCount && (
                  <div className="flex justify-center border-t border-border py-4">
                    <button
                      onClick={() => setVisibleCount(filteredTransactions.length)}
                      className="flex items-center gap-2 rounded-sm border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:bg-background"
                    >
                      Show All ({filteredTransactions.length - visibleCount} more)
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </HeadlessTab.Panel>

          {/* Calls Tab - consolidated calls and contracts analysis */}
          <HeadlessTab.Panel>
            <div className="space-y-6">
              {/* Gas by Contract Treemap + Calls vs Gas scatter */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <PopoutCard title="Gas by Contract" subtitle="Top 30 contracts by gas consumption" modalSize="xl">
                  {({ inModal }) => (
                    <ReactECharts
                      option={contractTreemapOption}
                      style={{ height: inModal ? 500 : 280, cursor: 'pointer' }}
                      opts={{ renderer: 'canvas' }}
                      onEvents={{ click: handleContractTreemapClick }}
                    />
                  )}
                </PopoutCard>
                <CallsVsGasChart
                  data={data.transactions.map(tx => ({
                    calls: tx.frameCount,
                    gas: tx.totalGasUsed,
                  }))}
                />
              </div>

              {/* Call Type Distribution */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <CategoryPieChart
                  data={callTypeChartData}
                  colorMap={CALL_TYPE_COLORS}
                  title="Call Type Distribution"
                  subtitle="How many calls of each type?"
                  percentLabel="of calls"
                  emptyMessage="No call data"
                  innerRadius={50}
                  outerRadius={75}
                  height={280}
                />
                <CategoryPieChart
                  data={callTypeGasChartData}
                  colorMap={CALL_TYPE_COLORS}
                  title="Gas by Call Type"
                  subtitle="How much gas did each call type consume?"
                  percentLabel="of call gas"
                  emptyMessage="No call data"
                  innerRadius={50}
                  outerRadius={75}
                  height={280}
                />
              </div>

              {/* Transaction → Contract Flow Sankey */}
              {data.txContractFlows.length > 0 && (
                <PopoutCard
                  title="Transaction → Contract Flow"
                  subtitle={`Top ${sankeyFlowCount} contract calls by gas`}
                  modalSize="full"
                >
                  {({ inModal }) => (
                    <ReactECharts
                      option={contractFlowSankeyOption}
                      style={{ height: inModal ? 550 : 320, width: '100%', cursor: 'pointer' }}
                      opts={{ renderer: 'canvas' }}
                      onEvents={{ click: handleSankeyClick }}
                    />
                  )}
                </PopoutCard>
              )}

              {/* Contracts Table */}
              {data.allContractsByGas.length > 0 && (
                <ContractInteractionsTable
                  contracts={data.allContractsByGas.map(
                    (c): ContractInteractionItem => ({
                      address: c.address,
                      name: c.name,
                      gas: c.gas,
                      callCount: c.callCount,
                      callTypes: c.callTypes,
                    })
                  )}
                  totalGas={totalBlockGas}
                  onContractClick={(contract: ContractInteractionItem) => {
                    const contractData = data.allContractsByGas.find(c => c.address === contract.address);
                    if (contractData?.firstTxHash) {
                      navigate({
                        to: '/ethereum/execution/gas-profiler/tx/$txHash',
                        params: { txHash: contractData.firstTxHash },
                        search: { block: blockNumber },
                      });
                    }
                  }}
                  percentLabel="% of Block"
                />
              )}
            </div>
          </HeadlessTab.Panel>
        </HeadlessTab.Panels>
      </HeadlessTab.Group>

      {/* Contract Action Popover */}
      {contractPopover && (
        <ContractActionPopover
          address={contractPopover.address}
          contractName={contractPopover.name}
          gas={contractPopover.gas}
          percentage={contractPopover.percentage}
          position={contractPopover.position}
          onClose={handleClosePopover}
          txHash={contractPopover.txHash}
          blockNumber={blockNumber}
        />
      )}
    </Container>
  );
}
