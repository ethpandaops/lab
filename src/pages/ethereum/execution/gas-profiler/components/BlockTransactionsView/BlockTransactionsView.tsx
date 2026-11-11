import { type JSX, useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import type { SortingState } from '@tanstack/react-table';
import {
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  CircleStackIcon,
  CubeIcon,
  FireIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { TagInput } from '@/components/Forms/TagInput';
import { formatBytes } from '@/utils';
import type { TransactionSummary, TxContractFlow } from '../../hooks/useBlockTransactions';
import { useBlockTransactionOpcodes } from '../../hooks/useBlockTransactionOpcodes';
import type { GasProfilerBlockSearch } from '../../IndexPage.types';
import { getOpcodeCategory } from '../../utils/opcodeUtils';
import {
  BLOCK_TX_FILTER_KEYS,
  DEFAULT_BLOCK_TX_PAGE_SIZE,
  DEFAULT_BLOCK_TX_SORT,
  type BlockTxFilters,
  type BlockTxSortField,
  type CalledContract,
  filterBlockTransactions,
  formatRangeChip,
  getEvmGas,
  getTransactionType,
  needsOpcodeProfiles,
  parseOpcodeList,
  sortBlockTransactions,
} from '../../utils/blockTransactionFilters';
import { type ActiveFilterChip, FilterBar, FilterField, type FilterPreset, RangeFields } from '../FilterBar';

const ROUTE = '/ethereum/execution/gas-profiler/block/$blockNumber';

export interface BlockTransactionsViewProps {
  blockNumber: number;
  transactions: TransactionSummary[];
  /** Gas flowing from each tx into each contract, used to search by called contract */
  txContractFlows: TxContractFlow[];
  /** Block-wide opcode totals, used for opcode and category options */
  opcodeStats: { opcode: string; totalGas: number }[];
  receiptBytes: Map<string, number>;
  showReceiptColumn: boolean;
  totalBlockGas: number;
}

type FilterUpdate = Partial<Record<keyof GasProfilerBlockSearch, unknown>>;

const TYPE_ORDER = ['Transfer', 'CALL', 'CREATE', 'CREATE2'];

const STATUS_LABELS: Record<NonNullable<BlockTxFilters['status']>, string> = {
  succeeded: 'Succeeded',
  failed: 'Failed',
};

function formatGas(value: number): string {
  return value.toLocaleString();
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

function getTypeStyles(type: string): string {
  switch (type) {
    case 'Transfer':
      return 'bg-data-cyan-10 text-data-cyan';
    case 'CREATE':
      return 'bg-data-orange-10 text-data-orange';
    case 'CREATE2':
      return 'bg-warning-10 text-warning';
    default:
      return 'bg-data-blue-10 text-data-blue';
  }
}

const muted = <span className="text-muted">—</span>;

/**
 * Transactions tab of the block page: every transaction in the block with search,
 * presets, a filter dialog, sortable columns and pagination, all kept in the URL.
 */
export function BlockTransactionsView({
  blockNumber,
  transactions,
  txContractFlows,
  opcodeStats,
  receiptBytes,
  showReceiptColumn,
  totalBlockGas,
}: BlockTransactionsViewProps): JSX.Element {
  const search = useSearch({ from: ROUTE }) as GasProfilerBlockSearch;
  const navigate = useNavigate({ from: ROUTE });

  const filters: BlockTxFilters = useMemo(
    () => ({
      q: search.q,
      type: search.type,
      status: search.status,
      gasMin: search.gasMin,
      gasMax: search.gasMax,
      callsMin: search.callsMin,
      callsMax: search.callsMax,
      depthMin: search.depthMin,
      depthMax: search.depthMax,
      opcodes: search.opcodes,
      category: search.category,
    }),
    [search]
  );

  const sortField: BlockTxSortField = search.sort ?? DEFAULT_BLOCK_TX_SORT;
  const sortDir = search.sortDir ?? 'desc';
  const pageSize = search.pageSize ?? DEFAULT_BLOCK_TX_PAGE_SIZE;

  /** Write to the URL, returning to the first page unless a page is given */
  const update = useCallback(
    (patch: FilterUpdate, replace = false) => {
      navigate({
        search: prev => {
          const next: Record<string, unknown> = { ...prev, page: undefined, ...patch };
          for (const key of Object.keys(next)) {
            if (next[key] === '' || next[key] === undefined) delete next[key];
          }
          return next as GasProfilerBlockSearch;
        },
        hash: 'transactions',
        replace,
        resetScroll: false,
      });
    },
    [navigate]
  );

  const clearAll = useCallback(
    () => update(Object.fromEntries(BLOCK_TX_FILTER_KEYS.map(key => [key, undefined]))),
    [update]
  );

  const handleSearchChange = useCallback((q: string) => update({ q }, true), [update]);

  // Contracts each tx calls anywhere in its tree, so search finds txs that route through a contract
  const calledContracts = useMemo(() => {
    const map = new Map<string, CalledContract[]>();
    for (const flow of txContractFlows) {
      const list = map.get(flow.txHash) ?? [];
      list.push({ address: flow.contractAddress, name: flow.contractName });
      map.set(flow.txHash, list);
    }
    return map;
  }, [txContractFlows]);

  const blockOpcodes = useMemo(() => new Set(opcodeStats.map(op => op.opcode.toUpperCase())), [opcodeStats]);

  const categoryOptions = useMemo(() => {
    const gasByCategory = new Map<string, number>();
    for (const op of opcodeStats) {
      const category = getOpcodeCategory(op.opcode);
      gasByCategory.set(category, (gasByCategory.get(category) ?? 0) + op.totalGas);
    }
    return [...gasByCategory.entries()].sort((a, b) => b[1] - a[1]).map(([category]) => category);
  }, [opcodeStats]);

  const typeOptions = useMemo(() => {
    const present = new Set(transactions.map(getTransactionType));
    return [...present].sort((a, b) => {
      const ai = TYPE_ORDER.indexOf(a);
      const bi = TYPE_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [transactions]);

  // Opcode filters need per-tx opcode data; fetch it only once one is in use
  const { profiles: opcodeProfiles, isLoading: opcodesLoading } = useBlockTransactionOpcodes({
    blockNumber,
    enabled: needsOpcodeProfiles(filters),
  });

  const context = useMemo(
    () => ({ calledContracts, opcodeProfiles, receiptBytes }),
    [calledContracts, opcodeProfiles, receiptBytes]
  );

  const sorted = useMemo(
    () =>
      sortBlockTransactions(filterBlockTransactions(transactions, filters, context), sortField, sortDir, receiptBytes),
    [transactions, filters, context, sortField, sortDir, receiptBytes]
  );

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageIndex = Math.min(search.page ?? 0, pageCount - 1);
  const pageRows = useMemo(
    () => sorted.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [sorted, pageIndex, pageSize]
  );

  // ---------------------------------------------------------------------------
  // Presets
  // ---------------------------------------------------------------------------

  const presetDefs: { id: string; label: string; icon: JSX.Element; filters: BlockTxFilters }[] = [
    {
      id: 'failed',
      label: 'Failed',
      icon: <XCircleIcon className="size-4 text-danger" />,
      filters: { status: 'failed' },
    },
    {
      id: 'creations',
      label: 'Contract creations',
      icon: <CubeIcon className="size-4 text-data-orange" />,
      filters: { type: 'CREATE' },
    },
    {
      id: 'transfers',
      label: 'Transfers',
      icon: <ArrowsRightLeftIcon className="size-4 text-data-cyan" />,
      filters: { type: 'Transfer' },
    },
    {
      id: 'gas-1m',
      label: '1M+ gas',
      icon: <FireIcon className="size-4 text-warning" />,
      filters: { gasMin: 1_000_000 },
    },
    {
      id: 'storage-heavy',
      label: 'Storage-heavy',
      icon: <CircleStackIcon className="size-4 text-danger" />,
      filters: { category: 'Storage' },
    },
  ];

  const presets: FilterPreset[] = presetDefs.map(def => {
    const entries = Object.entries(def.filters) as [keyof BlockTxFilters, unknown][];
    const active = entries.every(([key, value]) => filters[key] === value);
    const needsProfiles = needsOpcodeProfiles(def.filters);
    const count =
      needsProfiles && !opcodeProfiles ? undefined : filterBlockTransactions(transactions, def.filters, context).length;
    return {
      id: def.id,
      label: def.label,
      icon: def.icon,
      count,
      active,
      disabled: !active && count === 0,
      onToggle: () => update(Object.fromEntries(entries.map(([key, value]) => [key, active ? undefined : value]))),
    };
  });

  // ---------------------------------------------------------------------------
  // Chips
  // ---------------------------------------------------------------------------

  const chips: ActiveFilterChip[] = [];
  const addChip = (id: string, label: string, value: string | undefined, clear: FilterUpdate): void => {
    if (value) chips.push({ id, label, value, onRemove: () => update(clear) });
  };
  addChip('type', 'Type', filters.type, { type: undefined });
  addChip('status', 'Status', filters.status && STATUS_LABELS[filters.status], { status: undefined });
  addChip('gas', 'Gas', formatRangeChip(filters.gasMin, filters.gasMax), { gasMin: undefined, gasMax: undefined });
  addChip('calls', 'Calls', formatRangeChip(filters.callsMin, filters.callsMax), {
    callsMin: undefined,
    callsMax: undefined,
  });
  addChip('depth', 'Max depth', formatRangeChip(filters.depthMin, filters.depthMax), {
    depthMin: undefined,
    depthMax: undefined,
  });
  addChip('opcodes', 'Opcodes', parseOpcodeList(filters.opcodes).join(', '), { opcodes: undefined });
  addChip('category', 'Most gas', filters.category, { category: undefined });

  // ---------------------------------------------------------------------------
  // Filter dialog draft
  // ---------------------------------------------------------------------------

  const [draft, setDraft] = useState<BlockTxFilters>({});
  const setDraftValue = <K extends keyof BlockTxFilters>(key: K, value: BlockTxFilters[K]): void =>
    setDraft(prev => ({ ...prev, [key]: value === '' ? undefined : value }));

  const dialogContent = (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FilterField label="Status">
          <SegmentedControl
            ariaLabel="Status"
            value={draft.status ?? ''}
            onChange={value => setDraftValue('status', (value || undefined) as BlockTxFilters['status'])}
            options={[
              { value: '', label: 'All' },
              { value: 'succeeded', label: STATUS_LABELS.succeeded },
              { value: 'failed', label: STATUS_LABELS.failed },
            ]}
          />
        </FilterField>
        <FilterField label="Type">
          <SegmentedControl
            ariaLabel="Type"
            value={draft.type ?? ''}
            onChange={value => setDraftValue('type', value || undefined)}
            options={[{ value: '', label: 'All' }, ...typeOptions.map(type => ({ value: type, label: type }))]}
          />
        </FilterField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FilterField label="Gas used">
          <RangeFields
            min={draft.gasMin}
            max={draft.gasMax}
            onMinChange={v => setDraftValue('gasMin', v)}
            onMaxChange={v => setDraftValue('gasMax', v)}
          />
        </FilterField>
        <FilterField label="Calls">
          <RangeFields
            min={draft.callsMin}
            max={draft.callsMax}
            onMinChange={v => setDraftValue('callsMin', v)}
            onMaxChange={v => setDraftValue('callsMax', v)}
          />
        </FilterField>
        <FilterField label="Max depth">
          <RangeFields
            min={draft.depthMin}
            max={draft.depthMax}
            onMinChange={v => setDraftValue('depthMin', v)}
            onMaxChange={v => setDraftValue('depthMax', v)}
          />
        </FilterField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FilterField label="Executes opcodes">
          <TagInput
            tags={parseOpcodeList(draft.opcodes)}
            onTagsChange={tags => setDraftValue('opcodes', parseOpcodeList(tags.join(',')).join(',') || undefined)}
            validate={tag => ({ valid: blockOpcodes.has(tag.toUpperCase()) })}
            placeholder="SSTORE, CREATE2"
            helperText="Transactions must execute all of them."
          />
        </FilterField>
        <FilterField label="Most gas spent on">
          <SelectMenu
            value={draft.category ?? ''}
            onChange={value => setDraftValue('category', value || undefined)}
            options={[
              { value: '', label: 'Any category' },
              ...categoryOptions.map(category => ({ value: category, label: category })),
            ]}
            rounded
          />
        </FilterField>
      </div>
    </>
  );

  // ---------------------------------------------------------------------------
  // Table
  // ---------------------------------------------------------------------------

  const columns = useMemo((): DataTableColumn<TransactionSummary>[] => {
    const numeric = (
      id: BlockTxSortField,
      header: string,
      value: (tx: TransactionSummary) => number | undefined,
      format: (v: number) => string = formatGas
    ): DataTableColumn<TransactionSummary> => ({
      id,
      header,
      accessorFn: value,
      cell: ({ row }) => {
        const v = value(row.original);
        return v === undefined ? muted : <span className="font-mono">{format(v)}</span>;
      },
      meta: { cellClassName: 'text-foreground' },
    });

    return [
      {
        id: 'index',
        header: '#',
        accessorFn: tx => tx.transactionIndex,
        cell: ({ row }) => <span className="font-mono">{row.original.transactionIndex}</span>,
      },
      {
        id: 'hash',
        header: 'Transaction',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <Link
            to="/ethereum/execution/gas-profiler/tx/$txHash"
            params={{ txHash: row.original.transactionHash }}
            search={{ block: blockNumber }}
            onClick={e => e.stopPropagation()}
            className="font-mono text-primary hover:underline"
            title={row.original.transactionHash}
          >
            {shortHash(row.original.transactionHash)}
          </Link>
        ),
      },
      {
        id: 'type',
        header: 'Type',
        enableSorting: false,
        cell: ({ row }) => {
          const type = getTransactionType(row.original);
          return (
            <span className={clsx('rounded-xs px-1.5 py-0.5 text-xs font-medium', getTypeStyles(type))}>{type}</span>
          );
        },
      },
      {
        id: 'target',
        header: 'Target',
        enableSorting: false,
        cell: ({ row }) => {
          const { targetAddress, targetName } = row.original;
          if (!targetAddress) return muted;
          return (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                update({ q: targetAddress });
              }}
              title={`Filter by ${targetName ?? targetAddress}`}
              className={clsx(
                'block max-w-48 truncate text-left transition-colors hover:text-primary hover:underline',
                targetName ? 'text-foreground' : 'font-mono text-muted'
              )}
            >
              {targetName ?? shortAddress(targetAddress)}
            </button>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.hasErrors ? (
            <span className="inline-flex items-center gap-1 text-danger">
              <XCircleIcon className="size-4" />
              {STATUS_LABELS.failed}
            </span>
          ) : (
            <span className="inline-flex items-center text-success" title={STATUS_LABELS.succeeded}>
              <CheckCircleIcon className="size-4" />
              <span className="sr-only">{STATUS_LABELS.succeeded}</span>
            </span>
          ),
      },
      numeric('gas', 'Gas', tx => tx.totalGasUsed),
      {
        id: 'share',
        header: 'Share',
        accessorFn: tx => tx.totalGasUsed,
        cell: ({ row }) => {
          const pct = totalBlockGas > 0 ? (row.original.totalGasUsed / totalBlockGas) * 100 : 0;
          return (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-10 overflow-hidden rounded-full bg-border">
                <div
                  className={clsx(
                    'h-full rounded-full',
                    pct > 30 ? 'bg-warning' : pct > 10 ? 'bg-primary' : 'bg-primary-60'
                  )}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <span className="w-12 text-right font-mono">{pct.toFixed(1)}%</span>
            </div>
          );
        },
      },
      numeric('intrinsic', 'Intrinsic', tx => tx.intrinsicGas ?? undefined),
      numeric('evm', 'EVM', getEvmGas),
      numeric('refund', 'Refund', tx => tx.gasRefund),
      ...(showReceiptColumn
        ? [numeric('receipt', 'Receipt', tx => receiptBytes.get(tx.transactionHash), formatBytes)]
        : []),
      numeric('calls', 'Calls', tx => tx.frameCount),
      numeric('depth', 'Max depth', tx => tx.maxDepth),
    ];
  }, [blockNumber, totalBlockGas, showReceiptColumn, receiptBytes, update]);

  const sorting: SortingState = [{ id: sortField, desc: sortDir === 'desc' }];

  const handleSortingChange = (next: SortingState): void => {
    const first = next[0];
    // Removing the sort returns to the default order
    if (!first || (first.id === DEFAULT_BLOCK_TX_SORT && first.desc)) {
      update({ sort: undefined, sortDir: undefined });
      return;
    }
    update({ sort: first.id, sortDir: first.desc ? 'desc' : 'asc' });
  };

  const handlePaginationChange = (nextPage: number, nextSize: number): void => {
    if (nextSize !== pageSize) {
      update({ pageSize: nextSize === DEFAULT_BLOCK_TX_PAGE_SIZE ? undefined : nextSize });
      return;
    }
    update({ page: nextPage || undefined });
  };

  return (
    <div>
      <FilterBar
        search={filters.q ?? ''}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Hash, address or contract"
        presets={presets}
        chips={chips}
        onClearAll={clearAll}
        shownCount={sorted.length}
        totalCount={transactions.length}
        noun="transactions"
        dialogTitle="Filter transactions"
        onDialogOpen={() => setDraft({ ...filters, q: undefined })}
        onDialogApply={() => update({ ...draft, q: filters.q })}
        onDialogReset={() => setDraft({})}
        dialogContent={dialogContent}
      />

      <DataTable
        data={pageRows}
        columns={columns}
        isLoading={needsOpcodeProfiles(filters) && opcodesLoading}
        getRowId={tx => tx.transactionHash}
        onRowClick={tx =>
          navigate({
            to: '/ethereum/execution/gas-profiler/tx/$txHash',
            params: { txHash: tx.transactionHash },
            search: { block: blockNumber },
          })
        }
        sorting={sorting}
        onSortingChange={handleSortingChange}
        manualSorting
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={pageCount}
        onPaginationChange={handlePaginationChange}
        manualPagination
        hideGlobalFilter
        emptyMessage="No transactions match these filters"
        paginationPosition="bottom"
      />
    </div>
  );
}
