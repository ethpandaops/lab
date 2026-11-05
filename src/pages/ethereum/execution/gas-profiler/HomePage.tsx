import { type JSX, useState, useCallback, useEffect, useMemo } from 'react';
import { useSearch, useNavigate, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { MagnifyingGlassIcon, BeakerIcon } from '@heroicons/react/24/outline';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Divider } from '@/components/Layout/Divider';
import { Alert } from '@/components/Feedback/Alert';
import { CardChain, type CardChainItem } from '@/components/DataDisplay/CardChain';
import { BarChart } from '@/components/Charts/Bar';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import {
  fctOpcodeGasByOpcodeHourlyServiceList,
  fctOpcodeGasByOpcodeDailyServiceList,
  fctOpcodeGasByOpcodeWeeklyServiceList,
} from '@/api/sdk.gen';
import type {
  FctOpcodeGasByOpcodeHourly,
  FctOpcodeGasByOpcodeDaily,
  FctOpcodeGasByOpcodeWeekly,
} from '@/api/types.gen';
import { fetchAllPages } from '@/utils/api-pagination';
import { completeBucketEnd, completeUtcDays, currentUtcDate, currentUtcWeek } from '@/utils/time';
import { useRecentBlocks } from './hooks/useRecentBlocks';
import { useGasProfilerBounds } from './hooks/useGasProfilerBounds';
import { GasProfilerSkeleton, OpcodeAnalysis } from './components';
import { type TimePeriod, TIME_RANGE_CONFIG, TIME_PERIOD_OPTIONS } from './constants';
import { getOpcodeCategory, CATEGORY_COLORS } from './utils';
import type { GasProfilerHomeSearch } from './IndexPage.types';
import { getDataVizColors } from '@/utils/dataVizColors';

const { DATA_COLORS } = getDataVizColors();

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
 * Validate if string is a valid block number
 */
function isValidBlockNumber(value: string): boolean {
  const num = parseInt(value, 10);
  return !isNaN(num) && num >= 0;
}

// ============================================================================
// COMPONENT
// ============================================================================

const PAGE_DESCRIPTION =
  'Analyze Ethereum transaction gas consumption with call tree visualization and opcode breakdown';

/**
 * Gas Profiler Home page - search and network analytics
 */
