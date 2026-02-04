import { type JSX, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { intTransactionOpcodeGasServiceList } from '@/api/sdk.gen';
import type { IntTransactionOpcodeGas } from '@/api/types.gen';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { fetchAllPages } from '@/utils/api-pagination';
import { CATEGORY_COLORS, getOpcodeCategory } from '../../utils';

/**
 * Format gas value with suffixes (K, M, B)
 */
function formatGas(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

type ViewMode = 'block' | 'transactions';

interface OpcodeStats {
  opcode: string;
  totalGas: number;
  count: number;
}

interface BlockOpcodeHeatmapProps {
  blockNumber: number;
  /** Block-level aggregated opcode stats (for default view) */
  opcodeStats: OpcodeStats[];
  /** Transaction data for display names */
  transactions?: Array<{
    transactionHash: string;
    transactionIndex: number;
    targetName?: string | null;
  }>;
  /** Default view mode (default: 'block') */
  defaultViewMode?: ViewMode;
}

/**
 * Calculate color intensity based on gas ratio
 */
function getColorIntensity(gas: number, maxGas: number): string {
  const ratio = maxGas > 0 ? gas / maxGas : 0;
  if (ratio === 0) return 'bg-indigo-50/50 dark:bg-indigo-950/30';
  if (ratio < 0.1) return 'bg-indigo-100 dark:bg-indigo-900/40';
  if (ratio < 0.25) return 'bg-indigo-200 dark:bg-indigo-800/50';
  if (ratio < 0.4) return 'bg-indigo-300 dark:bg-indigo-700/60';
  if (ratio < 0.55) return 'bg-indigo-400 dark:bg-indigo-600/70';
  if (ratio < 0.7) return 'bg-indigo-500 dark:bg-indigo-500';
  if (ratio < 0.85) return 'bg-indigo-600 dark:bg-indigo-400';
  return 'bg-indigo-700 dark:bg-indigo-300';
}

/**
 * Legend component
 */
function Legend({ opcodeCount }: { opcodeCount: number }): JSX.Element {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span>Low</span>
        <div className="flex gap-px">
          <div className="size-3 bg-indigo-100 dark:bg-indigo-900/40" />
          <div className="size-3 bg-indigo-200 dark:bg-indigo-800/50" />
          <div className="size-3 bg-indigo-300 dark:bg-indigo-700/60" />
          <div className="size-3 bg-indigo-400 dark:bg-indigo-600/70" />
          <div className="size-3 bg-indigo-500 dark:bg-indigo-500" />
          <div className="size-3 bg-indigo-600 dark:bg-indigo-400" />
          <div className="size-3 bg-indigo-700 dark:bg-indigo-300" />
        </div>
        <span>High</span>
      </div>
      <div className="text-xs text-muted">{opcodeCount} opcodes</div>
    </div>
  );
}

/**
 * Block-level single-row heatmap (aggregated opcodes)
 */
function BlockViewHeatmap({ opcodeStats }: { opcodeStats: OpcodeStats[] }): JSX.Element {
  const [hoveredOpcode, setHoveredOpcode] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Update tooltip position when hovered opcode changes
  useEffect(() => {
    if (hoveredOpcode && cellRefs.current.has(hoveredOpcode)) {
      const cell = cellRefs.current.get(hoveredOpcode)!;
      const rect = cell.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
  }, [hoveredOpcode]);

  const setCellRef = useCallback((opcode: string, el: HTMLDivElement | null) => {
    if (el) {
      cellRefs.current.set(opcode, el);
    } else {
      cellRefs.current.delete(opcode);
    }
  }, []);

  // Group opcodes by category
  const { categoryGroups, maxGas, totalGas } = useMemo(() => {
    const categoryMap = new Map<string, { opcode: string; gas: number; count: number }[]>();

    for (const stat of opcodeStats) {
      const category = getOpcodeCategory(stat.opcode);
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push({
        opcode: stat.opcode,
        gas: stat.totalGas,
        count: stat.count,
      });
    }

    const groups = [...categoryMap.entries()]
      .map(([category, opcodes]) => ({
        category,
        opcodes: opcodes.sort((a, b) => b.gas - a.gas),
        totalGas: opcodes.reduce((sum, o) => sum + o.gas, 0),
      }))
      .sort((a, b) => b.totalGas - a.totalGas);

    const maxGas = Math.max(...opcodeStats.map(s => s.totalGas));
    const totalGas = opcodeStats.reduce((sum, s) => sum + s.totalGas, 0);

    return { categoryGroups: groups, maxGas, totalGas };
  }, [opcodeStats]);

  if (categoryGroups.length === 0) {
    return <div className="flex h-20 items-center justify-center text-muted">No opcode data</div>;
  }

  return (
    <div className="w-full">
      <Legend opcodeCount={opcodeStats.length} />

      {/* Heatmap grid */}
      <div className="flex gap-4 overflow-x-auto">
        {categoryGroups.map(({ category, opcodes }) => (
          <div key={category} className="shrink-0">
            {/* Category header */}
            <div
              className="mb-2 truncate text-center text-xs font-medium"
              style={{ color: CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other }}
            >
              {category}
            </div>

            {/* Opcode cells */}
            <div className="flex gap-px">
              {opcodes.map(({ opcode, gas }) => {
                const isHovered = hoveredOpcode === opcode;

                return (
                  <div key={opcode} className="flex flex-col items-center">
                    {/* Cell */}
                    <div
                      ref={el => setCellRef(opcode, el)}
                      className={`size-6 cursor-pointer transition-all ${getColorIntensity(gas, maxGas)} ${isHovered ? 'z-10 ring-1 ring-indigo-400/60' : ''}`}
                      onMouseEnter={() => setHoveredOpcode(opcode)}
                      onMouseLeave={() => setHoveredOpcode(null)}
                    />

                    {/* Opcode label (vertical using writing-mode) */}
                    <div
                      className="mt-1 font-mono text-[10px] whitespace-nowrap text-muted"
                      style={{ writingMode: 'vertical-rl' }}
                    >
                      {opcode}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tooltip via portal */}
      {hoveredOpcode &&
        (() => {
          const stat = opcodeStats.find(s => s.opcode === hoveredOpcode);
          if (!stat) return null;
          const pct = totalGas > 0 ? ((stat.totalGas / totalGas) * 100).toFixed(1) : '0';
          const category = getOpcodeCategory(hoveredOpcode);

          return createPortal(
            <div
              className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full rounded-xs border border-border bg-background px-3 py-2 text-xs whitespace-nowrap shadow-lg"
              style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
            >
              <div className="font-mono font-semibold">{hoveredOpcode}</div>
              <div className="mt-1 text-muted" style={{ color: CATEGORY_COLORS[category] }}>
                {category}
              </div>
              <div className="mt-1">
                <strong>{formatGas(stat.totalGas)}</strong> gas ({pct}%)
              </div>
              <div className="text-muted">{stat.count.toLocaleString()} executions</div>
              {/* Arrow */}
              <div className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-r border-b border-border bg-background" />
            </div>,
            document.body
          );
        })()}
    </div>
  );
}

/**
 * Per-transaction heatmap view
 */
function TransactionsViewHeatmap({
  blockNumber,
  transactions,
  opcodeData,
  isLoading,
  inModal = false,
}: {
  blockNumber: number;
  transactions?: BlockOpcodeHeatmapProps['transactions'];
  opcodeData:
    | {
        int_transaction_opcode_gas?: Array<{
          transaction_hash?: string;
          opcode?: string;
          gas?: number;
          count?: number;
        }>;
      }
    | undefined;
  isLoading: boolean;
  inModal?: boolean;
}): JSX.Element {
  const [hoveredCell, setHoveredCell] = useState<{ txHash: string; opcode: string } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const headerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const setHeaderRef = useCallback((category: string, el: HTMLDivElement | null) => {
    if (el) {
      headerRefs.current.set(category, el);
    } else {
      headerRefs.current.delete(category);
    }
  }, []);

  // Update tooltip position when hovered cell changes
  useEffect(() => {
    if (hoveredCell) {
      const key = `${hoveredCell.txHash}-${hoveredCell.opcode}`;
      if (cellRefs.current.has(key)) {
        const cell = cellRefs.current.get(key)!;
        const rect = cell.getBoundingClientRect();
        setTooltipPosition({
          top: rect.top - 8,
          left: rect.left + rect.width / 2,
        });
      }
    }
  }, [hoveredCell]);

  const setCellRef = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) {
      cellRefs.current.set(key, el);
    } else {
      cellRefs.current.delete(key);
    }
  }, []);

  // Process data into heatmap structure
  const { txRows, categoryGroups, maxGas, opcodeGasMap } = useMemo(() => {
    if (!opcodeData?.int_transaction_opcode_gas?.length) {
      return {
        txRows: [],
        categoryGroups: [],
        maxGas: 0,
        opcodeGasMap: new Map<string, Map<string, { gas: number; count: number }>>(),
      };
    }

    const opcodeGasMap = new Map<string, Map<string, { gas: number; count: number }>>();
    const allOpcodes = new Map<string, { category: string; totalGas: number }>();
    let maxGas = 0;

    for (const row of opcodeData.int_transaction_opcode_gas) {
      const txHash = row.transaction_hash ?? '';
      const opcode = row.opcode ?? 'UNKNOWN';
      const gas = row.gas ?? 0;
      const count = row.count ?? 0;

      if (!opcodeGasMap.has(txHash)) {
        opcodeGasMap.set(txHash, new Map());
      }
      opcodeGasMap.get(txHash)!.set(opcode, { gas, count });

      if (gas > maxGas) maxGas = gas;

      const category = getOpcodeCategory(opcode);
      const existing = allOpcodes.get(opcode);
      allOpcodes.set(opcode, {
        category,
        totalGas: (existing?.totalGas ?? 0) + gas,
      });
    }

    const categoryMap = new Map<string, Array<{ opcode: string; totalGas: number }>>();
    for (const [opcode, data] of allOpcodes) {
      if (!categoryMap.has(data.category)) {
        categoryMap.set(data.category, []);
      }
      categoryMap.get(data.category)!.push({ opcode, totalGas: data.totalGas });
    }

    const categoryGroups = [...categoryMap.entries()]
      .map(([category, opcodes]) => ({
        category,
        opcodes: opcodes.sort((a, b) => b.totalGas - a.totalGas).map(o => o.opcode),
        totalGas: opcodes.reduce((sum, o) => sum + o.totalGas, 0),
      }))
      .sort((a, b) => b.totalGas - a.totalGas);

    // Include ALL transactions, not just those with opcode data
    // Transactions without opcodes (simple transfers) will show empty rows
    const txRows = (transactions ?? [])
      .map(tx => ({
        txHash: tx.transactionHash,
        txIndex: tx.transactionIndex,
        targetName: tx.targetName ?? null,
      }))
      .sort((a, b) => a.txIndex - b.txIndex);

    return { txRows, categoryGroups, maxGas, opcodeGasMap };
  }, [opcodeData, transactions]);

  // Sync header height for y-axis spacer alignment - use max height across all categories
  useEffect(() => {
    const elements = Array.from(headerRefs.current.values());
    if (elements.length === 0) return;

    const updateMaxHeight = (): void => {
      const maxHeight = Math.max(...elements.map(el => el.offsetHeight));
      setHeaderHeight(maxHeight);
    };

    const observer = new ResizeObserver(() => updateMaxHeight());
    elements.forEach(el => observer.observe(el));
    updateMaxHeight();

    return () => observer.disconnect();
  }, [categoryGroups]);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted">Loading per-transaction opcode data...</div>
    );
  }

  if (txRows.length === 0 || categoryGroups.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted">No per-transaction opcode data available</div>
    );
  }

  const allOpcodesOrdered = categoryGroups.flatMap(g => g.opcodes);

  return (
    <div className="w-full">
      <Legend opcodeCount={allOpcodesOrdered.length} />

      {/* Heatmap grid with sticky row headers and max height */}
      <div className={`overflow-x-auto overflow-y-auto ${inModal ? 'flex-1' : 'max-h-96'}`}>
        <div className="inline-flex min-w-full">
          {/* Row headers (transaction labels) - sticky */}
          <div className="sticky left-0 z-10 shrink-0 pr-2">
            {/* Spacer matching opcode labels - dynamic height synced via ref */}
            <div className="border-b border-border" style={{ height: headerHeight > 0 ? headerHeight : undefined }} />
            {/* Transaction row headers */}
            <div className="flex flex-col gap-px">
              {txRows.map(({ txHash, txIndex, targetName }) => (
                <div key={txHash} className="flex h-6 items-center">
                  <Link
                    to="/ethereum/execution/gas-profiler/tx/$txHash"
                    params={{ txHash }}
                    search={{ block: blockNumber }}
                    className="truncate text-[10px] text-muted hover:text-foreground"
                    style={{ maxWidth: '80px' }}
                    title={targetName || txHash}
                  >
                    {txIndex >= 0 ? `#${txIndex}` : txHash.slice(0, 8)}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Main heatmap area */}
          <div className="flex gap-2">
            {categoryGroups.map(({ category, opcodes }) => (
              <div key={category} className="shrink-0">
                {/* Opcode column headers (vertical) */}
                <div
                  ref={el => setHeaderRef(category, el)}
                  className="flex items-end gap-px border-b border-border pb-2"
                  style={headerHeight > 0 ? { minHeight: headerHeight } : undefined}
                >
                  {opcodes.map(opcode => (
                    <div key={opcode} className="flex w-6 justify-center">
                      <span
                        className="font-mono text-[10px] whitespace-nowrap text-muted"
                        style={{ writingMode: 'vertical-rl' }}
                      >
                        {opcode}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Data cells */}
                <div className="flex flex-col gap-px">
                  {txRows.map(({ txHash }) => {
                    const txOpcodes = opcodeGasMap.get(txHash);
                    return (
                      <div key={txHash} className="flex gap-px">
                        {opcodes.map(opcode => {
                          const data = txOpcodes?.get(opcode);
                          const gas = data?.gas ?? 0;
                          const cellKey = `${txHash}-${opcode}`;
                          const isHovered = hoveredCell?.txHash === txHash && hoveredCell?.opcode === opcode;

                          return (
                            <div
                              key={opcode}
                              ref={el => setCellRef(cellKey, el)}
                              className={`size-6 cursor-pointer transition-all ${getColorIntensity(gas, maxGas)} ${isHovered ? 'z-10 ring-1 ring-indigo-400/60' : ''}`}
                              onMouseEnter={() => gas > 0 && setHoveredCell({ txHash, opcode })}
                              onMouseLeave={() => setHoveredCell(null)}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip via portal */}
      {hoveredCell &&
        (() => {
          const txOpcodes = opcodeGasMap.get(hoveredCell.txHash);
          const data = txOpcodes?.get(hoveredCell.opcode);
          if (!data) return null;

          const txInfo = txRows.find(t => t.txHash === hoveredCell.txHash);
          const category = getOpcodeCategory(hoveredCell.opcode);

          return createPortal(
            <div
              className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full rounded-xs border border-border bg-background px-3 py-2 text-xs whitespace-nowrap shadow-lg"
              style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
            >
              <div className="font-mono font-semibold">{hoveredCell.opcode}</div>
              <div className="mt-1 text-muted" style={{ color: CATEGORY_COLORS[category] }}>
                {category}
              </div>
              <div className="mt-1">
                <strong>{formatGas(data.gas)}</strong> gas
              </div>
              <div className="text-muted">{data.count.toLocaleString()} executions</div>
              <div className="mt-1 border-t border-border pt-1 text-muted">
                TX #{txInfo?.txIndex !== undefined ? txInfo.txIndex : '?'}
                {txInfo?.targetName && <span> • {txInfo.targetName}</span>}
              </div>
              {/* Arrow */}
              <div className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-r border-b border-border bg-background" />
            </div>,
            document.body
          );
        })()}
    </div>
  );
}

/**
 * Block-level opcode heatmap with toggle between block aggregate and per-transaction views
 */
export function BlockOpcodeHeatmap({
  blockNumber,
  opcodeStats,
  transactions,
  defaultViewMode = 'block',
}: BlockOpcodeHeatmapProps): JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);

  // Only fetch per-transaction data when in transactions view
  // Uses fetchAllPages to handle pagination for large blocks
  const { data: opcodeData, isLoading } = useQuery({
    queryKey: ['int-transaction-opcode-gas-all', blockNumber],
    queryFn: async ({ signal }) => {
      const allData = await fetchAllPages<IntTransactionOpcodeGas>(
        intTransactionOpcodeGasServiceList,
        {
          query: {
            block_number_eq: blockNumber,
            page_size: 10000,
          },
        },
        'int_transaction_opcode_gas',
        signal
      );
      // Wrap in expected shape for TransactionsViewHeatmap
      return { int_transaction_opcode_gas: allData };
    },
    enabled: viewMode === 'transactions' && !isNaN(blockNumber),
  });

  if (opcodeStats.length === 0) {
    return (
      <PopoutCard title="Opcode Heatmap" subtitle="Gas consumption by category and opcode">
        {() => <div className="flex h-20 items-center justify-center text-muted">No opcode data available</div>}
      </PopoutCard>
    );
  }

  const subtitle =
    viewMode === 'block'
      ? 'Gas consumption by category and opcode'
      : `${transactions?.length ?? 0} transactions × opcodes`;

  // View mode toggle component (rendered in header)
  const viewModeToggle = (
    <div className="inline-flex overflow-hidden rounded-xs border border-border">
      <button
        onClick={() => setViewMode('block')}
        className={`px-3 py-1 text-xs font-medium transition-colors ${
          viewMode === 'block'
            ? 'bg-primary text-white'
            : 'bg-surface text-muted hover:bg-surface/80 hover:text-foreground'
        }`}
      >
        Block
      </button>
      <button
        onClick={() => setViewMode('transactions')}
        className={`border-l border-border px-3 py-1 text-xs font-medium transition-colors ${
          viewMode === 'transactions'
            ? 'bg-primary text-white'
            : 'bg-surface text-muted hover:bg-surface/80 hover:text-foreground'
        }`}
      >
        By Transaction
      </button>
    </div>
  );

  return (
    <PopoutCard
      title="Opcode Heatmap"
      subtitle={subtitle}
      allowContentOverflow
      modalSize="fullscreen"
      headerActions={viewModeToggle}
    >
      {({ inModal }) => (
        <div className={inModal ? 'flex h-full w-full flex-col' : 'w-full'}>
          {viewMode === 'block' ? (
            <BlockViewHeatmap opcodeStats={opcodeStats} />
          ) : (
            <TransactionsViewHeatmap
              blockNumber={blockNumber}
              transactions={transactions}
              opcodeData={opcodeData}
              isLoading={isLoading}
              inModal={inModal}
            />
          )}
        </div>
      )}
    </PopoutCard>
  );
}
