import { type JSX, useCallback, useState } from 'react';
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { FireIcon, Bars3BottomLeftIcon } from '@heroicons/react/24/solid';
import { FlameGraph } from '@/components/Charts/FlameGraph';
import { EVM_CALL_TYPE_COLORS, type FlameGraphNode } from '@/components/Charts/FlameGraph/FlameGraph.types';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import type { CallTreeNode } from '../../IndexPage.types';

export interface CallTreeSectionProps {
  /** Call tree data for the FlameGraph */
  callTree: CallTreeNode | null;
  /** Callback when a frame is selected */
  onFrameSelect: (node: CallTreeNode) => void;
  /** Currently selected frame ID */
  selectedFrameId?: string;
  /** Default view mode */
  defaultView?: 'flame' | 'tree';
  /** Optional title override */
  title?: string;
}

type ViewMode = 'flame' | 'tree';

/**
 * Format gas value with comma separators (full precision)
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
 * Get call type badge styling
 */
function getCallTypeStyles(callType: string): { bg: string; text: string } {
  switch (callType) {
    case 'CREATE':
      return { bg: 'bg-orange-500/10', text: 'text-orange-500' };
    case 'CREATE2':
      return { bg: 'bg-amber-500/10', text: 'text-amber-500' };
    case 'DELEGATECALL':
      return { bg: 'bg-purple-500/10', text: 'text-purple-400' };
    case 'STATICCALL':
      return { bg: 'bg-cyan-500/10', text: 'text-cyan-400' };
    case 'CALL':
    default:
      return { bg: 'bg-blue-500/10', text: 'text-blue-400' };
  }
}

interface TreeNodeProps {
  node: CallTreeNode;
  depth: number;
  isLast: boolean;
  parentLines: boolean[];
  onSelect: (node: CallTreeNode) => void;
  totalGas: number;
}

/**
 * Recursive tree node component
 */
function TreeNode({ node, depth, isLast, parentLines, onSelect, totalGas }: TreeNodeProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(true); // Auto-expand all
  const hasChildren = node.children && node.children.length > 0;
  const styles = getCallTypeStyles(node.category ?? 'CALL');
  const pct = totalGas > 0 ? ((node.value / totalGas) * 100).toFixed(1) : '0';

  const handleClick = useCallback(() => {
    onSelect(node);
  }, [node, onSelect]);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    },
    [isExpanded]
  );

  return (
    <div className="font-mono text-sm">
      {/* Current node */}
      <div
        className="group flex cursor-pointer items-center hover:bg-surface/50"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && handleClick()}
      >
        {/* Tree lines for ancestors */}
        {parentLines.map((showLine, i) => (
          <span key={i} className="inline-block w-5 text-center text-border select-none">
            {showLine ? '│' : ' '}
          </span>
        ))}

        {/* Connector for this node */}
        {depth > 0 && (
          <span className="inline-block w-5 text-center text-border select-none">{isLast ? '└' : '├'}</span>
        )}

        {/* Expand/collapse toggle or line */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="inline-flex w-5 items-center justify-center text-muted hover:text-foreground"
          >
            {isExpanded ? <ChevronDownIcon className="size-3" /> : <ChevronRightIcon className="size-3" />}
          </button>
        ) : (
          <span className="inline-block w-5 text-center text-border select-none">─</span>
        )}

        {/* Node content */}
        <div className="flex flex-1 items-center gap-2 py-1">
          <span className={`rounded-xs px-1 py-0.5 text-xs ${styles.bg} ${styles.text}`}>{node.category}</span>
          <span className="text-foreground group-hover:text-primary">{node.label}</span>
          {node.hasError && <span className="rounded-xs bg-danger/10 px-1 py-0.5 text-xs text-danger">Error</span>}
        </div>

        {/* Gas info */}
        <div className="flex items-center gap-3 pr-2 text-right">
          <span className="text-foreground">{formatCompact(node.value)}</span>
          <span className="w-12 text-xs text-muted">{pct}%</span>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child, index) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              isLast={index === node.children!.length - 1}
              parentLines={[...parentLines, depth > 0 ? !isLast : false]}
              onSelect={onSelect}
              totalGas={totalGas}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Call tree visualization section with toggle between FlameGraph and TreeView
 */
export function CallTreeSection({
  callTree,
  onFrameSelect,
  selectedFrameId,
  defaultView = 'flame',
  title = 'Call Tree',
}: CallTreeSectionProps): JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);

  // Wrap the callback to handle type conversion from FlameGraphNode to CallTreeNode
  const handleNodeClick = useCallback(
    (node: FlameGraphNode) => {
      onFrameSelect(node as unknown as CallTreeNode);
    },
    [onFrameSelect]
  );

  if (!callTree) {
    return (
      <PopoutCard title={title} subtitle="Visualize the call hierarchy">
        {() => (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted">
            No call tree data available
          </div>
        )}
      </PopoutCard>
    );
  }

  const totalGas = callTree.value;

  // View toggle element - shared between flame and tree views
  const viewToggle = (
    <div className="flex rounded-sm border border-border">
      <button
        onClick={() => setViewMode('flame')}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors ${
          viewMode === 'flame' ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface hover:text-foreground'
        }`}
        title="Flame Graph view"
      >
        <FireIcon className="size-3.5" />
        Flame Graph
      </button>
      <button
        onClick={() => setViewMode('tree')}
        className={`flex items-center gap-1.5 border-l border-border px-2.5 py-1 text-xs transition-colors ${
          viewMode === 'tree' ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface hover:text-foreground'
        }`}
        title="Tree view"
      >
        <Bars3BottomLeftIcon className="size-3.5" />
        Tree View
      </button>
    </div>
  );

  return (
    <PopoutCard title={title} subtitle="Visualize the call hierarchy">
      {({ inModal }) => (
        <div>
          {/* View content */}
          {viewMode === 'flame' ? (
            <FlameGraph
              data={callTree as unknown as FlameGraphNode}
              valueUnit="gas"
              colorMap={EVM_CALL_TYPE_COLORS}
              onNodeClick={handleNodeClick}
              selectedNodeId={selectedFrameId}
              rowHeight={28}
              showLegend
              legendExtra={viewToggle}
              valueFormatter={formatGas}
              height={inModal ? 500 : undefined}
            />
          ) : (
            <>
              <div
                className="overflow-auto rounded-sm border border-border bg-background p-2"
                style={{ maxHeight: inModal ? 500 : 350 }}
              >
                <TreeNode
                  node={callTree}
                  depth={0}
                  isLast={true}
                  parentLines={[]}
                  onSelect={onFrameSelect}
                  totalGas={totalGas}
                />
              </div>
              {/* Show toggle at bottom for tree view too */}
              <div className="mt-3 flex justify-end">{viewToggle}</div>
            </>
          )}
        </div>
      )}
    </PopoutCard>
  );
}