export function HomePage(): JSX.Element {
  const search = useSearch({ from: '/ethereum/execution/gas-profiler/' }) as GasProfilerHomeSearch;
  const navigate = useNavigate({ from: '/ethereum/execution/gas-profiler/' });
  // Time period from URL search params
  const timePeriod: TimePeriod = search.t ?? 'all';
  const config = TIME_RANGE_CONFIG[timePeriod];
  const isDaily = config.dataType === 'daily';

  // Search input states
  const [searchInput, setSearchInput] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [blocksOffset, setBlocksOffset] = useState(0);

  // Pinned max block — prevents view from jumping when new blocks are indexed.
  // Initialized from bounds on first load, then only advances on explicit user action.
  const [pinnedMax, setPinnedMax] = useState<number | null>(null);

  // Fetch bounds to validate block range - uses intersection of all gas profiler tables
  const { data: bounds, isLoading: boundsLoading, error } = useGasProfilerBounds();

  // Initialize pinnedMax from bounds on first load
  useEffect(() => {
    if (bounds && pinnedMax === null) {
      setPinnedMax(bounds.max);
    }
  }, [bounds, pinnedMax]);

  // Fetch recent blocks for visualization — pinned to anchorBlock
  const {
    blocks: recentBlocks,
    isLoading: recentBlocksLoading,
    isFetching: recentBlocksFetching,
    hasOlderBlocks,
    hasNewerBlocks,
    isAtLatest,
    newerBlockCount,
  } = useRecentBlocks({ count: 6, offset: blocksOffset, anchorBlock: pinnedMax ?? undefined });

  // Rollups are read up to the hour or UTC day in progress, never including it
  const hourlyEnd = useMemo(() => completeBucketEnd('hour'), []);
  const today = useMemo(() => currentUtcDate(), []);
  const startTimestamp = config.days === null ? undefined : hourlyEnd - config.days * 24 * 60 * 60;

  // Top Opcodes by Gas Queries (real data) - with pagination
  const opcodeGasHourlyQuery = useQuery({
    queryKey: ['gas-profiler', 'opcode-gas-hourly', startTimestamp],
    queryFn: ({ signal }) =>
      fetchAllPages<FctOpcodeGasByOpcodeHourly>(
        fctOpcodeGasByOpcodeHourlyServiceList,
        {
          query: {
            hour_start_date_time_gte: startTimestamp,
            hour_start_date_time_lt: hourlyEnd,
            order_by: 'total_gas desc',
            page_size: 10000,
          },
        },
        'fct_opcode_gas_by_opcode_hourly',
        signal
      ),
    enabled: !isDaily,
  });

  const opcodeGasDailyQuery = useQuery({
    queryKey: ['gas-profiler', 'opcode-gas-daily', config.days, today],
    queryFn: async ({ signal }) => {
      const daily = (dates: Record<string, string>): Promise<FctOpcodeGasByOpcodeDaily[]> =>
        fetchAllPages<FctOpcodeGasByOpcodeDaily>(
          fctOpcodeGasByOpcodeDailyServiceList,
          { query: { ...dates, order_by: 'total_gas desc', page_size: 10000 } },
          'fct_opcode_gas_by_opcode_daily',
          signal
        );
      // The date key only filters by value, so bounded ranges list their dates
      if (config.days !== null) return daily({ day_start_date_in_values: completeUtcDays(config.days).join(',') });

      // All: complete weeks from the weekly table, then the days after its last week from the daily table
      const weeks = await fetchAllPages<FctOpcodeGasByOpcodeWeekly>(
        fctOpcodeGasByOpcodeWeeklyServiceList,
        { query: { week_start_date_ne: currentUtcWeek(), order_by: 'total_gas desc', page_size: 10000 } },
        'fct_opcode_gas_by_opcode_weekly',
        signal
      );
      const lastWeek = weeks.reduce(
        (last, row) => (row.week_start_date && row.week_start_date > last ? row.week_start_date : last),
        ''
      );
      if (!lastWeek) return daily({ day_start_date_ne: today });
      const days = (completeBucketEnd('day') - Date.parse(lastWeek) / 1000) / 86400 - 7;
      return days > 0
        ? [...weeks, ...(await daily({ day_start_date_in_values: completeUtcDays(days).join(',') }))]
        : weeks;
    },
    enabled: isDaily,
  });

  // Aggregate opcodes for OpcodeAnalysis component (fetchAllPages returns array directly)
  const opcodeStats = useMemo(() => {
    const records = isDaily ? opcodeGasDailyQuery.data : opcodeGasHourlyQuery.data;

    if (!records?.length) return [];

    // Aggregate gas by opcode across the filtered time period
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
  // Filter by time period for daily data
  const gasByCategoryData = useMemo(() => {
    const records = isDaily ? opcodeGasDailyQuery.data : opcodeGasHourlyQuery.data;

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
        color: name === 'Other' ? DATA_COLORS.slate : (CATEGORY_COLORS[name] ?? DATA_COLORS.slate),
      })),
      total,
    };
  }, [isDaily, opcodeGasDailyQuery.data, opcodeGasHourlyQuery.data]);

  // Navigate to older/newer blocks
  const handleLoadOlderBlocks = useCallback(() => {
    setBlocksOffset(prev => prev + 6);
  }, []);

  const handleLoadNewerBlocks = useCallback(() => {
    if (blocksOffset > 0) {
      // Navigate back toward the pinned anchor
      setBlocksOffset(prev => Math.max(0, prev - 6));
    } else if (bounds && pinnedMax !== null && bounds.max > pinnedMax) {
      // At anchor but newer blocks exist — advance anchor by one page
      setPinnedMax(Math.min(bounds.max, pinnedMax + 6));
    }
  }, [blocksOffset, bounds, pinnedMax]);

  // Transform recent blocks to CardChainItem format
  const recentBlockItems = useMemo<CardChainItem[]>(() => {
    if (!recentBlocks.length) return [];

    return recentBlocks.map((block, index) => {
      const isNewest = index === recentBlocks.length - 1;
      const isActuallyLatest = isNewest && isAtLatest;
      const gasPercentage =
        block.gasUsed !== null && block.gasLimit ? Math.min(100, (block.gasUsed / block.gasLimit) * 100) : 0;

      return {
        id: block.blockNumber,
        label: 'Block',
        // A string, so the card doesn't locale-format the block number
        value: String(block.blockNumber),
        stats: [
          { label: 'Gas', value: block.gasUsed !== null ? formatCompact(block.gasUsed) : '-' },
          { label: 'Opcodes', value: formatCompact(block.opcodeCount) },
        ],
        fillPercentage: gasPercentage,
        isHighlighted: isActuallyLatest,
      };
    });
  }, [recentBlocks, isAtLatest]);

  // Handle quick search from URL
  useEffect(() => {
    if (search.block) {
      navigate({
        to: '/ethereum/execution/gas-profiler/block/$blockNumber',
        params: { blockNumber: String(search.block) },
      });
    }
  }, [search.block, navigate]);

  // Handle search submission - block numbers only
  const handleSearch = useCallback(() => {
    setSearchError(null);
    const cleanedInput = searchInput.replace(/,/g, '').trim();

    if (!isValidBlockNumber(cleanedInput) || cleanedInput.startsWith('0x')) {
      setSearchError('Enter a valid block number');
      return;
    }

    const blockNum = parseInt(cleanedInput, 10);
    if (bounds) {
      if (blockNum < bounds.min || blockNum > bounds.max) {
        setSearchError(`Block ${blockNum} is outside indexed range (${bounds.min} - ${bounds.max})`);
        return;
      }
    }
    navigate({
      to: '/ethereum/execution/gas-profiler/block/$blockNumber',
      params: { blockNumber: cleanedInput },
    });
  }, [searchInput, navigate, bounds]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  // Handle simulate navigation - block numbers only
  const handleSimulate = useCallback(() => {
    const cleanedInput = searchInput.trim().replace(/,/g, '');

    if (!cleanedInput) {
      navigate({ to: '/ethereum/execution/gas-profiler/simulate' });
      return;
    }

    if (isValidBlockNumber(cleanedInput) && !cleanedInput.startsWith('0x')) {
      const blockNum = parseInt(cleanedInput, 10);
      navigate({
        to: '/ethereum/execution/gas-profiler/simulate',
        search: { block: blockNum },
      });
      return;
    }

    setSearchError('Enter a valid block number');
  }, [searchInput, navigate]);

  // ============================================================================
  // CHART CONFIGS
  // ============================================================================

  const isOpcodeGasLoading = isDaily ? opcodeGasDailyQuery.isLoading : opcodeGasHourlyQuery.isLoading;

  if (boundsLoading) {
    return (
      <Container>
        <Header title="Gas Profiler" description={PAGE_DESCRIPTION} />
        <GasProfilerSkeleton />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header title="Gas Profiler" description={PAGE_DESCRIPTION} />
        <Alert variant="error" title="Error loading data" description={error.message} />
      </Container>
    );
  }

  if (!bounds) {
    return (
      <Container>
        <Header title="Gas Profiler" description={PAGE_DESCRIPTION} />
        <Alert variant="info" title="Gas profiling isn't available on this network" />
      </Container>
    );
  }

  return (
    <Container>
      <Header title="Gas Profiler" description={PAGE_DESCRIPTION} />

      {/* ============================================================================
          SECTION 1: Search & Explore
          Real-time block exploration and transaction/block search
          ============================================================================ */}

      {/* Search Bar */}
      <div className="mb-6">
        <div
          className={clsx(
            'flex items-stretch bg-surface',
            'outline-1 -outline-offset-1 transition-[outline-color]',
            searchError
              ? 'outline-danger/50 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-danger'
              : 'outline-border focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-primary'
          )}
        >
          <div className="pointer-events-none flex items-center pl-3.5">
            <MagnifyingGlassIcon className="size-5 text-muted" aria-hidden="true" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Block number"
            className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-base/6 text-foreground placeholder:text-muted focus:ring-0 focus:outline-hidden"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Search
          </button>
          <button
            type="button"
            onClick={handleSimulate}
            className="flex items-center gap-2 border-l border-border px-4 text-sm font-medium text-muted transition-colors hover:bg-primary/5 hover:text-foreground"
          >
            <BeakerIcon className="size-4" />
            Simulate
          </button>
        </div>
        <p
          className={clsx('mt-2 text-sm/6', searchError ? 'text-danger' : 'text-muted')}
          role={searchError ? 'alert' : 'status'}
          aria-live="polite"
        >
          {searchError ?? `Indexed range: ${bounds.min} - ${bounds.max}`}
        </p>
      </div>

      {/* Recent Blocks Chain Visualization */}
      <CardChain
        className="mb-8"
        items={recentBlockItems}
        isLoading={recentBlocksLoading}
        isFetching={recentBlocksFetching}
        skeletonCount={6}
        onLoadPrevious={handleLoadOlderBlocks}
        onLoadNext={handleLoadNewerBlocks}
        hasPreviousItems={hasOlderBlocks}
        hasNextItems={hasNewerBlocks}
        nextItemCount={newerBlockCount}
        renderItemWrapper={(item, index, children) => {
          const fromEnd = recentBlockItems.length - 1 - index;
          return (
            <Link
              key={item.id}
              to="/ethereum/execution/gas-profiler/block/$blockNumber"
              params={{ blockNumber: String(item.id) }}
              className={clsx(
                'group relative flex-1',
                fromEnd >= 4 && 'hidden xl:block',
                fromEnd === 3 && 'hidden lg:block',
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
        <h2 className="text-lg font-semibold text-foreground">Network Analytics</h2>
      </div>

      {/* Time Period Selector & Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-6">
        <SegmentedControl
          options={TIME_PERIOD_OPTIONS}
          value={timePeriod}
          onChange={value => navigate({ search: prev => ({ ...prev, t: value }), replace: true, resetScroll: false })}
          ariaLabel="Time window"
        />
      </div>

      <div className="mb-6">
        {/* Gas by Category */}
        <PopoutCard title="Gas by Category" anchorId="gas-by-category" modalSize="full">
          {({ inModal }) =>
            isOpcodeGasLoading ? (
              <LoadingContainer className="h-[420px] rounded-sm" />
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
                axisName="Gas"
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
          <LoadingContainer className="h-[320px] rounded-sm" />
        ) : opcodeStats.length > 0 ? (
          <OpcodeAnalysis opcodeStats={opcodeStats} maxOpcodes={10} showTable={false} />
        ) : (
          <div className="flex h-[320px] items-center justify-center rounded-sm border border-border text-muted">
            No opcode data available
          </div>
        )}
      </div>
    </Container>
  );
}
