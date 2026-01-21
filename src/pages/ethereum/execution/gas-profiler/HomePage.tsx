import { type JSX, useState, useCallback, useEffect, useMemo } from 'react';
import { useSearch, useNavigate, Link } from '@tanstack/react-router';
import ReactECharts from 'echarts-for-react';
import {
  MagnifyingGlassIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CubeIcon,
  FireIcon,
  DocumentTextIcon,
  CircleStackIcon,
  CpuChipIcon,
  ArrowsRightLeftIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { Alert } from '@/components/Feedback/Alert';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useBlockTransactions } from './hooks/useBlockTransactions';
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
 */
const DUMMY_GAS_TREND = Array.from({ length: 50 }, (_, i) => ({
  block: 24_243_714 + i,
  gasUsed: 10_000_000 + Math.random() * 20_000_000,
  txCount: 50 + Math.floor(Math.random() * 150),
}));

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
 * Top gas-consuming contracts (DUMMY DATA)
 * TODO: Replace with API call to /api/gas-profiler/network/top-contracts
 */
const DUMMY_TOP_CONTRACTS = [
  {
    address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    name: 'Uniswap V2: Router',
    gasUsed: 456_780_000,
    txCount: 125_000,
  },
  {
    address: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    name: 'Uniswap V3: Router',
    gasUsed: 398_200_000,
    txCount: 98_000,
  },
  {
    address: '0xDef1C0ded9bec7F1a1670819833240f027b25EfF',
    name: '0x: Exchange Proxy',
    gasUsed: 234_100_000,
    txCount: 67_000,
  },
  {
    address: '0x1111111254EEB25477B68fb85Ed929f73A960582',
    name: '1inch V5: Router',
    gasUsed: 198_450_000,
    txCount: 54_000,
  },
  {
    address: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    name: 'Uniswap Universal Router',
    gasUsed: 167_890_000,
    txCount: 45_000,
  },
];

/**
 * Storage access statistics (DUMMY DATA)
 * TODO: Replace with API call to /api/gas-profiler/network/storage-stats
 */
