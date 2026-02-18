import { type JSX, useMemo, useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ChevronRightIcon, ChevronDownIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { CallTraceViewProps, EnrichedCallFrame, CallFrameExtendedData } from './CallTraceView.types';
import { ContractStorageButton } from '../ContractStorageButton';
import type { CallFrameOpcodeStats } from '../../hooks/useTransactionGasData';
import { useCallFrameOpcodes, type OpcodeBreakdown } from '../../hooks/useCallFrameOpcodes';
import { getOpcodeCategory, CATEGORY_COLORS } from '../../utils/opcodeUtils';
import { isPrecompileAddress } from '../../utils/precompileNames';
import type { IntTransactionCallFrame } from '@/api/types.gen';

/**
 * Format gas value compactly
 */
function formatGasCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

/**
 * Get call type badge styling
 */
function getCallTypeStyles(callType: string): { bg: string; text: string } {
  switch (callType) {
    case 'CREATE':
      return { bg: 'bg-orange-500/20', text: 'text-orange-400' };
    case 'CREATE2':
      return { bg: 'bg-amber-500/20', text: 'text-amber-400' };
    case 'DELEGATECALL':
      return { bg: 'bg-purple-500/20', text: 'text-purple-400' };
    case 'STATICCALL':
      return { bg: 'bg-cyan-500/20', text: 'text-cyan-400' };
    case 'CALLCODE':
      return { bg: 'bg-pink-500/20', text: 'text-pink-400' };
    case 'CALL':
    default:
      return { bg: 'bg-blue-500/20', text: 'text-blue-400' };
  }
}

/**
 * Build tree structure from flat internal tx frames
 *
 * Handles both full transaction traces (root has parent_call_frame_id = null)
 * and subtrees (root's parent doesn't exist in the passed frames array).
 */
function buildCallTree(
  frames: IntTransactionCallFrame[],
  contractOwners: Record<string, { contract_name?: string | null }>,
  functionSignatures: Record<string, { name?: string | null }>
): EnrichedCallFrame | null {
  if (!frames.length) return null;

  // Create lookup map and set of frame IDs
  const frameMap = new Map<number, EnrichedCallFrame>();
  const frameIds = new Set<number>();

  // First pass: create enriched frames and collect IDs
  for (const frame of frames) {
    const frameId = frame.call_frame_id ?? 0;
    frameIds.add(frameId);

    const contractName = contractOwners[frame.target_address?.toLowerCase() ?? '']?.contract_name ?? null;
    const funcSelector = frame.function_selector?.toLowerCase();
    const funcSig = funcSelector ? functionSignatures[funcSelector] : undefined;
    const functionName = funcSig?.name ? funcSig.name.split('(')[0] : null;

    frameMap.set(frameId, {
      frame,
      contractName,
      functionName,
      children: [],
    });
  }

  // Second pass: build tree
  // Root is the frame whose parent_call_frame_id is null OR doesn't exist in our frame set
  let root: EnrichedCallFrame | null = null;

  for (const frame of frames) {
    const enriched = frameMap.get(frame.call_frame_id ?? 0);
    if (!enriched) continue;

    const parentId = frame.parent_call_frame_id;
    const hasParentInSet = parentId !== null && parentId !== undefined && frameIds.has(parentId);

    if (!hasParentInSet) {
      // This is the root - either parent is null or parent isn't in our frame set (subtree case)
      root = enriched;
    } else {
      const parent = frameMap.get(parentId);
      if (parent) {
        parent.children.push(enriched);
      }
    }
  }

  return root;
}

/**
 * Get opcode color from category (returns hex color)
 */
function getOpcodeColorHex(opcode: string): string {
  const category = getOpcodeCategory(opcode);
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other ?? '#9ca3af';
}

/**
 * Inline opcode breakdown component - full width distinct panel
 */
function OpcodeBreakdownView({
  opcodes,
  isLoading,
  selfGas,
  cumulativeGas,
  txHash,
  callId,
  blockNumber,
  onClose,
}: {
  opcodes: OpcodeBreakdown[] | null;
  isLoading: boolean;
  selfGas: number;
  cumulativeGas: number;
  txHash: string;
  callId: number;
  blockNumber?: number | null;
  onClose: () => void;
}): JSX.Element {
  const navigate = useNavigate();
  if (isLoading) {
    return (
      <div className="border-y border-primary/30 bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="size-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <span className="text-xs text-muted">Loading opcode breakdown...</span>
        </div>
      </div>
    );
  }

  if (!opcodes || opcodes.length === 0) {
    return (
      <div className="border-y border-primary/30 bg-primary/5 px-4 py-3">
        <span className="text-xs text-muted">No opcode data available</span>
      </div>
    );
  }

  // Show top opcodes by gas
  const topOpcodes = opcodes.slice(0, 10);
  const otherCount = opcodes.length - topOpcodes.length;
  const otherGas = opcodes.slice(10).reduce((sum, o) => sum + o.gas, 0);
  const maxGas = topOpcodes[0]?.gas ?? 1;

  return (
    <div className="border-y border-primary/30 bg-primary/5 px-4 py-3">
      {/* Header with totals */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-primary">Opcode Gas Breakdown</span>
        <span className="text-xs text-muted">
          Self: {selfGas.toLocaleString()} | Cumulative: {cumulativeGas.toLocaleString()} ({opcodes.length} unique
          opcodes)
        </span>
      </div>

      {/* Horizontal bar chart */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        {topOpcodes.map(op => (
          <div key={op.opcode} className="flex items-center gap-2">
            <span className="w-24 shrink-0 font-mono text-xs text-foreground">{op.opcode}</span>
            <div className="relative h-4 flex-1 overflow-hidden rounded-xs bg-background/50">
              <div
                className="h-full transition-all"
                style={{ width: `${(op.gas / maxGas) * 100}%`, backgroundColor: getOpcodeColorHex(op.opcode) }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs text-muted">{op.gas.toLocaleString()}</span>
            <span className="w-12 shrink-0 text-right text-xs text-muted/60">{op.percentage.toFixed(1)}%</span>
            <span className="w-10 shrink-0 text-right text-xs text-muted/40">×{op.count}</span>
          </div>
        ))}
      </div>

      {/* Others summary + View more */}
      <div className="mt-2 flex items-center justify-between">
        {otherCount > 0 ? (
          <span className="text-xs text-muted">
            +{otherCount} more opcodes ({otherGas.toLocaleString()} gas)
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={() => {
            onClose();
            navigate({
              to: '/ethereum/execution/gas-profiler/tx/$txHash/call/$callId',
              params: { txHash, callId: String(callId) },
              search: blockNumber ? { block: blockNumber } : {},
              hash: 'opcodes',
            });
          }}
          className="text-xs text-primary hover:underline"
        >
          View more →
        </button>
      </div>
    </div>
  );
}

/**
 * Highlight state for hover-to-highlight feature
 */
interface HighlightState {
  /** Currently hovered contract address (lowercase) */
  address: string | null;
  /** Currently hovered function selector (lowercase) */
  functionSelector: string | null;
}

/**
 * Single trace row component
 */
function TraceRow({
  node,
  depth,
  isLast,
  ancestors,
  totalGas,
  txHash,
  blockNumber,
  expandedNodes,
  onToggleExpand,
  allOpcodeStats,
  extendedData,
  highlight,
  onHighlightChange,
  opcodeExpandedNodes,
  onToggleOpcodeExpand,
  onCloseOpcodeBreakdown,
}: {
  node: EnrichedCallFrame;
  depth: number;
  isLast: boolean;
  ancestors: boolean[]; // true if ancestor at that depth is last child
  totalGas: number;
  txHash: string;
  blockNumber?: number | null;
  expandedNodes: Set<number>;
  onToggleExpand: (id: number) => void;
  allOpcodeStats?: Map<number, CallFrameOpcodeStats>;
  extendedData?: CallFrameExtendedData;
  highlight: HighlightState;
  onHighlightChange: (state: HighlightState) => void;
  opcodeExpandedNodes: Set<number>;
  onToggleOpcodeExpand: (id: number) => void;
  onCloseOpcodeBreakdown: () => void;
}): JSX.Element {
  const navigate = useNavigate();
  const frame = node.frame;
  const callId = frame.call_frame_id ?? 0;
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodes.has(callId);
  const hasError = (frame.error_count ?? 0) > 0;
  const isPrecompile = isPrecompileAddress(frame.target_address);

  // Look up opcode stats for this specific call frame
  const opcodeStats = allOpcodeStats?.get(callId);

  // Highlight state for this row
  const targetAddress = frame.target_address?.toLowerCase() ?? null;
  const funcSelector = frame.function_selector?.toLowerCase() ?? null;
  const isAddressHighlighted = highlight.address !== null && targetAddress === highlight.address;
  const isFunctionHighlighted = highlight.functionSelector !== null && funcSelector === highlight.functionSelector;

  // Hover handlers for contract name
  const handleContractMouseEnter = useCallback(() => {
    if (targetAddress) {
      onHighlightChange({ address: targetAddress, functionSelector: null });
    }
  }, [targetAddress, onHighlightChange]);

  // Hover handlers for function name
  const handleFunctionMouseEnter = useCallback(() => {
    if (funcSelector) {
      onHighlightChange({ address: null, functionSelector: funcSelector });
    }
  }, [funcSelector, onHighlightChange]);

  const handleMouseLeave = useCallback(() => {
    onHighlightChange({ address: null, functionSelector: null });
  }, [onHighlightChange]);

  // Detect contract creation - must be before hooks that use it
  // 1. New data: call_type = 'CREATE' (from transformation)
  // 2. Old data fallback: root frame (depth 0) with no target_address and no call_type
  const isContractCreation =
    frame.call_type === 'CREATE' || (!frame.target_address && !frame.call_type && frame.depth === 0);

  const callTypeStyles = getCallTypeStyles(frame.call_type ?? 'CALL');
  // Show cumulative gas (self + children) like Phalcon does
  const cumulativeGas = frame.gas_cumulative ?? 0;

  // Opcode expansion state
  const isOpcodeExpanded = opcodeExpandedNodes.has(callId);
  const { data: opcodeData, isLoading: opcodeLoading } = useCallFrameOpcodes({
    blockNumber,
    transactionHash: txHash,
    callFrameId: callId,
    enabled: isOpcodeExpanded && (!!frame.call_type || isContractCreation), // Fetch for calls and contract creation
  });

  const handleOpcodeToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleOpcodeExpand(callId);
    },
    [onToggleOpcodeExpand, callId]
  );

  // Build the tree line prefix
  const treePrefix = useMemo(() => {
    const parts: string[] = [];
    for (let i = 0; i < depth; i++) {
      if (i === depth - 1) {
        // Current level connector
        parts.push(isLast ? '└─' : '├─');
      } else {
        // Ancestor continuation lines
        parts.push(ancestors[i] ? '   ' : '│  ');
      }
    }
    return parts.join('');
  }, [depth, isLast, ancestors]);

  const handleClick = useCallback(() => {
    // Navigate for regular calls or contract creation
    if (frame.call_type || isContractCreation) {
      // Close any open opcode breakdown before navigating
      onCloseOpcodeBreakdown();
      // Navigate to call page
      navigate({
        to: '/ethereum/execution/gas-profiler/tx/$txHash/call/$callId',
        params: { txHash, callId: String(callId) },
        search: blockNumber ? { block: blockNumber } : {},
      });
    }
  }, [navigate, txHash, callId, blockNumber, frame.call_type, isContractCreation, onCloseOpcodeBreakdown]);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleExpand(callId);
    },
    [onToggleExpand, callId]
  );

  // Display label — for precompiles, prefer the precompile name (contractName) over functionName
  // because the "function selector" is just the first 4 bytes of calldata, not a real selector.
  const displayLabel = isPrecompile
    ? node.contractName ||
      node.functionName ||
      (frame.target_address ? `${frame.target_address.slice(0, 10)}...${frame.target_address.slice(-8)}` : 'Unknown')
    : node.functionName ||
      node.contractName ||
      (frame.target_address
        ? `${frame.target_address.slice(0, 10)}...${frame.target_address.slice(-8)}`
        : isContractCreation
          ? 'Contract Creation'
          : 'Unknown');

  return (
    <>
      <div
        className={clsx(
          'group flex items-center gap-2 border-b border-border/30 px-3 py-1.5 font-mono text-sm',
          (frame.call_type || isContractCreation) && 'cursor-pointer hover:bg-surface/50',
          hasError && 'bg-danger/5'
        )}
        onClick={handleClick}
      >
        {/* Tree lines */}
        <span className="whitespace-pre text-border select-none">{treePrefix}</span>

        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="flex size-4 shrink-0 items-center justify-center rounded-xs text-muted hover:text-foreground"
          >
            {isExpanded ? <ChevronDownIcon className="size-3" /> : <ChevronRightIcon className="size-3" />}
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}

        {/* Depth indicator */}
        <span className="w-4 shrink-0 text-xs text-muted">{depth}</span>

        {/* Call type badge */}
        {(frame.call_type || isContractCreation) && (
          <span
            className={clsx(
              'shrink-0 rounded-xs px-1.5 py-0.5 text-xs font-medium',
              isContractCreation ? 'bg-orange-500/20 text-orange-400' : callTypeStyles.bg,
              isContractCreation ? '' : callTypeStyles.text
            )}
          >
            {isContractCreation ? 'CREATE' : frame.call_type}
          </span>
        )}

        {/* Precompile badge */}
        {isPrecompile && (
          <span className="shrink-0 rounded-xs bg-rose-500/20 px-1.5 py-0.5 text-xs font-medium text-rose-400">
            precompile
          </span>
        )}

        {/* Contract/Function name */}
        <span className={clsx('truncate', hasError ? 'text-danger' : 'text-foreground', 'group-hover:text-primary')}>
          {node.contractName && !isPrecompile && (
            <span
              className={clsx(
                'cursor-pointer transition-colors',
                isAddressHighlighted
                  ? 'rounded-xs bg-amber-200 px-0.5 text-amber-800 dark:bg-amber-500/30 dark:text-amber-300'
                  : 'text-muted hover:text-foreground'
              )}
              onMouseEnter={handleContractMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {node.contractName}
            </span>
          )}
          {node.contractName && !isPrecompile && <span className="text-muted">.</span>}
          <span
            className={clsx(
              'cursor-pointer font-medium transition-colors',
              isFunctionHighlighted &&
                'rounded-xs bg-emerald-200 px-0.5 text-emerald-800 dark:bg-lime-500/30 dark:text-lime-300'
            )}
            onMouseEnter={node.functionName ? handleFunctionMouseEnter : undefined}
            onMouseLeave={node.functionName ? handleMouseLeave : undefined}
          >
            {isPrecompile ? displayLabel : node.functionName || (node.contractName ? '(fallback)' : displayLabel)}
          </span>
        </span>

        {/* Address (if no name) */}
        {!node.contractName && frame.target_address && (
          <span className="shrink-0 text-xs text-muted">
            {frame.target_address.slice(0, 10)}...{frame.target_address.slice(-8)}
          </span>
        )}

        {/* Opcode badges - storage writes (SSTORE) */}
        {opcodeStats && opcodeStats.sstoreCount > 0 && (
          <button onClick={handleOpcodeToggle} className="group/badge relative shrink-0">
            <span className="cursor-pointer rounded-xs bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400 transition-colors hover:bg-amber-500/30">
              {opcodeStats.sstoreCount} write{opcodeStats.sstoreCount > 1 ? 's' : ''}
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden -translate-x-1/2 rounded-sm border border-border bg-background px-2 py-1 text-xs whitespace-nowrap text-muted shadow-lg group-hover/badge:block">
              {opcodeStats.sstoreCount} storage write{opcodeStats.sstoreCount > 1 ? 's' : ''} (
              {formatGasCompact(opcodeStats.sstoreGas)} gas)
            </span>
          </button>
        )}

        {/* Opcode badges - storage reads (SLOAD) */}
        {opcodeStats && opcodeStats.sloadCount > 0 && (
          <button onClick={handleOpcodeToggle} className="group/badge relative shrink-0">
            <span className="cursor-pointer rounded-xs bg-sky-500/20 px-1.5 py-0.5 text-xs text-sky-400 transition-colors hover:bg-sky-500/30">
              {opcodeStats.sloadCount} read{opcodeStats.sloadCount > 1 ? 's' : ''}
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden -translate-x-1/2 rounded-sm border border-border bg-background px-2 py-1 text-xs whitespace-nowrap text-muted shadow-lg group-hover/badge:block">
              {opcodeStats.sloadCount} storage read{opcodeStats.sloadCount > 1 ? 's' : ''} (
              {formatGasCompact(opcodeStats.sloadGas)} gas)
            </span>
          </button>
        )}

        {/* Opcode badges - events/logs (LOG0-LOG4) */}
        {opcodeStats && opcodeStats.logCount > 0 && (
          <button onClick={handleOpcodeToggle} className="group/badge relative shrink-0">
            <span className="cursor-pointer rounded-xs bg-violet-500/20 px-1.5 py-0.5 text-xs text-violet-400 transition-colors hover:bg-violet-500/30">
              {opcodeStats.logCount} event{opcodeStats.logCount > 1 ? 's' : ''}
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden -translate-x-1/2 rounded-sm border border-border bg-background px-2 py-1 text-xs whitespace-nowrap text-muted shadow-lg group-hover/badge:block">
              {opcodeStats.logCount} event{opcodeStats.logCount > 1 ? 's' : ''} emitted (
              {formatGasCompact(opcodeStats.logGas)} gas)
            </span>
          </button>
        )}

        {/* Opcode badges - contract creation (CREATE/CREATE2) */}
        {opcodeStats && opcodeStats.createCount > 0 && (
          <button onClick={handleOpcodeToggle} className="group/badge relative shrink-0">
            <span className="cursor-pointer rounded-xs bg-orange-500/20 px-1.5 py-0.5 text-xs text-orange-400 transition-colors hover:bg-orange-500/30">
              {opcodeStats.createCount} deploy{opcodeStats.createCount > 1 ? 's' : ''}
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden -translate-x-1/2 rounded-sm border border-border bg-background px-2 py-1 text-xs whitespace-nowrap text-muted shadow-lg group-hover/badge:block">
              {opcodeStats.createCount} contract deployment{opcodeStats.createCount > 1 ? 's' : ''}
            </span>
          </button>
        )}

        {/* Opcode badges - self destruct */}
        {opcodeStats && opcodeStats.selfdestructCount > 0 && (
          <button onClick={handleOpcodeToggle} className="group/badge relative shrink-0">
            <span className="cursor-pointer rounded-xs bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400 transition-colors hover:bg-red-500/30">
              selfdestruct
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden -translate-x-1/2 rounded-sm border border-border bg-background px-2 py-1 text-xs whitespace-nowrap text-muted shadow-lg group-hover/badge:block">
              Contract self-destructs in this call
            </span>
          </button>
        )}

        {/* Future: Calldata badge - show when extendedData available */}
        {extendedData?.inputData && (
          <span className="shrink-0 rounded-xs bg-surface px-1.5 py-0.5 text-xs text-muted">calldata</span>
        )}

        {/* Future: Value badge */}
        {extendedData?.value && extendedData.value > 0n && (
          <span className="shrink-0 rounded-xs bg-green-500/20 px-1.5 py-0.5 text-xs text-green-400">
            Ξ{(Number(extendedData.value) / 1e18).toFixed(4)}
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Storage link - hide for precompiles (no storage) */}
        {frame.target_address && !isPrecompile && <ContractStorageButton address={frame.target_address} size="sm" />}

        {/* Opcode breakdown toggle - hide for precompiles (no opcodes) */}
        {frame.call_type && !isPrecompile && (
          <button
            onClick={handleOpcodeToggle}
            className={clsx(
              'group/opcode relative flex size-6 shrink-0 items-center justify-center rounded-sm border transition-colors',
              isOpcodeExpanded
                ? 'border-primary/50 bg-primary/20 text-primary'
                : 'border-border bg-surface/50 text-muted hover:border-primary/30 hover:bg-surface hover:text-foreground'
            )}
          >
            <ChartBarIcon className="size-4" />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden -translate-x-1/2 rounded-sm border border-border bg-background px-2 py-1 text-xs whitespace-nowrap text-muted shadow-lg group-hover/opcode:block">
              {isOpcodeExpanded ? 'Hide opcode breakdown' : 'Show opcode breakdown'}
            </span>
          </button>
        )}

        {/* Gas info - cumulative (self + children) */}
        <span className="w-20 shrink-0 text-right text-xs text-muted">{cumulativeGas.toLocaleString()}</span>

        {/* Error indicator */}
        {hasError && <span className="size-2 shrink-0 rounded-full bg-danger" title="Error" />}
      </div>

      {/* Inline opcode breakdown - full width panel */}
      {isOpcodeExpanded && (
        <OpcodeBreakdownView
          opcodes={opcodeData}
          isLoading={opcodeLoading}
          selfGas={frame.gas ?? 0}
          cumulativeGas={cumulativeGas}
          txHash={txHash}
          callId={callId}
          blockNumber={blockNumber}
          onClose={onCloseOpcodeBreakdown}
        />
      )}

      {/* Children */}
      {isExpanded &&
        node.children.map((child, index) => (
          <TraceRow
            key={child.frame.call_frame_id}
            node={child}
            depth={depth + 1}
            isLast={index === node.children.length - 1}
            ancestors={[...ancestors, isLast]}
            totalGas={totalGas}
            txHash={txHash}
            blockNumber={blockNumber}
            expandedNodes={expandedNodes}
            onToggleExpand={onToggleExpand}
            allOpcodeStats={allOpcodeStats}
            extendedData={extendedData}
            highlight={highlight}
            onHighlightChange={onHighlightChange}
            opcodeExpandedNodes={opcodeExpandedNodes}
            onToggleOpcodeExpand={onToggleOpcodeExpand}
            onCloseOpcodeBreakdown={onCloseOpcodeBreakdown}
          />
        ))}
    </>
  );
}

/**
 * CallTraceView - Hierarchical tree view of internal transaction trace
 *
 * Shows the execution flow with visual tree structure.
 * Extensible to show calldata, return values, etc. when data is available.
 */
export function CallTraceView({
  callFrames,
  contractOwners,
  functionSignatures,
  txHash,
  blockNumber,
  totalGas,
  opcodeStats,
  extendedData,
}: CallTraceViewProps): JSX.Element {
  // Build tree structure
  const rootNode = useMemo(
    () => buildCallTree(callFrames, contractOwners, functionSignatures),
    [callFrames, contractOwners, functionSignatures]
  );

  // Track highlight state for hover-to-highlight feature
  const [highlight, setHighlight] = useState<HighlightState>({ address: null, functionSelector: null });

  const handleHighlightChange = useCallback((state: HighlightState) => {
    setHighlight(state);
  }, []);

  // Track opcode breakdown expanded node (only one at a time)
  const [opcodeExpandedId, setOpcodeExpandedId] = useState<number | null>(null);

  // Convert to Set for prop compatibility (single item or empty)
  const opcodeExpandedNodes = useMemo(
    () => (opcodeExpandedId !== null ? new Set([opcodeExpandedId]) : new Set<number>()),
    [opcodeExpandedId]
  );

  const handleToggleOpcodeExpand = useCallback((id: number) => {
    setOpcodeExpandedId(prev => (prev === id ? null : id));
  }, []);

  // Close any open opcode breakdown (used before navigation)
  const handleCloseOpcodeBreakdown = useCallback(() => {
    setOpcodeExpandedId(null);
  }, []);

  // Track expanded nodes (start with first 3 levels expanded)
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    const expandToDepth = (node: EnrichedCallFrame | null, currentDepth: number): void => {
      if (!node || currentDepth > 2) return;
      initial.add(node.frame.call_frame_id ?? 0);
      for (const child of node.children) {
        expandToDepth(child, currentDepth + 1);
      }
    };
    if (rootNode) expandToDepth(rootNode, 0);
    return initial;
  });

  const handleToggleExpand = useCallback((id: number) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Expand all / collapse all
  const handleExpandAll = useCallback(() => {
    const all = new Set<number>();
    const addAll = (node: EnrichedCallFrame | null): void => {
      if (!node) return;
      all.add(node.frame.call_frame_id ?? 0);
      for (const child of node.children) {
        addAll(child);
      }
    };
    addAll(rootNode);
    setExpandedNodes(all);
  }, [rootNode]);

  const handleCollapseAll = useCallback(() => {
    // Keep root expanded
    const initial = new Set<number>();
    if (rootNode) initial.add(rootNode.frame.call_frame_id ?? 0);
    setExpandedNodes(initial);
  }, [rootNode]);

  if (!rootNode) {
    return (
      <div className="rounded-sm border border-border bg-surface/30 p-8 text-center text-sm text-muted">
        No internal tx trace data
      </div>
    );
  }

  // Count total internal txs (excluding root if it has no call_type)
  const totalCalls = callFrames.filter(f => f.call_type).length;

  return (
    <div className="overflow-hidden rounded-sm border border-border">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">Execution Trace</span>
          <span className="text-xs text-muted">{totalCalls} internal txs</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExpandAll}
            className="rounded-xs px-2 py-1 text-xs text-muted hover:bg-background hover:text-foreground"
          >
            Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className="rounded-xs px-2 py-1 text-xs text-muted hover:bg-background hover:text-foreground"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 border-b border-border bg-surface/50 px-3 py-1.5 text-xs font-medium text-muted">
        <span className="flex-1">Internal Tx</span>
        <span className="w-20 text-right">Gas</span>
        <span className="w-2" />
      </div>

      {/* Trace rows */}
      <div className="bg-background">
        <TraceRow
          node={rootNode}
          depth={0}
          isLast={true}
          ancestors={[]}
          totalGas={totalGas}
          txHash={txHash}
          blockNumber={blockNumber}
          expandedNodes={expandedNodes}
          onToggleExpand={handleToggleExpand}
          allOpcodeStats={opcodeStats}
          extendedData={extendedData?.[rootNode.frame.call_frame_id ?? 0]}
          highlight={highlight}
          onHighlightChange={handleHighlightChange}
          opcodeExpandedNodes={opcodeExpandedNodes}
          onToggleOpcodeExpand={handleToggleOpcodeExpand}
          onCloseOpcodeBreakdown={handleCloseOpcodeBreakdown}
        />
      </div>
    </div>
  );
}
