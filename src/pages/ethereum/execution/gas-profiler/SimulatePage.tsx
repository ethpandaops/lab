import { type JSX, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSearch, Link } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  BeakerIcon,
  PlayIcon,
  StopIcon,
  AdjustmentsHorizontalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  ArrowPathIcon,
  FireIcon,
  ArrowsRightLeftIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  CubeIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Stats } from '@/components/DataDisplay/Stats';
import type { Stat } from '@/components/DataDisplay/Stats/Stats.types';
import { Alert } from '@/components/Feedback/Alert';
import { Input } from '@/components/Forms/Input';
import { Checkbox } from '@/components/Forms/Checkbox';
import { Dialog } from '@/components/Overlays/Dialog';
import { Button } from '@/components/Elements/Button';
import { useNetwork } from '@/hooks/useNetwork';
import { useThemeColors } from '@/hooks/useThemeColors';
import { GasScheduleDrawer } from './components/GasScheduleDrawer';
import { BlockSimulationResultsV2 } from './components/BlockSimulationResultsV2';
import { GlamsterdamPresetModal } from './components/GlamsterdamPresetModal';
import { useGasSchedule } from './hooks/useGasSchedule';
import type { GasSchedule, BlockSimulationResult, CallError } from './SimulatePage.types';
import { GLAMSTERDAM_PRESET } from './SimulatePage.types';

// Register ECharts components
echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Maximum number of blocks that can be simulated in one range */
const MAX_BLOCKS = 50;

/** EIP-7825 maximum transaction gas limit (used when "use max gas limit" is enabled) */
const MAX_TRANSACTION_GAS = 16_777_216;

/** Available block count options */
const BLOCK_COUNT_OPTIONS = [5, 10, 25, 50];

// ============================================================================
// TYPES
// ============================================================================

interface RangeSimulationState {
  status: 'idle' | 'running' | 'completed' | 'cancelled' | 'error';
  currentBlock: number | null;
  completedBlocks: number;
  totalBlocks: number;
  results: BlockSimulationResult[];
  error: string | null;
  startTime: number | null;
}

