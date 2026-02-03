import { type JSX, useState, useCallback, useMemo } from 'react';
import { ChevronRightIcon, ChevronDownIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

/**
 * Tooltip component for column headers
 */
function ColumnTooltip({ children, tooltip }: { children: React.ReactNode; tooltip: string }): JSX.Element {
  return (
    <span className="group/tooltip relative cursor-help">
      <InformationCircleIcon className="absolute top-0.5 -left-4 size-3 text-muted transition-colors group-hover/tooltip:text-foreground" />
      {children}
      <span className="pointer-events-none absolute top-full right-0 z-50 mt-1 hidden w-48 rounded-sm border border-border bg-background px-2 py-1.5 text-left text-xs font-normal text-muted shadow-lg group-hover/tooltip:block">
        {tooltip}
      </span>
    </span>
  );
}

/**
 * A node in the contract call tree (one node per call frame)
 */
export interface ContractTreeNode {
  address: string;
  name: string | null;
  /** Cumulative gas (self + children) */
  gas: number;
  /** Self gas (this call's own code, excluding children) */
  selfGas: number;
  /** Call type (CALL, STATICCALL, DELEGATECALL, etc.) */
  callType: string;
  /** Call frame ID for navigation */
  callFrameId: number;
  /** Child calls made by this call frame */
  children: ContractTreeNode[];
  /** Depth in the tree (0 = root) */
  depth: number;
}

interface ContractCallTreeProps {
  /** Root node of the tree */
  root: ContractTreeNode | null;
  /** Total transaction gas for percentage calculation */
  totalGas: number;
  /** Callback when a call frame is clicked */
  onCallFrameClick?: (callFrameId: number) => void;
}

interface TreeNodeRowProps {
  node: ContractTreeNode;
  totalGas: number;
  isLast: boolean;
  ancestors: boolean[]; // true if ancestor at that depth is last child
  expandedNodes: Set<string>;
  onToggle: (nodeKey: string) => void;
  onCallFrameClick?: (callFrameId: number) => void;
  /** Unique key for this node position in the tree */
  nodeKey: string;
  /** Currently highlighted address (lowercase) */
  highlightedAddress: string | null;
  /** Callback to change highlight */
  onHighlightChange: (address: string | null) => void;
}

/**
 * Get call type badge styling (matches CallTraceView)
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

function TreeNodeRow({
  node,
  totalGas,
  isLast,
  ancestors,
  expandedNodes,
  onToggle,
  onCallFrameClick,
  nodeKey,
  highlightedAddress,
  onHighlightChange,
}: TreeNodeRowProps): JSX.Element {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodes.has(nodeKey);
  const percentage = totalGas > 0 ? (node.gas / totalGas) * 100 : 0;
  const depth = node.depth;

  // Highlight state for this row
  const normalizedAddress = node.address.toLowerCase();
  const isHighlighted = highlightedAddress !== null && normalizedAddress === highlightedAddress;

  // Hover handlers
  const handleMouseEnter = useCallback(() => {
    onHighlightChange(normalizedAddress);
  }, [normalizedAddress, onHighlightChange]);

  const handleMouseLeave = useCallback(() => {
    onHighlightChange(null);
  }, [onHighlightChange]);

  // Build the tree line prefix (matches CallTraceView)
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

  const callTypeStyles = getCallTypeStyles(node.callType);

  return (
    <>
      <div
        className={clsx(
          'group flex items-center gap-2 border-b border-border/30 px-3 py-1.5 font-mono text-sm',
          onCallFrameClick && 'cursor-pointer hover:bg-surface/50'
        )}
        onClick={() => onCallFrameClick?.(node.callFrameId)}
      >
        {/* Tree lines */}
        <span className="whitespace-pre text-border select-none">{treePrefix}</span>

        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={e => {
              e.stopPropagation();
              onToggle(nodeKey);
            }}
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
        <span
          className={clsx(
            'shrink-0 rounded-xs px-1.5 py-0.5 text-xs font-medium',
            callTypeStyles.bg,
            callTypeStyles.text
          )}
        >
          {node.callType}
        </span>

        {/* Contract name/address - with hover highlight (matches CallTraceView) */}
        <span className="truncate text-foreground group-hover:text-primary">
          {node.name ? (
            <>
              <span
                className={clsx(
                  'cursor-pointer font-medium transition-colors',
                  isHighlighted
                    ? 'rounded-xs bg-amber-200 px-0.5 text-amber-800 dark:bg-amber-500/30 dark:text-amber-300'
                    : 'text-muted hover:text-foreground'
                )}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {node.name}
              </span>
              <span className="ml-2 text-xs text-muted">
                {node.address.slice(0, 10)}...{node.address.slice(-8)}
              </span>
            </>
          ) : (
            <span
              className={clsx(
                'cursor-pointer transition-colors',
                isHighlighted
                  ? 'rounded-xs bg-amber-200 px-0.5 text-amber-800 dark:bg-amber-500/30 dark:text-amber-300'
                  : 'text-muted hover:text-foreground'
              )}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {node.address.slice(0, 10)}...{node.address.slice(-8)}
            </span>
          )}
        </span>

        {/* Spacer */}
        <span className="flex-1" />

        {/* % of Tx */}
        <span className="w-12 shrink-0 text-right text-xs text-muted">{percentage.toFixed(1)}%</span>

        {/* Self Gas */}
        <span className="w-16 shrink-0 text-right text-xs text-muted">{node.selfGas.toLocaleString()}</span>

        {/* Cumulative Gas */}
        <span className="w-20 shrink-0 text-right text-xs text-muted">{node.gas.toLocaleString()}</span>
      </div>

      {/* Children */}
      {isExpanded &&
        node.children.map((child, idx) => (
          <TreeNodeRow
            key={`${nodeKey}-${child.callFrameId}`}
            node={child}
            totalGas={totalGas}
            isLast={idx === node.children.length - 1}
            ancestors={[...ancestors, isLast]}
            expandedNodes={expandedNodes}
            onToggle={onToggle}
            onCallFrameClick={onCallFrameClick}
            nodeKey={`${nodeKey}-${child.callFrameId}`}
            highlightedAddress={highlightedAddress}
            onHighlightChange={onHighlightChange}
          />
        ))}
    </>
  );
}

