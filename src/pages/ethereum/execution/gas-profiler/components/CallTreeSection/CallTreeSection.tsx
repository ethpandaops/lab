import { type JSX, useCallback, useMemo } from 'react';
import clsx from 'clsx';
import { FlameGraph } from '@/components/Charts/FlameGraph';
import type { FlameGraphNode } from '@/components/Charts/FlameGraph/FlameGraph.types';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Alert } from '@/components/Feedback/Alert';
import type { CallTreeNode } from '../../IndexPage.types';
import type { AllCallFrameOpcodesMap } from '../../hooks/useAllCallFrameOpcodes';
import { addOpcodesToCallTree, FLAME_GRAPH_CALL_TYPE_COLORS, FLAME_GRAPH_COMBINED_COLORS } from '../../utils';

export interface CallTreeSectionProps {
  /** Call tree data for the FlameGraph */
  callTree: CallTreeNode | null;
  /** Callback when a frame is selected */
  onFrameSelect: (node: CallTreeNode) => void;
  /** Currently selected frame ID */
  selectedFrameId?: string;
  /** Optional title override */
  title?: string;
  /** Whether to show opcodes as leaf children */
  showOpcodes?: boolean;
  /** Callback when opcodes toggle changes */
  onShowOpcodesChange?: (show: boolean) => void;
  /** Opcode data map (required when showOpcodes can be enabled) */
  opcodeMap?: AllCallFrameOpcodesMap;
  /** Whether opcode data is loading */
  isLoadingOpcodes?: boolean;
  /** Whether this is a contract creation transaction */
  isContractCreation?: boolean;
  /** Code deposit gas for CREATE transactions (bytecode_length * 200) */
  codeDepositGas?: number;
}

/**
 * Format gas value with comma separators (full precision)
 */
function formatGas(value: number): string {
  return value.toLocaleString();
}

/**
 * Call tree visualization section with FlameGraph
 */
export function CallTreeSection({
  callTree,
  onFrameSelect,
  selectedFrameId,
  title = 'Call Tree',
  showOpcodes = false,
  onShowOpcodesChange,
  opcodeMap,
  isLoadingOpcodes = false,
  isContractCreation = false,
  codeDepositGas,
}: CallTreeSectionProps): JSX.Element {
  // Wrap the callback to handle type conversion from FlameGraphNode to CallTreeNode
  const handleNodeClick = useCallback(
    (node: FlameGraphNode) => {
      // Don't navigate for opcode nodes
      const metadata = node.metadata as { isOpcode?: boolean } | undefined;
      if (metadata?.isOpcode) return;

      onFrameSelect(node as unknown as CallTreeNode);
    },
    [onFrameSelect]
  );

  // Build the tree with opcodes if enabled
  const displayTree = useMemo(() => {
    if (!callTree) return null;
    if (!showOpcodes || !opcodeMap) return callTree;
    return addOpcodesToCallTree(callTree, opcodeMap, {
      codeDepositGas: isContractCreation ? codeDepositGas : undefined,
    });
  }, [callTree, showOpcodes, opcodeMap, isContractCreation, codeDepositGas]);

  // Toggle button for opcodes
  const legendExtra = onShowOpcodesChange ? (
    <button
      onClick={() => onShowOpcodesChange(!showOpcodes)}
      disabled={isLoadingOpcodes}
      className={clsx(
        'rounded-xs px-2 py-1 text-xs transition-colors',
        showOpcodes ? 'bg-primary/10 text-primary' : 'bg-surface text-muted hover:text-foreground',
        isLoadingOpcodes && 'cursor-wait opacity-50'
      )}
    >
      {isLoadingOpcodes ? 'Loading...' : showOpcodes ? 'Opcodes On' : 'Opcodes Off'}
    </button>
  ) : undefined;

  if (!displayTree) {
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

  return (
    <PopoutCard title={title} subtitle="Visualize the call hierarchy">
      {({ inModal }) => (
        <>
          <FlameGraph
            data={displayTree as unknown as FlameGraphNode}
            valueUnit="gas"
            colorMap={showOpcodes ? FLAME_GRAPH_COMBINED_COLORS : FLAME_GRAPH_CALL_TYPE_COLORS}
            onNodeClick={handleNodeClick}
            selectedNodeId={selectedFrameId}
            rowHeight={28}
            showLegend
            legendExtra={legendExtra}
            valueFormatter={formatGas}
            height={inModal ? 500 : undefined}
            minWidthPercent={0}
          />
          {isContractCreation && showOpcodes && codeDepositGas && codeDepositGas > 0 && (
            <Alert
              variant="info"
              title="Contract Creation"
              description='The "Code Deposit" bar represents the cost of storing deployed bytecode (200 gas per byte). This is charged when the constructor returns, not during opcode execution.'
              className="mt-3"
            />
          )}
        </>
      )}
    </PopoutCard>
  );
}