interface AggregateStats {
  totalOriginalGas: number;
  totalSimulatedGas: number;
  totalTransactions: number;
  totalDiverged: number;
  totalStatusChanges: number;
  totalAdditionalReverts: number;
  deltaPercent: number;
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatGas(value: number): string {
  return value.toLocaleString();
}

function formatCompactGas(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function formatDelta(percent: number): string {
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(1)}%`;
}

function getDeltaColor(percent: number): string {
  if (percent < -5) return 'text-green-500';
  if (percent > 5) return 'text-red-500';
  return 'text-muted';
}

function calculateAggregateStats(results: BlockSimulationResult[]): AggregateStats {
  const stats = results.reduce(
    (acc, result) => {
      acc.totalOriginalGas += result.original.gasUsed;
      acc.totalSimulatedGas += result.simulated.gasUsed;
      acc.totalTransactions += result.transactions.length;
      acc.totalDiverged += result.transactions.filter(tx => tx.diverged).length;
      acc.totalStatusChanges += result.transactions.filter(tx => tx.originalStatus !== tx.simulatedStatus).length;

      const originalReverts = result.transactions.reduce((sum, tx) => sum + tx.originalReverts, 0);
      const simulatedReverts = result.transactions.reduce((sum, tx) => sum + tx.simulatedReverts, 0);
      acc.totalAdditionalReverts += simulatedReverts - originalReverts;

      return acc;
    },
    {
      totalOriginalGas: 0,
      totalSimulatedGas: 0,
      totalTransactions: 0,
      totalDiverged: 0,
      totalStatusChanges: 0,
      totalAdditionalReverts: 0,
    }
  );

  const deltaPercent =
    stats.totalOriginalGas > 0
      ? ((stats.totalSimulatedGas - stats.totalOriginalGas) / stats.totalOriginalGas) * 100
      : 0;

  return { ...stats, deltaPercent };
}

// ============================================================================
// API
// ============================================================================

/**
 * API response from the backend (matches Erigon response structure)
 */
interface ApiBlockSimulationResponse {
  blockNumber: number;
  baseFork: string;
  customSchedule: GasSchedule;
  original: {
    gasUsed: number;
    gasLimit: number;
    wouldExceedLimit: boolean;
  };
  simulated: {
    gasUsed: number;
    gasLimit: number;
    wouldExceedLimit: boolean;
  };
  transactions: Array<{
    hash: string;
    index: number;
    originalStatus: string;
    simulatedStatus: string;
    originalGas: number;
    simulatedGas: number;
    deltaPercent: number;
    diverged: boolean;
    originalReverts: number;
    simulatedReverts: number;
    originalErrors: CallError[] | null;
    simulatedErrors: CallError[] | null;
    error?: string;
  }>;
  opcodeBreakdown: Record<
    string,
    { originalCount: number; originalGas: number; simulatedCount: number; simulatedGas: number }
  >;
}

/** Transform API response to match frontend types */
function transformApiResponse(response: ApiBlockSimulationResponse): BlockSimulationResult {
  return {
    blockNumber: response.blockNumber,
    baseFork: response.baseFork,
    customSchedule: response.customSchedule,
    original: response.original,
    simulated: response.simulated,
    transactions: response.transactions.map(tx => ({
      hash: tx.hash,
      index: tx.index,
      originalStatus: tx.originalStatus === 'success' ? ('success' as const) : ('failed' as const),
      simulatedStatus: tx.simulatedStatus === 'success' ? ('success' as const) : ('failed' as const),
      originalGas: tx.originalGas,
      simulatedGas: tx.simulatedGas,
      deltaPercent: tx.deltaPercent,
      diverged: tx.diverged,
      originalReverts: tx.originalReverts,
      simulatedReverts: tx.simulatedReverts,
      originalErrors: tx.originalErrors ?? [],
      simulatedErrors: tx.simulatedErrors ?? [],
      error: tx.error,
    })),
    opcodeBreakdown: response.opcodeBreakdown,
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SimulatePage(): JSX.Element {
  const search = useSearch({ from: '/ethereum/execution/gas-profiler/simulate' });
  const { currentNetwork } = useNetwork();
  const themeColors = useThemeColors();

  // Form state
  const [startBlock, setStartBlock] = useState(search.block?.toString() ?? '');
  const [blockCount, setBlockCount] = useState(10);
  const [gasSchedule, setGasSchedule] = useState<GasSchedule>({});
  const [inputError, setInputError] = useState<string | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Preset modal state
  const [presetModalOpen, setPresetModalOpen] = useState(false);

  // Gas limit override state
  const [useMaxGasLimit, setUseMaxGasLimit] = useState(false);
  const [gasLimitInfoOpen, setGasLimitInfoOpen] = useState(false);

  // Selection state
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);

  // Simulation state
  const [simState, setSimState] = useState<RangeSimulationState>({
    status: 'idle',
    currentBlock: null,
    completedBlocks: 0,
    totalBlocks: 0,
    results: [],
    error: null,
    startTime: null,
  });

  // Cancellation ref
  const cancelledRef = useRef(false);

  // Block card refs for scroll-into-view
  const blockCardRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const blockStripRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollArrows = useCallback(() => {
    const el = blockStripRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = blockStripRef.current;
    if (!el) return;
    updateScrollArrows();
    el.addEventListener('scroll', updateScrollArrows, { passive: true });
    const observer = new ResizeObserver(updateScrollArrows);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollArrows);
      observer.disconnect();
    };
  }, [updateScrollArrows, simState.results.length]);

  const scrollBlockStrip = useCallback((direction: 'left' | 'right') => {
    blockStripRef.current?.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
  }, []);

  // Scroll selected block card into view when selection changes
  useEffect(() => {
    if (selectedBlockIndex === null) return;
    const el = blockCardRefs.current.get(selectedBlockIndex);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [selectedBlockIndex]);

  // Parse start block
  const startBlockNumber = useMemo(() => {
    const cleaned = startBlock.replace(/,/g, '');
    const num = parseInt(cleaned, 10);
    return !isNaN(num) && num >= 0 ? num : null;
  }, [startBlock]);

  // Fetch gas schedule defaults for the start block
  const {
    data: gasScheduleDefaults,
    isLoading: defaultsLoading,
    error: defaultsError,
  } = useGasSchedule({ blockNumber: startBlockNumber });

  // Count of modified gas parameters
  const modifiedCount = useMemo(() => {
    if (!gasScheduleDefaults) return Object.keys(gasSchedule).length;
    return Object.keys(gasSchedule).filter(key => {
      const defaultParam = gasScheduleDefaults.parameters[key];
      return gasSchedule[key] !== undefined && defaultParam && gasSchedule[key] !== defaultParam.value;
    }).length;
  }, [gasSchedule, gasScheduleDefaults]);

  // Check if Glamsterdam preset is currently applied
  const isGlamsterdamApplied = useMemo(
    () => Object.entries(GLAMSTERDAM_PRESET).every(([key, value]) => gasSchedule[key] === value),
    [gasSchedule]
  );

  // Aggregate stats from completed results
  const aggregateStats = useMemo(() => calculateAggregateStats(simState.results), [simState.results]);

  // ETA calculation
  const estimatedTimeRemaining = useMemo(() => {
    if (!simState.startTime || simState.completedBlocks === 0) return null;
    const elapsed = Date.now() - simState.startTime;
    const avgPerBlock = elapsed / simState.completedBlocks;
    const remaining = (simState.totalBlocks - simState.completedBlocks) * avgPerBlock;
    return Math.round(remaining / 1000);
  }, [simState.startTime, simState.completedBlocks, simState.totalBlocks]);

  // Per-block delta values for chart and navigation strip
  const blockDeltas = useMemo(() => {
    return simState.results.map(result => {
      if (result.original.gasUsed === 0) return 0;
      return ((result.simulated.gasUsed - result.original.gasUsed) / result.original.gasUsed) * 100;
    });
  }, [simState.results]);

  // Chart options for the trend chart
  const chartOptions = useMemo(() => {
    if (simState.results.length === 0) return null;

    const deltaData = blockDeltas.map((delta, i) => [i, delta]);
    const divergedData = simState.results.map((r, i) => [i, r.transactions.filter(tx => tx.diverged).length]);

    return {
      grid: { left: 60, right: 60, top: 30, bottom: 50 },
      legend: {
        show: true,
        top: 0,
        right: 0,
        textStyle: { color: themeColors.muted, fontSize: 11 },
        itemWidth: 12,
        itemHeight: 8,
      },
      xAxis: {
        type: 'value' as const,
        min: 0,
        max: simState.results.length - 1,
        axisLine: { show: true, lineStyle: { color: themeColors.border } },
        splitLine: { show: false },
        axisLabel: {
          color: themeColors.muted,
          fontSize: 11,
          formatter: (value: number) => {
            const blockNum = simState.results[value]?.blockNumber;
            return blockNum ? formatGas(blockNum) : '';
          },
        },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value' as const,
          axisLine: { show: true, lineStyle: { color: themeColors.border } },
          splitLine: { show: false },
          axisLabel: {
            color: themeColors.muted,
            fontSize: 11,
            formatter: (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(0)}%`,
          },
        },
        {
          type: 'value' as const,
          axisLine: { show: true, lineStyle: { color: themeColors.border } },
          splitLine: { show: false },
          axisLabel: {
            color: themeColors.muted,
            fontSize: 11,
          },
        },
      ],
      tooltip: {
        trigger: 'axis' as const,
        backgroundColor: themeColors.background,
        borderColor: themeColors.border,
        textStyle: { color: themeColors.foreground, fontSize: 12 },
        formatter: (params: unknown) => {
          const p = params as { data: [number, number]; seriesName: string }[];
          if (!p?.[0]) return '';
          const index = p[0].data[0];
          const blockNum = simState.results[index]?.blockNumber;
          const deltaItem = p.find(s => s.seriesName === 'Gas Delta');
          const divergedItem = p.find(s => s.seriesName === 'Diverged Txs');
          let html = `<b>Block ${formatGas(blockNum)}</b>`;
          if (deltaItem) html += `<br/>Gas Delta: ${formatDelta(deltaItem.data[1])}`;
          if (divergedItem) html += `<br/>Diverged: ${divergedItem.data[1]} txs`;
          return html;
        },
      },
      series: [
        {
          name: 'Diverged Txs',
          type: 'bar',
          yAxisIndex: 1,
          data: divergedData,
          barWidth: '60%',
          itemStyle: {
            color: `${themeColors.muted}15`,
            borderRadius: [2, 2, 0, 0],
          },
          emphasis: {
            itemStyle: { color: `${themeColors.muted}30` },
          },
        },
        {
          name: 'Gas Delta',
          type: 'line',
          yAxisIndex: 0,
          data: deltaData,
          smooth: false,
          symbol: 'circle',
          symbolSize: (_value: number[], params: { dataIndex: number }) =>
            params.dataIndex === selectedBlockIndex ? 12 : 6,
          itemStyle: {
            color: (params: { dataIndex: number; data: [number, number] }) => {
              const delta = params.data[1];
              if (params.dataIndex === selectedBlockIndex) return themeColors.primary;
              if (delta < -5) return '#22c55e';
              if (delta > 5) return '#ef4444';
              return themeColors.muted;
            },
          },
          lineStyle: {
            color: themeColors.primary,
            width: 2,
          },
          emphasis: {
            itemStyle: { borderWidth: 2, borderColor: themeColors.primary },
          },
        },
      ],
      animation: true,
      animationDuration: 300,
    };
  }, [simState.results, blockDeltas, selectedBlockIndex, themeColors]);

  // Handle chart click
  const handleChartClick = useCallback(
    (params: { dataIndex?: number }) => {
      if (params.dataIndex !== undefined && params.dataIndex < simState.results.length) {
        setSelectedBlockIndex(params.dataIndex);
      }
    },
    [simState.results.length]
  );

  // Handle input change
  const handleStartBlockChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStartBlock(e.target.value.replace(/,/g, ''));
    setInputError(null);
  }, []);

  // Handle gas schedule change
  const handleScheduleChange = useCallback((newSchedule: GasSchedule) => {
    setGasSchedule(newSchedule);
    setGasWarning(false);
  }, []);

  // Remove a single gas override (from active changes pills)
  const handleRemoveOverride = useCallback(
    (key: string) => {
      const newSchedule = { ...gasSchedule };
      delete newSchedule[key];
      setGasSchedule(newSchedule);
    },
    [gasSchedule]
  );

  // Simulate a single block (API call)
  const simulateSingleBlock = useCallback(
    async (blockNumber: number): Promise<BlockSimulationResult> => {
      if (!currentNetwork) {
        throw new Error('No network selected');
      }

      const response = await fetch(`/api/v1/gas-profiler/${currentNetwork.name}/simulate-block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockNumber,
          gasSchedule: { overrides: gasSchedule },
          ...(useMaxGasLimit && { simulatedGasLimit: MAX_TRANSACTION_GAS }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to simulate block ${blockNumber}`;
        throw new Error(errorMessage);
      }

      const apiResult: ApiBlockSimulationResponse = await response.json();
      return transformApiResponse(apiResult);
    },
    [gasSchedule, currentNetwork, useMaxGasLimit]
  );

  // Run the range simulation
  const [gasWarning, setGasWarning] = useState(false);

  const handleSimulate = useCallback(async () => {
    if (startBlockNumber === null) {
      setInputError('Enter a valid start block');
      return;
    }

    if (modifiedCount === 0) {
      setGasWarning(true);
      setDrawerOpen(true);
      return;
    }

    setGasWarning(false);
    cancelledRef.current = false;
    setSelectedBlockIndex(null);

    setSimState({
      status: 'running',
      currentBlock: startBlockNumber,
      completedBlocks: 0,
      totalBlocks: blockCount,
      results: [],
      error: null,
      startTime: Date.now(),
    });

    const results: BlockSimulationResult[] = [];

    for (let i = 0; i < blockCount; i++) {
      if (cancelledRef.current) {
        setSimState(prev => ({ ...prev, status: 'cancelled' }));
        return;
      }

      const currentBlockNum = startBlockNumber + i;

      setSimState(prev => ({
        ...prev,
        currentBlock: currentBlockNum,
      }));

      try {
        const result = await simulateSingleBlock(currentBlockNum);
        results.push(result);

        setSimState(prev => ({
          ...prev,
          completedBlocks: prev.completedBlocks + 1,
          results: [...results],
        }));

        // Auto-select first block when it completes
        if (results.length === 1) {
          setSelectedBlockIndex(0);
        }
      } catch (err) {
        setSimState(prev => ({
          ...prev,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        }));
        return;
      }
    }

    setSimState(prev => ({
      ...prev,
      status: 'completed',
      currentBlock: null,
    }));
  }, [startBlockNumber, blockCount, simulateSingleBlock, modifiedCount]);

  // Cancel simulation
  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  // Reset simulation
  const handleReset = useCallback(() => {
    setSimState({
      status: 'idle',
      currentBlock: null,
      completedBlocks: 0,
      totalBlocks: 0,
      results: [],
      error: null,
      startTime: null,
    });
    setSelectedBlockIndex(null);
  }, []);

  // Get modified entries for active changes pills
  const modifiedEntries = useMemo(() => {
    if (!gasScheduleDefaults) return [];
    return Object.entries(gasSchedule).filter(([key, value]) => {
      const defaultParam = gasScheduleDefaults.parameters[key];
      return value !== undefined && defaultParam && value !== defaultParam.value;
    });
  }, [gasSchedule, gasScheduleDefaults]);

  const modifiedParamNames = useMemo(() => modifiedEntries.map(([key]) => key), [modifiedEntries]);

  // Pending simulate flag - triggers simulation on next render after preset is applied
  const [pendingSimulate, setPendingSimulate] = useState(false);

  // Auto-simulate after preset application
  useEffect(() => {
    if (pendingSimulate) {
      setPendingSimulate(false);
      handleSimulate();
    }
  }, [pendingSimulate, handleSimulate]);

  // Handle preset modal "Apply & Simulate"
  const handlePresetApplyAndSimulate = useCallback((presetValues: Record<string, number>) => {
    setGasSchedule(presetValues as GasSchedule);
    setGasWarning(false);
    setPendingSimulate(true);
  }, []);

  // Handle preset modal "Cancel" - resets gas schedule to empty
  const handlePresetCancel = useCallback(() => {
    setGasSchedule({});
    setGasWarning(false);
  }, []);

  const isRunning = simState.status === 'running';
  const hasResults = simState.results.length > 0;

  // Block navigation
  const selectedResult = selectedBlockIndex !== null ? simState.results[selectedBlockIndex] : null;

  const handlePrevBlock = useCallback(() => {
    setSelectedBlockIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
  }, []);

  const handleNextBlock = useCallback(() => {
    setSelectedBlockIndex(prev => (prev !== null && prev < simState.results.length - 1 ? prev + 1 : prev));
  }, [simState.results.length]);

  return (
    <Container>
      <Header title="Gas Repricing Simulator" description="Simulate gas repricing across multiple blocks" />

      {/* Back link */}
      <div className="mb-6">
        <Link
          to="/ethereum/execution/gas-profiler"
          className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Gas Profiler Home
        </Link>
      </div>

      {/* Config Bar */}
      <Card className="mb-4 p-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_auto_auto_auto]">
          {/* Start Block */}
          <div>
            <label className="mb-1.5 block text-xs text-muted">Start Block</label>
            <Input error={!!inputError}>
              <Input.Leading type="icon">
                <CubeIcon />
              </Input.Leading>
              <Input.Field
                type="text"
                value={startBlock}
                onChange={handleStartBlockChange}
                placeholder="e.g. 24407768"
                disabled={isRunning}
              />
            </Input>
            {startBlockNumber !== null && !inputError && !isRunning && (
              <p className="mt-1.5 text-xs text-muted">
                Range: {formatGas(startBlockNumber)} → {formatGas(startBlockNumber + blockCount - 1)}
              </p>
            )}
          </div>

          {/* Block Count */}
          <div>
            <label className="mb-1.5 block text-xs text-muted">Blocks</label>
            <div className="flex gap-1">
              {BLOCK_COUNT_OPTIONS.filter(n => n <= MAX_BLOCKS).map(count => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setBlockCount(count)}
                  disabled={isRunning}
                  className={clsx(
                    'rounded-xs px-3 py-2 text-sm font-medium transition-colors',
                    blockCount === count ? 'bg-primary text-white' : 'bg-surface text-muted hover:bg-primary/10',
                    isRunning && 'cursor-not-allowed opacity-50'
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Gas Schedule */}
          <div>
            <label className="mb-1.5 block text-xs text-muted">Gas Schedule</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPresetModalOpen(true)}
                disabled={!gasScheduleDefaults || isRunning}
                className={clsx(
                  'flex items-center gap-1.5 rounded-xs border px-3 py-2 text-sm font-medium transition-colors',
                  isGlamsterdamApplied
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border bg-surface text-muted hover:border-primary/30 hover:bg-primary/10 hover:text-primary',
                  (!gasScheduleDefaults || isRunning) && 'cursor-not-allowed opacity-50'
                )}
                title="Apply Glamsterdam (EIP-8007) gas schedule preset"
              >
                <BeakerIcon className="size-4" />
                Glamsterdam
              </button>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                disabled={!gasScheduleDefaults || isRunning}
                className={clsx(
                  'flex items-center gap-2 rounded-xs border px-3 py-2 text-sm font-medium transition-colors',
                  modifiedCount > 0
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border bg-surface text-muted hover:text-foreground',
                  (!gasScheduleDefaults || isRunning) && 'cursor-not-allowed opacity-50'
                )}
              >
                <AdjustmentsHorizontalIcon className="size-4" />
                Configure
                {modifiedCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs text-white">{modifiedCount}</span>
                )}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div>
            <label className="mb-1.5 block text-xs text-muted">&nbsp;</label>
            <div className="flex gap-2">
              {!isRunning ? (
                <Button size="lg" onClick={handleSimulate} disabled={!startBlock || defaultsLoading}>
                  <PlayIcon className="mr-1.5 size-4" />
                  Simulate
                </Button>
              ) : (
                <Button size="lg" variant="soft" onClick={handleCancel}>
                  <StopIcon className="mr-1.5 size-4" />
                  Cancel
                </Button>
              )}
              {hasResults && !isRunning && (
                <Button size="lg" variant="soft" onClick={handleReset}>
                  <ArrowPathIcon className="mr-1.5 size-4" />
                  New
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
          <Checkbox checked={useMaxGasLimit} onChange={setUseMaxGasLimit} disabled={isRunning} />
          <button
            type="button"
            onClick={() => !isRunning && setUseMaxGasLimit(!useMaxGasLimit)}
            disabled={isRunning}
            className={clsx('text-left text-sm', useMaxGasLimit ? 'text-foreground' : 'text-muted')}
          >
            Use max gas limit for simulated execution
          </button>
          <button
            type="button"
            onClick={() => setGasLimitInfoOpen(true)}
            className="text-muted transition-colors hover:text-foreground"
          >
            <InformationCircleIcon className="size-4" />
          </button>
        </div>

        {/* Validation / Loading / Error messages */}
        {inputError && (
          <Alert
            variant="error"
            description={inputError}
            accentBorder
            className="mt-3"
            onDismiss={() => setInputError(null)}
          />
        )}
        {defaultsLoading && startBlockNumber !== null && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted">
            <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading gas parameters...
          </div>
        )}
        {defaultsError && (
          <Alert
            variant="error"
            description={`Error loading gas schedule: ${defaultsError.message}`}
            accentBorder
            className="mt-3"
          />
        )}
        {gasWarning && modifiedCount === 0 && (
          <Alert
            variant="warning"
            description="No gas parameters modified. Configure at least one gas override to see how repricing affects these blocks."
            accentBorder
            className="mt-3"
            onDismiss={() => setGasWarning(false)}
          />
        )}
      </Card>

      {/* Active Changes Pills */}
      {modifiedEntries.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {modifiedEntries.map(([key, value]) => {
            const defaultVal = gasScheduleDefaults?.parameters[key]?.value ?? 0;
            return (
              <span key={key} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs">
                <span className="font-medium text-foreground">{key}</span>
                <span className="text-muted">
                  {defaultVal}→{value}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveOverride(key)}
                  className="ml-0.5 text-muted hover:text-foreground"
                >
                  <XMarkIcon className="size-3" />
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => setGasSchedule({})}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted transition-colors hover:text-foreground"
          >
            <ArrowPathIcon className="size-3" />
            Reset All
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {isRunning && (
        <Card className="mb-4 overflow-hidden">
          <div className="flex items-center gap-4 p-4">
            {/* Spinner */}
            <div className="relative flex size-10 shrink-0 items-center justify-center">
              <svg className="size-10 -rotate-90 animate-spin" viewBox="0 0 40 40" style={{ animationDuration: '3s' }}>
                <circle cx="20" cy="20" r="16" fill="none" className="stroke-border" strokeWidth="3" />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  className="stroke-primary"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${(simState.completedBlocks / simState.totalBlocks) * 100.5} 100.5`}
                />
              </svg>
              <span className="absolute text-xs font-bold text-primary">
                {Math.round((simState.completedBlocks / simState.totalBlocks) * 100)}
              </span>
            </div>

            {/* Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  Block {simState.currentBlock !== null ? formatGas(simState.currentBlock) : '...'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  Simulating
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                <span>
                  {simState.completedBlocks} of {simState.totalBlocks} blocks
                </span>
                {estimatedTimeRemaining !== null && (
                  <>
                    <span className="size-0.5 rounded-full bg-muted/50" />
                    <span>~{estimatedTimeRemaining}s remaining</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Segmented progress */}
          <div className="flex h-1.5 gap-px bg-border/50">
            {Array.from({ length: simState.totalBlocks }).map((_, i) => (
              <div
                key={i}
                className={clsx(
                  'flex-1 transition-colors duration-500',
                  i < simState.completedBlocks
                    ? 'bg-primary'
                    : i === simState.completedBlocks
                      ? 'animate-pulse bg-primary/40'
                      : 'bg-border/30'
                )}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Error */}
      {simState.status === 'error' && (
        <div className="mb-4">
          <Alert variant="error" title="Simulation failed" description={simState.error ?? 'Unknown error'} />
        </div>
      )}

      {/* Cancelled */}
      {simState.status === 'cancelled' && (
        <div className="mb-4">
          <Alert
            variant="warning"
            title="Simulation cancelled"
            description={`Completed ${simState.completedBlocks} of ${simState.totalBlocks} blocks before cancellation.`}
          />
        </div>
      )}

      {/* Aggregate Impact */}
      {hasResults && (
        <div className="mb-4 space-y-4">
          {/* Stats Cards */}
          <Stats
            gridClassName="grid grid-cols-2 gap-3 lg:grid-cols-4"
            stats={(() => {
              const gasColor =
                aggregateStats.deltaPercent > 0 ? '#ef4444' : aggregateStats.deltaPercent < 0 ? '#22c55e' : '#6b7280';
              const divergedColor = aggregateStats.totalDiverged > 0 ? '#f59e0b' : '#22c55e';
              const statusColor = aggregateStats.totalStatusChanges > 0 ? '#ef4444' : '#22c55e';

              return [
                {
                  id: 'gas-impact',
                  name: 'Gas Impact',
                  value: formatDelta(aggregateStats.deltaPercent),
                  icon: FireIcon,
                  iconColor: gasColor,
                  subtitle: `${formatCompactGas(aggregateStats.totalOriginalGas)} → ${formatCompactGas(aggregateStats.totalSimulatedGas)}`,
                  accentColor: `${gasColor}4D`,
                },
                {
                  id: 'transactions',
                  name: 'Transactions',
                  value: formatGas(aggregateStats.totalTransactions),
                  icon: BoltIcon,
                  iconColor: '#3b82f6',
                  subtitle: `across ${simState.results.length} block${simState.results.length !== 1 ? 's' : ''}`,
                  accentColor: '#3b82f633',
                },
                {
                  id: 'diverged',
                  name: 'Diverged',
                  value: formatGas(aggregateStats.totalDiverged),
                  icon: ArrowsRightLeftIcon,
                  iconColor: divergedColor,
                  subtitle:
                    aggregateStats.totalTransactions > 0
                      ? `${((aggregateStats.totalDiverged / aggregateStats.totalTransactions) * 100).toFixed(1)}% of txs`
                      : '0%',
                  accentColor: `${divergedColor}33`,
                },
                {
                  id: 'status-changes',
                  name: 'Status Changes',
                  value: formatGas(aggregateStats.totalStatusChanges),
                  icon: ExclamationTriangleIcon,
                  iconColor: statusColor,
                  subtitle:
                    aggregateStats.totalStatusChanges > 0 ? 'transactions changed outcome' : 'all outcomes preserved',
                  accentColor: `${statusColor}33`,
                },
              ] satisfies Stat[];
            })()}
          />

          {/* Trend Chart */}
          {chartOptions && simState.results.length > 1 && (
            <PopoutCard title="Gas Delta by Block" subtitle="Click a point to select that block">
              <ReactEChartsCore
                echarts={echarts}
                option={chartOptions}
                style={{ height: 180 }}
                onEvents={{ click: handleChartClick }}
                notMerge={true}
              />
            </PopoutCard>
          )}
        </div>
      )}

      {/* Block Navigation Strip */}
      {hasResults && (
        <div className="relative mb-2">
          {/* Left scroll arrow */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollBlockStrip('left')}
              className="absolute top-1/2 -left-1 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-surface"
            >
              <ChevronLeftIcon className="size-4 text-muted" />
            </button>
          )}

          {/* Right scroll arrow */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollBlockStrip('right')}
              className="absolute top-1/2 -right-1 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-surface"
            >
              <ChevronRightIcon className="size-4 text-muted" />
            </button>
          )}

          <div
            ref={blockStripRef}
            className="mx-5 flex gap-2 overflow-x-auto pb-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {simState.results.map((result, index) => {
              const delta = blockDeltas[index];
              const isSelected = selectedBlockIndex === index;
              const divergedCount = result.transactions.filter(tx => tx.diverged).length;

              return (
                <button
                  key={result.blockNumber}
                  ref={el => {
                    if (el) blockCardRefs.current.set(index, el);
                    else blockCardRefs.current.delete(index);
                  }}
                  type="button"
                  onClick={() => setSelectedBlockIndex(index)}
                  className={clsx(
                    'group relative flex shrink-0 flex-col rounded-sm border transition-all',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-xs'
                      : 'border-border bg-background hover:border-muted hover:shadow-xs'
                  )}
                  style={{ minWidth: '7.5rem' }}
                >
                  {/* Connector arrow to detail panel */}
                  {isSelected && (
                    <div className="absolute -bottom-4 left-1/2 z-10 -translate-x-1/2">
                      <div className="size-0 border-x-[8px] border-t-[8px] border-x-transparent border-t-primary" />
                    </div>
                  )}
                  {/* Top section: label + block number */}
                  <div className="px-3 pt-2 pb-1.5">
                    <div className="text-[9px] font-semibold tracking-wider text-muted uppercase">Block</div>
                    <div
                      className={clsx(
                        'font-mono text-sm tabular-nums',
                        isSelected ? 'font-bold text-foreground' : 'font-semibold text-foreground/80'
                      )}
                    >
                      {formatGas(result.blockNumber)}
                    </div>
                  </div>

                  {/* Bottom section: stats */}
                  <div
                    className={clsx(
                      'flex items-center gap-3 border-t px-3 pt-1.5 pb-2',
                      isSelected ? 'border-primary/20' : 'border-border/60'
                    )}
                  >
                    <div>
                      <div className="text-[9px] text-muted">Delta</div>
                      <div className={clsx('font-mono text-xs font-semibold tabular-nums', getDeltaColor(delta))}>
                        {formatDelta(delta)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted">Div.</div>
                      <div
                        className={clsx(
                          'font-mono text-xs font-semibold tabular-nums',
                          divergedCount > 0 ? 'text-amber-500' : 'text-muted'
                        )}
                      >
                        {divergedCount}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Pending blocks */}
            {isRunning &&
              Array.from({
                length: simState.totalBlocks - simState.completedBlocks,
              }).map((_, i) => (
                <div
                  key={`pending-${i}`}
                  className={clsx(
                    'flex shrink-0 flex-col rounded-sm border border-dashed border-border/60',
                    i === 0 && 'animate-pulse'
                  )}
                  style={{ minWidth: '7.5rem' }}
                >
                  <div className="px-3 pt-2 pb-1.5">
                    <div className="text-[9px] font-semibold tracking-wider text-muted/40 uppercase">Block</div>
                    <div className="font-mono text-sm text-muted/30 tabular-nums">
                      {startBlockNumber !== null ? formatGas(startBlockNumber + simState.completedBlocks + i) : '...'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-t border-dashed border-border/40 px-3 pt-1.5 pb-2">
                    <div>
                      <div className="text-[9px] text-muted/30">Delta</div>
                      <div className="font-mono text-xs text-muted/20">—</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Block Detail Panel */}
      {selectedResult && (
        <Card className="mb-4 overflow-hidden">
          {/* Header with navigation */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-sm bg-primary/10">
                <CubeIcon className="size-4 text-primary" />
              </div>
              <div>
                <h3 className="font-mono text-sm font-semibold text-foreground">
                  {formatGas(selectedResult.blockNumber)}
                </h3>
                {(() => {
                  const delta = blockDeltas[selectedBlockIndex!];
                  return (
                    <span className={clsx('font-mono text-xs font-medium', getDeltaColor(delta))}>
                      {formatDelta(delta)} gas delta
                    </span>
                  );
                })()}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevBlock}
                disabled={selectedBlockIndex === 0}
                className={clsx(
                  'rounded-xs p-1.5 transition-colors',
                  selectedBlockIndex === 0
                    ? 'cursor-not-allowed text-muted/30'
                    : 'text-muted hover:bg-surface hover:text-foreground'
                )}
              >
                <ChevronLeftIcon className="size-4" />
              </button>
              <span className="min-w-12 text-center font-mono text-xs text-muted tabular-nums">
                {selectedBlockIndex! + 1}/{simState.results.length}
              </span>
              <button
                type="button"
                onClick={handleNextBlock}
                disabled={selectedBlockIndex === simState.results.length - 1}
                className={clsx(
                  'rounded-xs p-1.5 transition-colors',
                  selectedBlockIndex === simState.results.length - 1
                    ? 'cursor-not-allowed text-muted/30'
                    : 'text-muted hover:bg-surface hover:text-foreground'
                )}
              >
                <ChevronRightIcon className="size-4" />
              </button>
            </div>
          </div>

          {/* Reuse existing BlockSimulationResults */}
          <div className="p-4">
            <BlockSimulationResultsV2 result={selectedResult} modifiedParams={modifiedParamNames} />
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!hasResults && !isRunning && (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <BeakerIcon className="size-12 text-muted" />
            <div>
              <div className="font-medium text-foreground">Ready to Simulate</div>
              <div className="mt-1 max-w-md text-sm text-muted">
                Enter a start block, configure gas parameter overrides, then simulate to see how repricing would affect
                transaction execution across a range of blocks.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Gas Schedule Drawer */}
      {gasScheduleDefaults && (
        <GasScheduleDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          schedule={gasSchedule}
          defaults={gasScheduleDefaults}
          onChange={handleScheduleChange}
        />
      )}

      {/* Glamsterdam Preset Modal */}
      <GlamsterdamPresetModal
        open={presetModalOpen}
        onClose={() => setPresetModalOpen(false)}
        onApplyAndSimulate={handlePresetApplyAndSimulate}
        onCancel={handlePresetCancel}
        defaults={gasScheduleDefaults ?? null}
      />

      {/* Gas Limit Info Dialog */}
      <Dialog
        open={gasLimitInfoOpen}
        onClose={() => setGasLimitInfoOpen(false)}
        title="Simulated Gas Limit Override"
        size="sm"
      >
        <div className="space-y-3 text-sm text-muted">
          <p>
            When gas prices change, transactions that succeeded under old pricing may run out of gas under new pricing —
            not because the transaction logic is wrong, but because the original gas limit was set for the old costs.
          </p>
          <p>
            With this option enabled, the simulated execution uses the maximum transaction gas limit (
            {formatGas(MAX_TRANSACTION_GAS)} gas) instead of the original transaction&apos;s gas limit. This prevents
            artificial out-of-gas failures and shows the true gas cost under the new pricing.
          </p>
          <p>The original execution always uses the real transaction gas limit, so you can still compare the two.</p>
          <div className="rounded-xs border border-border bg-background px-3 py-2 text-xs">
            <span className="font-medium text-foreground">Note:</span> This overrides each transaction&apos;s individual
            gas limit, not the block gas limit.
          </div>
        </div>
      </Dialog>
    </Container>
  );
}
