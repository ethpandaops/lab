import { type JSX, useState, useCallback, useEffect, useMemo } from 'react';
import { useSearch, useNavigate, Link } from '@tanstack/react-router';
import ReactECharts from 'echarts-for-react';
import {
  MagnifyingGlassIcon,
  CubeIcon,
  FireIcon,
  DocumentTextIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { Alert } from '@/components/Feedback/Alert';
import { Input } from '@/components/Forms/Input';
import { Button } from '@/components/Elements/Button';
import { CardChain, type CardChainItem } from '@/components/DataDisplay/CardChain';
import { useThemeColors } from '@/hooks/useThemeColors';
import { MultiLineChart, createStatisticSeries, createBandSeries } from '@/components/Charts/MultiLine';
import { useBlockTransactions } from './hooks/useBlockTransactions';
import { useRecentBlocks } from './hooks/useRecentBlocks';
import { GasProfilerSkeleton } from './components';
import type { GasProfilerHomeSearch } from './IndexPage.types';

/**
 * Format gas value with comma separators
 */
function formatGas(value: number): string {
  return value.toLocaleString();
}

/**
 * Format large numbers with K/M suffix
 */
function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

/**
 * Validate if string is a valid transaction hash
 */
function isValidTxHash(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

/**
 * Validate if string is a valid block number
 */
function isValidBlockNumber(value: string): boolean {
  const num = parseInt(value, 10);
  return !isNaN(num) && num >= 0;
}

// ============================================================================
// DUMMY DATA - Replace with real API calls
// ============================================================================

/**
 * Network-wide opcode statistics (DUMMY DATA)
 * TODO: Replace with API call to /api/gas-profiler/network/opcodes
 */
const DUMMY_TOP_OPCODES = [
  { opcode: 'SLOAD', totalGas: 892_450_000, count: 4_250_000, avgGas: 210 },
  { opcode: 'CALL', totalGas: 456_780_000, count: 1_890_000, avgGas: 242 },
  { opcode: 'SSTORE', totalGas: 398_200_000, count: 890_000, avgGas: 447 },
  { opcode: 'STATICCALL', totalGas: 234_100_000, count: 2_100_000, avgGas: 111 },
  { opcode: 'MSTORE', totalGas: 156_890_000, count: 52_300_000, avgGas: 3 },
  { opcode: 'MLOAD', totalGas: 145_670_000, count: 48_560_000, avgGas: 3 },
  { opcode: 'PUSH1', totalGas: 98_450_000, count: 32_816_667, avgGas: 3 },
  { opcode: 'DUP1', totalGas: 87_230_000, count: 29_076_667, avgGas: 3 },
  { opcode: 'JUMPDEST', totalGas: 67_890_000, count: 67_890_000, avgGas: 1 },
  { opcode: 'ADD', totalGas: 45_670_000, count: 15_223_333, avgGas: 3 },
];

/**
 * Opcode categories breakdown (DUMMY DATA)
 * TODO: Replace with API call to /api/gas-profiler/network/categories
 */
const DUMMY_OPCODE_CATEGORIES = [
  { category: 'Storage', gas: 1_290_650_000, percentage: 38.2 },
  { category: 'System Calls', gas: 890_880_000, percentage: 26.4 },
  { category: 'Memory', gas: 456_780_000, percentage: 13.5 },
  { category: 'Stack Ops', gas: 342_560_000, percentage: 10.1 },
  { category: 'Arithmetic', gas: 234_100_000, percentage: 6.9 },
  { category: 'Control Flow', gas: 165_030_000, percentage: 4.9 },
];

/**
 * Gas trend over blocks (DUMMY DATA)
 * TODO: Replace with API call to /api/gas-profiler/network/gas-trend
 * Matches TPS/Opcodes data structure with statistics and bands
 */
const DUMMY_GAS_TREND = Array.from({ length: 50 }, (_, i) => {
  // Generate realistic-looking gas usage data with variation
  const baseValue = 15_000_000 + Math.sin(i * 0.25) * 5_000_000;
  const avg = baseValue + Math.random() * 2_000_000;
  const movingAvg = baseValue + Math.sin(i * 0.15) * 3_000_000;
  const median = avg - 500_000 + Math.random() * 1_000_000;

  // Bands
  const min = avg * 0.5 + Math.random() * 2_000_000;
  const max = avg * 1.5 + Math.random() * 5_000_000;
  const p5 = avg * 0.7 + Math.random() * 1_000_000;
  const p95 = avg * 1.3 + Math.random() * 2_000_000;
  const lowerBand = avg * 0.85;
  const upperBand = avg * 1.15;

  return {
    // Use timestamp for x-axis (hourly intervals)
    timestamp: 1737500400 + i * 3600, // Jan 22, 2025 + i hours
    avg,
    movingAvg,
    median,
    min,
    max,
    p5,
    p95,
    lowerBand,
    upperBand,
  };
});

/**
 * Call type distribution (DUMMY DATA)
 * TODO: Replace with API call to /api/gas-profiler/network/call-types
 */
const DUMMY_CALL_TYPES = [
  { type: 'CALL', count: 2_890_000, gasUsed: 1_456_780_000 },
  { type: 'STATICCALL', count: 2_100_000, gasUsed: 234_100_000 },
  { type: 'DELEGATECALL', count: 890_000, gasUsed: 398_200_000 },
  { type: 'CREATE', count: 45_000, gasUsed: 156_890_000 },
  { type: 'CREATE2', count: 12_000, gasUsed: 45_670_000 },
];

/**
 * Transaction complexity distribution (DUMMY DATA)
 * TODO: Replace with API call to /api/gas-profiler/network/complexity
 */
const DUMMY_COMPLEXITY = [
  { range: '1-5', count: 45_000, label: 'Simple' },
  { range: '6-20', count: 32_000, label: 'Medium' },
  { range: '21-50', count: 18_000, label: 'Complex' },
  { range: '51-100', count: 8_500, label: 'Very Complex' },
  { range: '100+', count: 3_200, label: 'Extreme' },
];

/**
 * Opcodes per second over time (DUMMY DATA)
 * TODO: Replace with API call to /api/gas-profiler/network/opcodes-per-second
 * Matches TPS data structure with statistics and bands
 */
const DUMMY_OPCODES_PER_SECOND = Array.from({ length: 50 }, (_, i) => {
  // Generate realistic-looking opcodes per second data with variation
  const baseValue = 900_000 + Math.sin(i * 0.3) * 100_000;
  const avg = baseValue + Math.random() * 50_000;
  const movingAvg = baseValue + Math.sin(i * 0.2) * 80_000;
  const median = avg - 10_000 + Math.random() * 20_000;

  // Bands
  const min = avg * 0.6 + Math.random() * 50_000;
  const max = avg * 1.4 + Math.random() * 100_000;
  const p5 = avg * 0.75 + Math.random() * 30_000;
  const p95 = avg * 1.25 + Math.random() * 50_000;
  const lowerBand = avg * 0.85;
  const upperBand = avg * 1.15;

  return {
    // Use timestamp for x-axis (hourly intervals starting from a base time)
    timestamp: 1737500400 + i * 3600, // Jan 22, 2025 + i hours
    avg,
    movingAvg,
    median,
    min,
    max,
    p5,
    p95,
    lowerBand,
    upperBand,
  };
});

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Gas Profiler Home page - search and network analytics
 */
export function HomePage(): JSX.Element {
  const search = useSearch({ from: '/ethereum/execution/gas-profiler/' }) as GasProfilerHomeSearch;
  const navigate = useNavigate({ from: '/ethereum/execution/gas-profiler/' });
  const colors = useThemeColors();

  // Search input states
  const [searchInput, setSearchInput] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [blocksOffset, setBlocksOffset] = useState(0);

  // Fetch bounds to validate block range
  const { error, bounds, boundsLoading } = useBlockTransactions({
    blockNumber: null,
  });

  // Fetch recent blocks for visualization
  const {
    blocks: recentBlocks,
    isLoading: recentBlocksLoading,
    hasOlderBlocks,
    isAtLatest,
  } = useRecentBlocks({ count: 6, offset: blocksOffset });

  // Navigate to older/newer blocks
  const handleLoadOlderBlocks = useCallback(() => {
    setBlocksOffset(prev => prev + 6);
  }, []);

  const handleLoadNewerBlocks = useCallback(() => {
    setBlocksOffset(prev => Math.max(0, prev - 6));
  }, []);

  // Transform recent blocks to CardChainItem format
  const recentBlockItems = useMemo<CardChainItem[]>(() => {
    if (!recentBlocks.length) return [];

    // Calculate max gas in current view for relative fill
    const maxGasInView = Math.max(...recentBlocks.map(b => b.gasUsed));

    return recentBlocks.map((block, index) => {
      const isNewest = index === recentBlocks.length - 1;
      const isActuallyLatest = isNewest && isAtLatest;
      const gasPercentage = maxGasInView > 0 ? (block.gasUsed / maxGasInView) * 100 : 0;

      return {
        id: block.blockNumber,
        label: 'Block',
        value: block.blockNumber,
        stats: [
          { label: 'Gas', value: formatCompact(block.gasUsed) },
          { label: 'Opcodes', value: formatCompact(block.opcodeCount) },
        ],
        fillPercentage: gasPercentage,
        isHighlighted: isActuallyLatest,
      };
    });
  }, [recentBlocks, isAtLatest]);

  // Handle quick search from URL
  useEffect(() => {
    if (search.tx && isValidTxHash(search.tx)) {
      setSearchInput(search.tx);
    }
    if (search.block) {
      navigate({
        to: '/ethereum/execution/gas-profiler/block/$blockNumber',
        params: { blockNumber: String(search.block) },
      });
    }
  }, [search.tx, search.block, navigate]);

  // Handle search submission
  const handleSearch = useCallback(() => {
    setSearchError(null);

    // Strip commas from input (for copy-pasted numbers like "24,245,080")
    const cleanedInput = searchInput.replace(/,/g, '');

    if (isValidBlockNumber(cleanedInput) && !cleanedInput.startsWith('0x')) {
      const blockNum = parseInt(cleanedInput, 10);

      // Validate block is within indexed bounds
      if (bounds) {
        if (blockNum < bounds.min || blockNum > bounds.max) {
          setSearchError(
            `Block ${formatGas(blockNum)} is outside indexed range (${formatGas(bounds.min)} - ${formatGas(bounds.max)})`
          );
          return;
        }
      }

      navigate({
        to: '/ethereum/execution/gas-profiler/block/$blockNumber',
        params: { blockNumber: cleanedInput },
      });
      return;
    }

    if (isValidTxHash(cleanedInput)) {
      navigate({
        to: '/ethereum/execution/gas-profiler/tx/$txHash',
        params: { txHash: cleanedInput },
      });
      return;
    }

    setSearchError('Enter a valid transaction hash (0x...) or block number');
  }, [searchInput, navigate, bounds]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  // ============================================================================
  // CHART OPTIONS
  // ============================================================================

  // Top Opcodes Bar Chart
  const topOpcodesOption = useMemo(
    () => ({
      grid: { left: 80, right: 60, top: 10, bottom: 30 },
      xAxis: {
        type: 'value',
        axisLine: { show: true, lineStyle: { color: colors.border } },
        splitLine: { show: false },
        axisLabel: {
          color: colors.muted,
          formatter: (value: number) => formatCompact(value),
        },
      },
      yAxis: {
        type: 'category',
        data: [...DUMMY_TOP_OPCODES].reverse().map(d => d.opcode),
        axisLine: { show: true, lineStyle: { color: colors.border } },
        axisLabel: { color: colors.foreground, fontFamily: 'monospace' },
      },
      series: [
        {
          type: 'bar',
          data: [...DUMMY_TOP_OPCODES].reverse().map(d => d.totalGas),
          itemStyle: {
            color: colors.primary,
            borderRadius: [0, 4, 4, 0],
          },
          label: {
            show: true,
            position: 'right',
            color: colors.muted,
            fontSize: 10,
            formatter: (params: { value: number }) => formatCompact(params.value as number),
          },
        },
      ],
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.surface,
        borderColor: colors.border,
        textStyle: { color: colors.foreground },
        formatter: (params: { name: string; value: number }[]) => {
          const d = DUMMY_TOP_OPCODES.find(o => o.opcode === params[0].name);
          return `<strong>${params[0].name}</strong><br/>
            Gas: ${formatGas(params[0].value)}<br/>
            Count: ${formatGas(d?.count ?? 0)}<br/>
            Avg: ${d?.avgGas ?? 0} gas/op`;
        },
      },
    }),
    [colors]
  );

  // Opcode Categories Pie Chart
  const categoriesOption = useMemo(
    () => ({
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '50%'],
          data: DUMMY_OPCODE_CATEGORIES.map((d, i) => ({
            name: d.category,
            value: d.gas,
            itemStyle: {
              color: [colors.primary, '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'][i],
            },
          })),
          label: {
            show: true,
            color: colors.foreground,
            formatter: '{b}\n{d}%',
            fontSize: 11,
          },
          labelLine: {
            lineStyle: { color: colors.border },
          },
        },
      ],
      tooltip: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        textStyle: { color: colors.foreground },
        formatter: (params: { name: string; value: number; percent: number }) =>
          `<strong>${params.name}</strong><br/>Gas: ${formatGas(params.value)}<br/>${params.percent.toFixed(1)}%`,
      },
    }),
    [colors]
  );

  // Gas Trend chart config using MultiLineChart
  const gasTrendConfig = useMemo(() => {
    const data = DUMMY_GAS_TREND;

    // Extract arrays for each metric
    const avgValues = data.map(d => d.avg);
    const movingAvgValues = data.map(d => d.movingAvg);
    const medianValues = data.map(d => d.median);
    const minValues = data.map(d => d.min);
    const maxValues = data.map(d => d.max);
    const p5Values = data.map(d => d.p5);
    const p95Values = data.map(d => d.p95);
    const lowerBandValues = data.map(d => d.lowerBand);
    const upperBandValues = data.map(d => d.upperBand);
    const timestamps = data.map(d => d.timestamp);

    return {
      timestamps,
      series: [
        createStatisticSeries('Average', avgValues, {
          color: '#10b981',
          lineWidth: 2.5,
          group: 'Statistics',
        }),
        createStatisticSeries('Moving Avg', movingAvgValues, {
          color: '#06b6d4',
          lineWidth: 2,
          group: 'Statistics',
        }),
        createStatisticSeries('Median', medianValues, {
          color: '#a855f7',
          lineWidth: 1.5,
          lineStyle: 'dotted',
          group: 'Statistics',
        }),
        ...createBandSeries('Bollinger', 'gas-bollinger', lowerBandValues, upperBandValues, {
          color: '#f59e0b',
          opacity: 0.15,
          group: 'Bands',
          initiallyVisible: false,
        }),
        ...createBandSeries('P5/P95', 'gas-percentile', p5Values, p95Values, {
          color: '#6366f1',
          opacity: 0.1,
          group: 'Bands',
        }),
        ...createBandSeries('Min/Max', 'gas-minmax', minValues, maxValues, {
          color: '#64748b',
          opacity: 0.06,
          group: 'Bands',
        }),
      ],
    };
  }, []);

  // Call Types Donut Chart
  const callTypesOption = useMemo(
    () => ({
      series: [
        {
          type: 'pie',
          radius: ['50%', '75%'],
          center: ['50%', '50%'],
          data: DUMMY_CALL_TYPES.map((d, i) => ({
            name: d.type,
            value: d.count,
            itemStyle: {
              color: ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#f97316'][i],
            },
          })),
          label: {
            show: true,
            color: colors.foreground,
            formatter: '{b}',
            fontSize: 10,
          },
          labelLine: { lineStyle: { color: colors.border } },
        },
      ],
      tooltip: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        textStyle: { color: colors.foreground },
        formatter: (params: { name: string; value: number }) => {
          const d = DUMMY_CALL_TYPES.find(t => t.type === params.name);
          return `<strong>${params.name}</strong><br/>Count: ${formatGas(params.value)}<br/>Gas: ${formatGas(d?.gasUsed ?? 0)}`;
        },
      },
    }),
    [colors]
  );

  // Complexity Histogram
  const complexityOption = useMemo(
    () => ({
      grid: { left: 50, right: 20, top: 10, bottom: 40 },
      xAxis: {
        type: 'category',
        data: DUMMY_COMPLEXITY.map(d => d.range),
        axisLine: { show: true, lineStyle: { color: colors.border } },
        axisLabel: { color: colors.muted, fontSize: 10 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: true, lineStyle: { color: colors.border } },
        splitLine: { show: false },
        axisLabel: {
          color: colors.muted,
          formatter: (value: number) => formatCompact(value),
        },
      },
      series: [
        {
          type: 'bar',
          data: DUMMY_COMPLEXITY.map((d, i) => ({
            value: d.count,
            itemStyle: {
              color: ['#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444'][i],
              borderRadius: [4, 4, 0, 0],
            },
          })),
          label: {
            show: true,
            position: 'top',
            color: colors.muted,
            fontSize: 10,
            formatter: (params: { value: number }) => formatCompact(params.value as number),
          },
        },
      ],
      tooltip: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        textStyle: { color: colors.foreground },
        formatter: (params: { name: string; value: number }) => {
          const d = DUMMY_COMPLEXITY.find(c => c.range === params.name);
          return `<strong>${d?.label}</strong><br/>Calls: ${params.name}<br/>TXs: ${formatGas(params.value)}`;
        },
      },
    }),
    [colors]
  );

  // Opcodes Per Second chart config using MultiLineChart
  const opcodesPerSecondConfig = useMemo(() => {
    const data = DUMMY_OPCODES_PER_SECOND;

    // Extract arrays for each metric
    const avgValues = data.map(d => d.avg);
    const movingAvgValues = data.map(d => d.movingAvg);
    const medianValues = data.map(d => d.median);
    const minValues = data.map(d => d.min);
    const maxValues = data.map(d => d.max);
    const p5Values = data.map(d => d.p5);
    const p95Values = data.map(d => d.p95);
    const lowerBandValues = data.map(d => d.lowerBand);
    const upperBandValues = data.map(d => d.upperBand);
    const timestamps = data.map(d => d.timestamp);

    return {
      timestamps,
      series: [
        createStatisticSeries('Average', avgValues, {
          color: '#10b981',
          lineWidth: 2.5,
          group: 'Statistics',
        }),
        createStatisticSeries('Moving Avg', movingAvgValues, {
          color: '#06b6d4',
          lineWidth: 2,
          group: 'Statistics',
        }),
        createStatisticSeries('Median', medianValues, {
          color: '#a855f7',
          lineWidth: 1.5,
          lineStyle: 'dotted',
          group: 'Statistics',
        }),
        ...createBandSeries('Bollinger', 'ops-bollinger', lowerBandValues, upperBandValues, {
          color: '#f59e0b',
          opacity: 0.15,
          group: 'Bands',
          initiallyVisible: false,
        }),
        ...createBandSeries('P5/P95', 'ops-percentile', p5Values, p95Values, {
          color: '#6366f1',
          opacity: 0.1,
          group: 'Bands',
        }),
        ...createBandSeries('Min/Max', 'ops-minmax', minValues, maxValues, {
          color: '#64748b',
          opacity: 0.06,
          group: 'Bands',
        }),
      ],
    };
  }, []);

  // Loading state
  if (boundsLoading) {
    return (
      <Container>
        <Header
          title="Gas Profiler"
          description="Analyze Ethereum transaction gas consumption with call tree visualization and opcode breakdown"
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
          title="Gas Profiler"
          description="Analyze Ethereum transaction gas consumption with call tree visualization and opcode breakdown"
        />
        <Alert variant="error" title="Error loading data" description={error.message} />
      </Container>
    );
  }

  // No bounds available
  if (!bounds) {
    return (
      <Container>
        <Header
          title="Gas Profiler"
          description="Analyze Ethereum transaction gas consumption with call tree visualization and opcode breakdown"
        />
        <Alert
          variant="warning"
          title="No data available"
          description="Gas profiling data is not yet available. Blocks are still being indexed."
        />
      </Container>
    );
  }

  const totalNetworkGas = DUMMY_TOP_OPCODES.reduce((sum, o) => sum + o.totalGas, 0);

  return (
    <Container>
      <Header
        title="Gas Profiler"
        description="Analyze Ethereum transaction gas consumption with call tree visualization and opcode breakdown"
      />

      {/* Search Section */}
      <div className="mb-6">
        <Input
          error={!!searchError}
          errorMessage={searchError ?? undefined}
          helperText={!searchError ? `Indexed range: ${formatGas(bounds.min)} - ${formatGas(bounds.max)}` : undefined}
        >
          <Input.Leading>
            <MagnifyingGlassIcon />
          </Input.Leading>
          <Input.Field
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Search by transaction hash (0x...) or block number"
          />
          <Input.Trailing type="button">
            <Button size="sm" onClick={handleSearch}>
              Search
            </Button>
          </Input.Trailing>
        </Input>
      </div>

      {/* Key Stats Row */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xs bg-primary/10 p-2">
              <CubeIcon className="size-5 text-primary" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">{formatGas(bounds.max - bounds.min + 1)}</div>
              <div className="text-xs text-muted">Blocks Indexed</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xs bg-success/10 p-2">
              <FireIcon className="size-5 text-success" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">{formatCompact(totalNetworkGas)}</div>
              <div className="text-xs text-muted">Total Gas Indexed</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xs bg-warning/10 p-2">
              <DocumentTextIcon className="size-5 text-warning" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">~106K</div>
              <div className="text-xs text-muted">Transactions</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xs bg-purple-500/10 p-2">
              <CpuChipIcon className="size-5 text-purple-500" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">~1.2M</div>
              <div className="text-xs text-muted">Calls</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Blocks Chain Visualization */}
      <CardChain
        className="mb-6"
        items={recentBlockItems}
        isLoading={recentBlocksLoading}
        skeletonCount={6}
        onLoadPrevious={handleLoadOlderBlocks}
        onLoadNext={handleLoadNewerBlocks}
        hasPreviousItems={hasOlderBlocks}
        hasNextItems={!isAtLatest}
        renderItemWrapper={(item, _index, children) => (
          <Link
            key={item.id}
            to="/ethereum/execution/gas-profiler/block/$blockNumber"
            params={{ blockNumber: String(item.id) }}
            className="group relative flex-1"
          >
            {children}
          </Link>
        )}
      />

      {/* Main Charts Grid */}
      <div className="mb-6 grid grid-cols-2 gap-6">
        {/* Top Opcodes */}
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Top Opcodes by Gas</h3>
            <span className="rounded-xs bg-amber-500/10 px-2 py-0.5 text-xs text-amber-500">Network-wide</span>
          </div>
          <p className="mb-3 text-xs text-muted">
            Which EVM operations consume the most gas across all indexed transactions
          </p>
          <ReactECharts option={topOpcodesOption} style={{ height: 320 }} />
        </Card>

        {/* Opcode Categories */}
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Gas by Category</h3>
            <span className="rounded-xs bg-amber-500/10 px-2 py-0.5 text-xs text-amber-500">Network-wide</span>
          </div>
          <p className="mb-3 text-xs text-muted">
            High-level breakdown of where gas is spent: storage, compute, memory, etc.
          </p>
          <ReactECharts option={categoriesOption} style={{ height: 320 }} />
        </Card>
      </div>

      {/* Time Series Charts Row */}
      <div className="mb-6 grid grid-cols-2 gap-6">
        {/* Gas Trend */}
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Gas Usage Trend</h3>
            <span className="text-xs text-muted">Last {DUMMY_GAS_TREND.length} hours</span>
          </div>
          <MultiLineChart
            series={gasTrendConfig.series}
            xAxis={{
              type: 'time',
              timestamps: gasTrendConfig.timestamps,
            }}
            yAxis={{
              name: 'Gas Used',
              formatter: (value: number) => formatCompact(value),
            }}
            height={200}
            showLegend
            legendPosition="top"
            enableDataZoom
          />
        </Card>

        {/* Opcodes Per Second */}
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Opcodes Per Second</h3>
            <span className="text-xs text-muted">Last {DUMMY_OPCODES_PER_SECOND.length} hours</span>
          </div>
          <MultiLineChart
            series={opcodesPerSecondConfig.series}
            xAxis={{
              type: 'time',
              timestamps: opcodesPerSecondConfig.timestamps,
            }}
            yAxis={{
              name: 'Ops/sec',
              formatter: (value: number) => formatCompact(value),
            }}
            height={200}
            showLegend
            legendPosition="top"
            enableDataZoom
          />
        </Card>
      </div>

      {/* Secondary Charts Row */}
      <div className="mb-6 grid grid-cols-2 gap-6">
        {/* Call Types */}
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-medium text-foreground">Call Type Distribution</h3>
          <p className="mb-3 text-xs text-muted">CALL vs DELEGATECALL vs CREATE patterns</p>
          <ReactECharts option={callTypesOption} style={{ height: 200 }} />
        </Card>

        {/* TX Complexity */}
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-medium text-foreground">Transaction Complexity</h3>
          <p className="mb-3 text-xs text-muted">Distribution by call depth</p>
          <ReactECharts option={complexityOption} style={{ height: 200 }} />
        </Card>
      </div>

      {/* API Needed Notice */}
      <div className="mt-6 rounded-xs border border-dashed border-amber-500/50 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="mt-0.5 size-5 text-amber-500" />
          <div>
            <h4 className="text-sm font-medium text-amber-500">Dummy Data Notice</h4>
            <p className="mt-1 text-xs text-muted">The charts above use mock data. APIs needed to make this real:</p>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              <li>
                • <code className="text-amber-500/80">GET /network/opcodes</code> - Network-wide opcode aggregation
              </li>
              <li>
                • <code className="text-amber-500/80">GET /network/categories</code> - Opcode category breakdown
              </li>
              <li>
                • <code className="text-amber-500/80">GET /network/gas-trend</code> - Gas per block time series
              </li>
              <li>
                • <code className="text-amber-500/80">GET /network/opcodes-per-second</code> - Opcodes per second time
                series
              </li>
              <li>
                • <code className="text-amber-500/80">GET /network/call-types</code> - Call type distribution
              </li>
              <li>
                • <code className="text-amber-500/80">GET /network/complexity</code> - TX complexity histogram
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Container>
  );
}
