import { type JSX, useState, useCallback, useEffect, useMemo } from 'react';
import { useSearch, useNavigate, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { MagnifyingGlassIcon, ChartBarIcon, BeakerIcon } from '@heroicons/react/24/outline';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Divider } from '@/components/Layout/Divider';
import { Alert } from '@/components/Feedback/Alert';
import { Input } from '@/components/Forms/Input';
// TODO: Re-enable when fork annotation data is available
// import { Toggle } from '@/components/Forms/Toggle';
import { Button } from '@/components/Elements/Button';
import { CardChain, type CardChainItem } from '@/components/DataDisplay/CardChain';
import { useNetwork } from '@/hooks/useNetwork';
import { useForks } from '@/hooks/useForks';
import {
  MultiLineChart,
  createStatisticSeries,
  createBandSeries,
  createForkMarkLines,
  createExecutionForkMarkLines,
  createBlobScheduleMarkLines,
} from '@/components/Charts/MultiLine';
import { BarChart } from '@/components/Charts/Bar';
import {
  fctOpcodeOpsHourlyServiceListOptions,
  fctOpcodeOpsDailyServiceListOptions,
  fctOpcodeGasByOpcodeHourlyServiceListOptions,
  fctOpcodeGasByOpcodeDailyServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type { FctOpcodeOpsHourly, FctOpcodeOpsDaily } from '@/api/types.gen';
import { useRecentBlocks } from './hooks/useRecentBlocks';
import { useGasProfilerBounds } from './hooks/useGasProfilerBounds';
import { GasProfilerSkeleton, OpcodeAnalysis } from './components';
import { type TimePeriod, TIME_RANGE_CONFIG, TIME_PERIOD_OPTIONS } from './constants';
import { getOpcodeCategory, CATEGORY_COLORS } from './utils';
import type { GasProfilerHomeSearch } from './IndexPage.types';

// ============================================================================
// TOOLTIP UTILITIES (matching execution/overview pattern)
// ============================================================================

/** Formats a date for tooltip display with more detail */
function formatTooltipDate(value: number | string, isDaily: boolean): string {
  if (isDaily) {
    const date = new Date((value as string) + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  const date = new Date((value as number) * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
  });
}

/** Item configuration for tooltip rows */
interface TooltipItem {
  color: string;
  label: string;
  value: string;
  /** Visual style indicator: 'line' (default), 'dashed', 'dotted', 'area' */
  style?: 'line' | 'dashed' | 'dotted' | 'area';
}

/** Section configuration for tooltip */
interface TooltipSection {
  title: string;
  items: TooltipItem[];
}

/** Builds a single tooltip row HTML */
function buildTooltipRow(item: TooltipItem, fontSize: number = 12): string {
  let indicator: string;
  switch (item.style) {
    case 'dashed':
      indicator = `<span style="width: 10px; height: 0; border-top: 2px dashed ${item.color};"></span>`;
      break;
    case 'dotted':
      indicator = `<span style="width: 10px; height: 3px; border-radius: 1px; border-top: 2px dotted ${item.color};"></span>`;
      break;
    case 'area':
      indicator = `<span style="width: 10px; height: 6px; border-radius: 1px; background: ${item.color}; opacity: 0.5;"></span>`;
      break;
    default:
      indicator = `<span style="width: 10px; height: 3px; border-radius: 1px; background: ${item.color};"></span>`;
  }

  return `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: ${fontSize}px;">
    ${indicator}
    <span>${item.label}</span>
    <span style="margin-left: auto; font-weight: 600;">${item.value}</span>
  </div>`;
}

/** Builds complete tooltip HTML from sections */
function buildTooltipHtml(dateStr: string, sections: TooltipSection[]): string {
  let html = `<div style="margin-bottom: 10px; font-weight: 600; font-size: 13px;">${dateStr}</div>`;

  sections.forEach((section, idx) => {
    if (idx > 0) {
      html += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(128,128,128,0.3);">`;
    }
    html += `<div style="margin-bottom: 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af;">${section.title}</div>`;

    section.items.forEach(item => {
      const itemHtml = buildTooltipRow(item);
      // For band items, use muted text color
      if (section.title === 'BANDS') {
        html += itemHtml
          .replace(/<span>([^<]+)<\/span>/, '<span style="color: #d1d5db;">$1</span>')
          .replace(
            /<span style="margin-left: auto; font-weight: 600;">/,
            '<span style="margin-left: auto; color: #d1d5db;">'
          );
      } else {
        html += itemHtml;
      }
    });

    if (idx > 0) {
      html += `</div>`;
    }
  });

  return html;
}

/** Formats an ops band range for display */
function formatOpsBand(lower: number | undefined, upper: number | undefined): string {
  const l = lower ?? 0;
  const u = upper ?? 0;
  return `${formatCompact(l)} – ${formatCompact(u)}`;
}

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
// COMPONENT
// ============================================================================

/**
 * Gas Profiler Home page - search and network analytics
 */
export function HomePage(): JSX.Element {
  const search = useSearch({ from: '/ethereum/execution/gas-profiler/' }) as GasProfilerHomeSearch;
  const navigate = useNavigate({ from: '/ethereum/execution/gas-profiler/' });
  const { currentNetwork } = useNetwork();
  const { allForks } = useForks();

  // Time period from URL search params
  const timePeriod: TimePeriod = search.t ?? '7d';
<<<<<<< HEAD
  // TODO: Re-enable when fork annotation data is available
  // const [showAnnotations, setShowAnnotations] = useState(true);
  const showAnnotations = true;
=======
  const [showAnnotations, setShowAnnotations] = useState(true);
>>>>>>> 970f76f1831fc675b4f63895567851e56744e1ba
  const config = TIME_RANGE_CONFIG[timePeriod];
  const isDaily = config.dataType === 'daily';

  // Search input states
  const [searchInput, setSearchInput] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [blocksOffset, setBlocksOffset] = useState(0);

  // Fetch bounds to validate block range - uses intersection of all gas profiler tables
  const { data: bounds, isLoading: boundsLoading, error } = useGasProfilerBounds();

  // Fetch recent blocks for visualization
  const {
    blocks: recentBlocks,
    isLoading: recentBlocksLoading,
    isFetching: _recentBlocksFetching,
    hasOlderBlocks,
    isAtLatest,
  } = useRecentBlocks({ count: 6, offset: blocksOffset });

  // Calculate timestamp for start of selected time range
  const startTimestamp = useMemo(() => {
    if (config.days === null) return undefined;
    const now = Math.floor(Date.now() / 1000);
    return now - config.days * 24 * 60 * 60;
  }, [config.days]);

  // Opcode Ops Per Second Queries (real data)
  const opcodeOpsHourlyQuery = useQuery({
    ...fctOpcodeOpsHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        order_by: 'hour_start_date_time asc',
        page_size: config.pageSize,
      },
    }),
    enabled: !isDaily,
  });

  const opcodeOpsDailyQuery = useQuery({
    ...fctOpcodeOpsDailyServiceListOptions({
      query: {
        day_start_date_like: '20%',
        order_by: 'day_start_date desc',
        page_size: config.pageSize,
      },
    }),
    enabled: isDaily,
  });

  // Top Opcodes by Gas Queries (real data)
  const opcodeGasHourlyQuery = useQuery({
    ...fctOpcodeGasByOpcodeHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        order_by: 'total_gas desc',
        page_size: 1000, // Get all opcodes for aggregation
      },
    }),
    enabled: !isDaily,
  });

  const opcodeGasDailyQuery = useQuery({
    ...fctOpcodeGasByOpcodeDailyServiceListOptions({
      query: {
        day_start_date_like: '20%',
        order_by: 'total_gas desc',
        page_size: 1000, // Get all opcodes for aggregation
      },
    }),
    enabled: isDaily,
  });

  // Opcode ops records
  const opcodeOpsRecords = useMemo(
    () =>
      isDaily
        ? [...(opcodeOpsDailyQuery.data?.fct_opcode_ops_daily ?? [])].reverse()
        : opcodeOpsHourlyQuery.data?.fct_opcode_ops_hourly,
    [isDaily, opcodeOpsDailyQuery.data, opcodeOpsHourlyQuery.data]
  );

  // Aggregate opcodes for OpcodeAnalysis component
  const opcodeStats = useMemo(() => {
    const records = isDaily
      ? opcodeGasDailyQuery.data?.fct_opcode_gas_by_opcode_daily
      : opcodeGasHourlyQuery.data?.fct_opcode_gas_by_opcode_hourly;

    if (!records?.length) return [];

    // Aggregate gas by opcode across all time periods
    const opcodeMap = new Map<string, { totalGas: number; totalCount: number }>();
    for (const r of records) {
      if (!r.opcode) continue;
      const current = opcodeMap.get(r.opcode) ?? { totalGas: 0, totalCount: 0 };
      opcodeMap.set(r.opcode, {
        totalGas: current.totalGas + (r.total_gas ?? 0),
        totalCount: current.totalCount + (r.total_count ?? 0),
      });
    }

    // Convert to OpcodeStats format for OpcodeAnalysis component
    return [...opcodeMap.entries()]
      .map(([opcode, data]) => ({
        opcode,
        totalGas: data.totalGas,
        count: data.totalCount,
      }))
      .sort((a, b) => b.totalGas - a.totalGas);
  }, [isDaily, opcodeGasDailyQuery.data, opcodeGasHourlyQuery.data]);

  // Aggregate gas by category across the time period (top 8 + Other for bar chart)
  const gasByCategoryData = useMemo(() => {
    const records = isDaily
      ? opcodeGasDailyQuery.data?.fct_opcode_gas_by_opcode_daily
      : opcodeGasHourlyQuery.data?.fct_opcode_gas_by_opcode_hourly;

    if (!records?.length) return { labels: [], data: [], total: 0 };

    // Aggregate gas by category
    const categoryMap = new Map<string, number>();
    for (const r of records) {
      if (!r.opcode) continue;
      const category = getOpcodeCategory(r.opcode);
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + (r.total_gas ?? 0));
    }

    // Sort by gas descending
    const sorted = [...categoryMap.entries()].sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((sum, [, val]) => sum + val, 0);

    // Take top 12, group rest as "Other"
    const MAX_CATEGORIES = 12;
    const top = sorted.slice(0, MAX_CATEGORIES);
    const rest = sorted.slice(MAX_CATEGORIES);
    const otherValue = rest.reduce((sum, [, val]) => sum + val, 0);

    // Build final list (reversed so largest is at top in horizontal bar chart)
    const final = otherValue > 0 ? [...top, ['Other', otherValue] as [string, number]] : top;
    const reversed = final.reverse();

    return {
      labels: reversed.map(([name]) => name),
      data: reversed.map(([name, value]) => ({
        value,
        color: name === 'Other' ? '#6b7280' : (CATEGORY_COLORS[name] ?? '#6b7280'),
      })),
      total,
    };
  }, [isDaily, opcodeGasDailyQuery.data, opcodeGasHourlyQuery.data]);

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
    const cleanedInput = searchInput.replace(/,/g, '');

    if (isValidBlockNumber(cleanedInput) && !cleanedInput.startsWith('0x')) {
      const blockNum = parseInt(cleanedInput, 10);
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
  // CHART CONFIGS
  // ============================================================================

  // Opcodes Per Second chart config (real data)
  const opcodesPerSecondConfig = useMemo(() => {
    if (!opcodeOpsRecords?.length) return null;

    const labels: string[] = [];
    const avgValues: (number | null)[] = [];
    const movingAvgValues: (number | null)[] = [];
    const medianValues: (number | null)[] = [];
    const minValues: (number | null)[] = [];
    const maxValues: (number | null)[] = [];
    const p5Values: (number | null)[] = [];
    const p95Values: (number | null)[] = [];
    const lowerBandValues: (number | null)[] = [];
    const upperBandValues: (number | null)[] = [];

    for (const r of opcodeOpsRecords) {
      // Format labels for display: daily uses date string as-is, hourly formats timestamp
      let label: string;
      if (isDaily) {
        label = (r as FctOpcodeOpsDaily).day_start_date ?? '';
      } else {
        const ts = (r as FctOpcodeOpsHourly).hour_start_date_time ?? 0;
        const date = new Date(ts * 1000);
        label = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: '2-digit',
          timeZone: 'UTC',
        });
      }

      labels.push(label);
      avgValues.push(r.avg_ops ?? null);
      movingAvgValues.push(r.moving_avg_ops ?? null);
      medianValues.push(r.p50_ops ?? null);
      minValues.push(r.min_ops ?? null);
      maxValues.push(r.max_ops ?? null);
      p5Values.push(r.p05_ops ?? null);
      p95Values.push(r.p95_ops ?? null);
      lowerBandValues.push(r.lower_band_ops ?? null);
      upperBandValues.push(r.upper_band_ops ?? null);
    }

    return {
      labels,
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
  }, [opcodeOpsRecords, isDaily]);

  // Fork annotation mark lines
  const forkMarkLines = useMemo(() => {
    if (!currentNetwork || !allForks.length) return [];
    const labels = opcodesPerSecondConfig?.labels ?? [];
    if (!labels.length) return [];

    const consensusLines = createForkMarkLines({
      forks: allForks,
      labels,
      genesisTime: currentNetwork.genesis_time,
      isDaily,
    });

    const executionLines = currentNetwork.forks?.execution
      ? createExecutionForkMarkLines({
          executionForks: currentNetwork.forks.execution,
          labels,
        })
      : [];

    const blobLines = currentNetwork.blob_schedule?.length
      ? createBlobScheduleMarkLines({
          blobSchedule: currentNetwork.blob_schedule,
          labels,
          genesisTime: currentNetwork.genesis_time,
        })
      : [];

    return [...consensusLines, ...executionLines, ...blobLines];
  }, [currentNetwork, allForks, opcodesPerSecondConfig?.labels, isDaily]);

  // Opcode Ops tooltip formatter
  const opsTooltipFormatter = useCallback(
    (params: unknown): string => {
      if (!opcodeOpsRecords?.length || !opcodesPerSecondConfig) return '';

      const recordsByKey = new Map<string, FctOpcodeOpsHourly | FctOpcodeOpsDaily>();
      for (const r of opcodeOpsRecords) {
        let key: string;
        if (isDaily) {
          key = (r as FctOpcodeOpsDaily).day_start_date ?? '';
        } else {
          const ts = (r as FctOpcodeOpsHourly).hour_start_date_time ?? 0;
          const date = new Date(ts * 1000);
          key = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: '2-digit',
            timeZone: 'UTC',
          });
        }
        recordsByKey.set(key, r);
      }

      const dataPoints = Array.isArray(params) ? params : [params];
      if (!dataPoints.length) return '';

      const firstPoint = dataPoints[0] as { dataIndex?: number };
      if (firstPoint.dataIndex === undefined) return '';

      const timeKey = opcodesPerSecondConfig.labels[firstPoint.dataIndex];
      if (!timeKey) return '';

      const record = recordsByKey.get(timeKey);
      if (!record) return '';

      const dateValue = isDaily
        ? ((record as FctOpcodeOpsDaily).day_start_date ?? '')
        : ((record as FctOpcodeOpsHourly).hour_start_date_time ?? 0);
      const dateStr = formatTooltipDate(dateValue, isDaily);

      const sections: TooltipSection[] = [
        {
          title: 'STATISTICS',
          items: [
            { color: '#10b981', label: 'Average', value: formatCompact(record.avg_ops ?? 0) },
            { color: '#06b6d4', label: 'Moving Avg', value: formatCompact(record.moving_avg_ops ?? 0) },
            { color: '#a855f7', label: 'Median', value: formatCompact(record.p50_ops ?? 0), style: 'dotted' },
          ],
        },
        {
          title: 'BANDS',
          items: [
            {
              color: '#f59e0b',
              label: 'Bollinger',
              value: formatOpsBand(record.lower_band_ops, record.upper_band_ops),
              style: 'area',
            },
            { color: '#6366f1', label: 'P5/P95', value: formatOpsBand(record.p05_ops, record.p95_ops), style: 'area' },
            { color: '#64748b', label: 'Min/Max', value: formatOpsBand(record.min_ops, record.max_ops), style: 'area' },
          ],
        },
      ];

      return buildTooltipHtml(dateStr, sections);
    },
    [opcodeOpsRecords, opcodesPerSecondConfig, isDaily]
  );

  // Loading states

  const isOpcodeOpsLoading = isDaily ? opcodeOpsDailyQuery.isLoading : opcodeOpsHourlyQuery.isLoading;

  const isOpcodeGasLoading = isDaily ? opcodeGasDailyQuery.isLoading : opcodeGasHourlyQuery.isLoading;

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

  return (
    <Container>
      <Header
        title="Gas Profiler"
        description="Analyze Ethereum transaction gas consumption with call tree visualization and opcode breakdown"
      />

      {/* ============================================================================
          SECTION 1: Search & Explore
          Real-time block exploration and transaction/block search
          ============================================================================ */}

      {/* Search Input + Simulate */}
      <div className="mb-6 flex items-start gap-4">
        <div className="flex-1">
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
              placeholder="Tx hash or block number"
            />
            <Input.Trailing type="button">
              <Button size="sm" onClick={handleSearch}>
                Search
              </Button>
            </Input.Trailing>
          </Input>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <div className="h-8 w-px bg-border" />
          <Link to="/ethereum/execution/gas-profiler/simulate">
            <Button size="sm" variant="soft">
              <BeakerIcon className="mr-1.5 size-4" />
              Simulate
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent Blocks Chain Visualization */}
      <CardChain
        className="mb-8"
        items={recentBlockItems}
        isLoading={recentBlocksLoading}
        skeletonCount={6}
        onLoadPrevious={handleLoadOlderBlocks}
        onLoadNext={handleLoadNewerBlocks}
        hasPreviousItems={hasOlderBlocks}
        hasNextItems={!isAtLatest}
        renderItemWrapper={(item, index, children) => {
          const fromEnd = recentBlockItems.length - 1 - index;
          return (
            <Link
              key={item.id}
              to="/ethereum/execution/gas-profiler/block/$blockNumber"
              params={{ blockNumber: String(item.id) }}
              className={clsx(
                'group relative flex-1',
                fromEnd >= 3 && 'hidden lg:block',
                fromEnd >= 1 && fromEnd < 3 && 'hidden sm:block'
              )}
            >
              {children}
            </Link>
          );
        }}
      />

      {/* ============================================================================
          SECTION 2: Network Analytics
          Historical gas metrics and opcode analysis
          ============================================================================ */}

      <Divider className="my-8" />

      {/* Section Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xs bg-primary/10 p-2">
            <ChartBarIcon className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Network Analytics</h2>
            <p className="text-sm text-muted">Historical gas consumption and opcode metrics</p>
          </div>
        </div>
      </div>

      {/* Time Period Selector & Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-6">
        <div className="flex flex-wrap items-center gap-1.5">
          {TIME_PERIOD_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => navigate({ search: prev => ({ ...prev, t: value }), replace: true })}
              className={clsx(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                timePeriod === value
                  ? 'text-primary-foreground bg-primary ring-2 ring-primary/30'
                  : 'bg-surface text-muted ring-1 ring-border hover:bg-primary/10 hover:ring-primary/30'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* TODO: Enable when fork annotation data is available
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Show Forks</span>
          <Toggle checked={showAnnotations} onChange={setShowAnnotations} size="small" />
        </div>
        */}
      </div>

      {/* Time Series Charts Row */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Opcodes Per Second */}
        <PopoutCard
          title="Opcodes Per Second"
          subtitle={`EVM opcode execution rate (${timePeriod})`}
          anchorId="ops-chart"
          modalSize="full"
        >
          {({ inModal }) =>
            isOpcodeOpsLoading ? (
              <div className="flex h-[320px] items-center justify-center">
                <div className="animate-pulse text-muted">Loading opcode data...</div>
              </div>
            ) : opcodesPerSecondConfig ? (
              <MultiLineChart
                series={opcodesPerSecondConfig.series}
                xAxis={{
                  type: 'category',
                  labels: opcodesPerSecondConfig.labels,
                  name: 'Date',
                }}
                yAxis={{
                  name: 'Ops/sec',
                  min: 0,
                  formatter: (value: number) => formatCompact(value),
                }}
                height={inModal ? 600 : 320}
                showLegend
                legendPosition="top"
                enableDataZoom
                tooltipFormatter={opsTooltipFormatter}
                markLines={showAnnotations ? forkMarkLines : []}
                syncGroup={inModal ? undefined : 'gas-profiler'}
              />
            ) : (
              <div className="flex h-[320px] items-center justify-center text-muted">No data available</div>
            )
          }
        </PopoutCard>

        {/* Gas by Category */}
        <PopoutCard
          title="Gas by Category"
          subtitle={`Opcode category distribution (${timePeriod})`}
          anchorId="gas-by-category"
          modalSize="full"
        >
          {({ inModal }) =>
            isOpcodeGasLoading ? (
              <div className="flex h-[420px] items-center justify-center">
                <div className="animate-pulse text-muted">Loading category data...</div>
              </div>
            ) : gasByCategoryData.labels.length > 0 ? (
              <BarChart
                data={gasByCategoryData.data}
                labels={gasByCategoryData.labels}
                orientation="horizontal"
                height={inModal ? 500 : 420}
                showLabel
                labelFormatter={(params: { value: number }) => {
                  const pct = gasByCategoryData.total > 0 ? (params.value / gasByCategoryData.total) * 100 : 0;
                  return `${pct.toFixed(1)}%`;
                }}
                barWidth="70%"
                valueAxisLabelFormatter={formatCompact}
                tooltipFormatter={(params: unknown) => {
                  const arr = Array.isArray(params) ? params : [params];
                  const p = arr[0] as { name?: string; value?: number };
                  const pct = gasByCategoryData.total > 0 ? ((p.value ?? 0) / gasByCategoryData.total) * 100 : 0;
                  return `<strong>${p.name}</strong><br/>Gas: ${formatGas(p.value ?? 0)}<br/>${pct.toFixed(1)}% of total`;
                }}
              />
            ) : (
              <div className="flex h-[420px] items-center justify-center text-muted">No category data available</div>
            )
          }
        </PopoutCard>
      </div>

      {/* Opcode Analysis - Charts by Gas and Count */}
      <div className="mb-6">
        {isOpcodeGasLoading ? (
          <div className="flex h-[320px] items-center justify-center rounded-sm border border-border bg-surface/30">
            <div className="animate-pulse text-muted">Loading opcode data...</div>
          </div>
        ) : opcodeStats.length > 0 ? (
          <OpcodeAnalysis opcodeStats={opcodeStats} maxOpcodes={10} showTable={false} />
        ) : (
          <div className="flex h-[320px] items-center justify-center rounded-sm border border-border bg-surface/30 text-muted">
            No opcode data available
          </div>
        )}
      </div>
    </Container>
  );
}