const DUMMY_STORAGE_STATS = {
  totalSloads: 4_250_000,
  totalSstores: 890_000,
  coldAccesses: 1_250_000,
  warmAccesses: 3_890_000,
  uniqueSlots: 2_340_000,
  avgSloadsPerTx: 12.4,
  avgSstoresPerTx: 2.6,
};

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
  const [blockInput, setBlockInput] = useState('');

  // Fetch latest block data
  const { data, isLoading, error, bounds, boundsLoading } = useBlockTransactions({
    blockNumber: null,
  });

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

    if (isValidBlockNumber(searchInput) && !searchInput.startsWith('0x')) {
      navigate({
        to: '/ethereum/execution/gas-profiler/block/$blockNumber',
        params: { blockNumber: searchInput },
      });
      return;
    }

    if (isValidTxHash(searchInput)) {
      if (!blockInput) {
        setSearchError('Please enter the block number for this transaction');
        return;
      }
      if (!isValidBlockNumber(blockInput)) {
        setSearchError('Invalid block number');
        return;
      }
      navigate({
        to: '/ethereum/execution/gas-profiler/tx/$txHash',
        params: { txHash: searchInput },
        search: { block: parseInt(blockInput, 10) },
      });
      return;
    }

    setSearchError('Enter a valid transaction hash (0x...) or block number');
  }, [searchInput, blockInput, navigate]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  const showBlockInput = searchInput.length > 2 && searchInput.startsWith('0x');

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

  // Gas Trend Area Chart
  const gasTrendOption = useMemo(
    () => ({
      grid: { left: 50, right: 20, top: 10, bottom: 30 },
      xAxis: {
        type: 'category',
        data: DUMMY_GAS_TREND.map(d => d.block),
        axisLine: { show: true, lineStyle: { color: colors.border } },
        axisLabel: { show: false },
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
          type: 'line',
          data: DUMMY_GAS_TREND.map(d => d.gasUsed),
          smooth: true,
          symbol: 'none',
          lineStyle: { color: colors.primary, width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${colors.primary}40` },
                { offset: 1, color: `${colors.primary}05` },
              ],
            },
          },
        },
      ],
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.surface,
        borderColor: colors.border,
        textStyle: { color: colors.foreground },
        formatter: (params: { name: string; value: number }[]) => {
          const d = DUMMY_GAS_TREND.find(t => t.block === parseInt(params[0].name));
          return `Block ${params[0].name}<br/>Gas: ${formatGas(params[0].value)}<br/>TXs: ${d?.txCount ?? 0}`;
        },
      },
    }),
    [colors]
  );

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
  if (error && !data) {
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
      <Card className="mb-6 p-4">
        <div className="flex items-center gap-4">
          <MagnifyingGlassIcon className="size-5 text-muted" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Search by transaction hash (0x...) or block number"
            className="flex-1 bg-transparent text-sm text-foreground placeholder-muted focus:outline-none"
          />
          {showBlockInput && (
            <input
              type="text"
              value={blockInput}
              onChange={e => setBlockInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Block #"
              className="w-28 rounded-xs border border-border bg-background px-2 py-1 text-sm text-foreground placeholder-muted focus:border-primary focus:outline-none"
            />
          )}
          <button
            onClick={handleSearch}
            className="rounded-xs bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Search
          </button>
        </div>
        {searchError && (
          <div className="mt-2 flex items-center gap-2 text-sm text-danger">
            <ExclamationTriangleIcon className="size-4" />
            {searchError}
          </div>
        )}
      </Card>

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

      {/* Gas Trend */}
      <Card className="mb-6 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Gas Usage Trend</h3>
          <span className="text-xs text-muted">Last {DUMMY_GAS_TREND.length} blocks</span>
        </div>
        <ReactECharts option={gasTrendOption} style={{ height: 120 }} />
      </Card>

      {/* Secondary Charts Row */}
      <div className="mb-6 grid grid-cols-3 gap-6">
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

        {/* Storage Stats */}
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-medium text-foreground">Storage Access</h3>
          <p className="mb-3 text-xs text-muted">SLOAD/SSTORE patterns (EIP-2929 relevant)</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleStackIcon className="size-4 text-primary" />
                <span className="text-sm text-muted">Total SLOADs</span>
              </div>
              <span className="font-mono text-sm text-foreground">{formatGas(DUMMY_STORAGE_STATS.totalSloads)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowsRightLeftIcon className="size-4 text-warning" />
                <span className="text-sm text-muted">Total SSTOREs</span>
              </div>
              <span className="font-mono text-sm text-foreground">{formatGas(DUMMY_STORAGE_STATS.totalSstores)}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Cold Accesses</span>
              <span className="font-mono text-sm text-foreground">{formatGas(DUMMY_STORAGE_STATS.coldAccesses)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Warm Accesses</span>
              <span className="font-mono text-sm text-foreground">{formatGas(DUMMY_STORAGE_STATS.warmAccesses)}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Cold/Warm Ratio</span>
              <span className="font-mono text-sm text-primary">
                {((DUMMY_STORAGE_STATS.coldAccesses / DUMMY_STORAGE_STATS.warmAccesses) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Contracts Table */}
      <Card className="mb-6 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">Top Gas-Consuming Contracts</h3>
            <p className="text-xs text-muted">Which contracts are responsible for the most gas usage</p>
          </div>
          <span className="rounded-xs bg-amber-500/10 px-2 py-0.5 text-xs text-amber-500">Network-wide</span>
        </div>
        <div className="overflow-hidden rounded-xs border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted">Contract</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted">Gas Used</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted">TX Count</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted">Avg Gas/TX</th>
              </tr>
            </thead>
            <tbody>
              {DUMMY_TOP_CONTRACTS.map((contract, i) => (
                <tr key={contract.address} className={i % 2 === 0 ? 'bg-background' : 'bg-surface/20'}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-foreground">{contract.name}</div>
                    <div className="font-mono text-xs text-muted">{contract.address.slice(0, 20)}...</div>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-sm text-foreground">
                    {formatGas(contract.gasUsed)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-sm text-muted">{formatGas(contract.txCount)}</td>
                  <td className="px-4 py-2 text-right font-mono text-sm text-muted">
                    {formatGas(Math.round(contract.gasUsed / contract.txCount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Latest Block Preview */}
      {data && (
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BeakerIcon className="size-5 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Latest Block #{formatGas(data.blockNumber)}</h3>
            </div>
            <Link
              to="/ethereum/execution/gas-profiler/block/$blockNumber"
              params={{ blockNumber: String(data.blockNumber) }}
              className="flex items-center gap-1 text-sm text-primary transition-colors hover:text-primary/80"
            >
              View Full Block
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-4">
            <div className="rounded-xs bg-surface/50 p-3 text-center">
              <div className="text-lg font-semibold text-foreground">{data.transactionCount}</div>
              <div className="text-xs text-muted">Transactions</div>
            </div>
            <div className="rounded-xs bg-surface/50 p-3 text-center">
              <div className="text-lg font-semibold text-foreground">{formatGas(data.totalGasUsed)}</div>
              <div className="text-xs text-muted">Total Gas</div>
            </div>
            <div className="rounded-xs bg-surface/50 p-3 text-center">
              <div className="text-lg font-semibold text-foreground">
                {data.transactions.filter(tx => tx.hasErrors).length}
              </div>
              <div className="text-xs text-muted">Failed TXs</div>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-medium text-muted">Top Transactions by Gas</h4>
            <div className="space-y-1">
              {[...data.transactions]
                .sort((a, b) => b.totalGasUsed - a.totalGasUsed)
                .slice(0, 5)
                .map(tx => {
                  const gasPercentage = (tx.totalGasUsed / data.totalGasUsed) * 100;
                  return (
                    <Link
                      key={tx.transactionHash}
                      to="/ethereum/execution/gas-profiler/tx/$txHash"
                      params={{ txHash: tx.transactionHash }}
                      search={{ block: data.blockNumber }}
                      className="flex items-center justify-between rounded-xs px-2 py-1.5 transition-colors hover:bg-surface"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-foreground">{tx.transactionHash.slice(0, 14)}...</span>
                        {tx.targetName && <span className="text-xs text-muted">→ {tx.targetName}</span>}
                        {tx.hasErrors && <ExclamationTriangleIcon className="size-4 text-danger" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-foreground">{formatGas(tx.totalGasUsed)}</span>
                        <span className="text-xs text-muted">({gasPercentage.toFixed(1)}%)</span>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        </Card>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="ml-2 text-sm text-muted">Loading latest block...</span>
        </div>
      )}

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
                • <code className="text-amber-500/80">GET /network/call-types</code> - Call type distribution
              </li>
              <li>
                • <code className="text-amber-500/80">GET /network/complexity</code> - TX complexity histogram
              </li>
              <li>
                • <code className="text-amber-500/80">GET /network/top-contracts</code> - Top gas-consuming contracts
              </li>
              <li>
                • <code className="text-amber-500/80">GET /network/storage-stats</code> - Storage access statistics
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Container>
  );
}