/**
 * Hierarchical tree view of contract calls (matches CallTraceView styling)
 */
export function ContractCallTree({ root, totalGas, onCallFrameClick }: ContractCallTreeProps): JSX.Element {
  // Track which nodes are expanded (by their unique key path)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    // Auto-expand first 2 levels
    const initial = new Set<string>();
    if (root) {
      initial.add('root');
      root.children.forEach(child => {
        initial.add(`root-${child.callFrameId}`);
      });
    }
    return initial;
  });

  // Track highlighted address for hover-to-highlight feature
  const [highlightedAddress, setHighlightedAddress] = useState<string | null>(null);

  const handleToggle = useCallback((nodeKey: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeKey)) {
        next.delete(nodeKey);
      } else {
        next.add(nodeKey);
      }
      return next;
    });
  }, []);

  const handleHighlightChange = useCallback((address: string | null) => {
    setHighlightedAddress(address);
  }, []);

  // Expand all nodes
  const expandAll = useCallback(() => {
    if (!root) return;

    const allKeys = new Set<string>();

    const collectKeys = (node: ContractTreeNode, keyPrefix: string): void => {
      allKeys.add(keyPrefix);
      node.children.forEach(child => {
        collectKeys(child, `${keyPrefix}-${child.callFrameId}`);
      });
    };

    collectKeys(root, 'root');
    setExpandedNodes(allKeys);
  }, [root]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set(['root'])); // Keep root expanded
  }, []);

  // Count internal calls (excludes root which is depth 0)
  const callCount = useMemo(() => {
    if (!root) return 0;
    const count = (node: ContractTreeNode): number => 1 + node.children.reduce((sum, child) => sum + count(child), 0);
    // Subtract 1 to exclude the root (the transaction entry point itself)
    return count(root) - 1;
  }, [root]);

  if (!root) {
    return (
      <div className="rounded-sm border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted">No contract call data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Contract Call Hierarchy</span>
          <span className="text-xs text-muted">{callCount} calls</span>
        </div>
        <div className="flex gap-3">
          <button onClick={expandAll} className="text-xs text-muted transition-colors hover:text-foreground">
            Expand All
          </button>
          <button onClick={collapseAll} className="text-xs text-muted transition-colors hover:text-foreground">
            Collapse All
          </button>
        </div>
      </div>

      {/* Tree with sticky column headers */}
      <div className="max-h-[600px] overflow-y-auto">
        {/* Column headers */}
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted">
          <span className="flex-1">Contract</span>
          <span className="w-12 shrink-0 text-right">
            <ColumnTooltip tooltip="Percentage of total transaction gas consumed by this call and all its children.">
              %
            </ColumnTooltip>
          </span>
          <span className="w-16 shrink-0 text-right">
            <ColumnTooltip tooltip="Gas consumed by this call's own code only, excluding any child calls it made.">
              Self
            </ColumnTooltip>
          </span>
          <span className="w-20 shrink-0 text-right">
            <ColumnTooltip tooltip="Total cumulative gas: Self + all children. This is what you pay for this entire call subtree.">
              Gas
            </ColumnTooltip>
          </span>
        </div>
        <TreeNodeRow
          node={root}
          totalGas={totalGas}
          isLast={true}
          ancestors={[]}
          expandedNodes={expandedNodes}
          onToggle={handleToggle}
          onCallFrameClick={onCallFrameClick}
          nodeKey="root"
          highlightedAddress={highlightedAddress}
          onHighlightChange={handleHighlightChange}
        />
      </div>
    </div>
  );
}
