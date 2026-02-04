import type { CallTreeNode } from '../IndexPage.types';
import type { AllCallFrameOpcodesMap, CallFrameOpcodeData } from '../hooks/useAllCallFrameOpcodes';
import { getOpcodeCategory } from './opcodeUtils';

/**
 * Options for adding opcodes to call tree
 */
export interface AddOpcodesToCallTreeOptions {
  /** Code deposit gas for CREATE transactions (added as synthetic node to root frame) */
  codeDepositGas?: number;
}

/**
 * Creates a new call tree with opcodes added as leaf children of each call frame.
 *
 * The opcodes are added as children that represent the "self gas" of each frame.
 * This allows the flame graph to show detailed opcode-level gas breakdown.
 *
 * For CREATE transactions, a synthetic "Code Deposit" node is added to represent
 * the gas cost of storing the deployed bytecode (200 gas per byte).
 *
 * @param tree - The original call tree (call frames only)
 * @param opcodeMap - Map of call_frame_id to opcode data
 * @param options - Optional settings including code deposit gas for CREATE transactions
 * @returns New tree with opcodes added as children
 */
export function addOpcodesToCallTree(
  tree: CallTreeNode | null,
  opcodeMap: AllCallFrameOpcodesMap,
  options?: AddOpcodesToCallTreeOptions
): CallTreeNode | null {
  if (!tree) return null;

  return addOpcodesToNode(tree, opcodeMap, true, options);
}

/**
 * Recursively add opcodes to a node and its children
 *
 * Opcodes are added to ALL frames as children. This ensures each row in the
 * flame graph spans 100% of its parent's width - the opcodes fill the "self gas"
 * gap between the call frame children and the parent's boundary.
 */
function addOpcodesToNode(
  node: CallTreeNode,
  opcodeMap: AllCallFrameOpcodesMap,
  isRoot: boolean = false,
  options?: AddOpcodesToCallTreeOptions
): CallTreeNode {
  const frameId = node.metadata?.callFrameId ?? parseInt(node.id, 10);
  const opcodes = opcodeMap.get(frameId) ?? [];

  // Recursively process existing children (call frames)
  const processedChildren = (node.children ?? []).map(child => addOpcodesToNode(child, opcodeMap, false));

  // Create opcode children for this frame's self gas
  const opcodeChildren = createOpcodeChildren(opcodes, frameId);

  // For root frame of CREATE transactions, add synthetic code deposit node
  if (isRoot && options?.codeDepositGas && options.codeDepositGas > 0) {
    const codeDepositNode = createCodeDepositNode(frameId, options.codeDepositGas);
    opcodeChildren.push(codeDepositNode);
  }

  // Combine: existing call frame children + opcode children
  const allChildren = [...processedChildren, ...opcodeChildren];

  return {
    ...node,
    children: allChildren.length > 0 ? allChildren : undefined,
  };
}

/**
 * Create CallTreeNode children from opcode data
 */
function createOpcodeChildren(opcodes: CallFrameOpcodeData[], parentFrameId: number): CallTreeNode[] {
  return opcodes
    .filter(op => op.gas > 0) // Only include opcodes with gas cost
    .map(op => ({
      id: `${parentFrameId}-opcode-${op.opcode}`,
      label: op.opcode,
      value: op.gas,
      selfValue: op.gas, // Opcodes are leaf nodes - no children
      category: getOpcodeCategory(op.opcode), // Category for color mapping
      hasError: op.errorCount > 0,
      metadata: {
        // Internal flag for click handling (filtered from tooltip display)
        isOpcode: true,
        // Only include meaningful data
        executionCount: op.count,
        // Only show error count if there are errors
        ...(op.errorCount > 0 ? { errorCount: op.errorCount } : {}),
      } as CallTreeNode['metadata'] & { isOpcode: boolean; executionCount: number; errorCount?: number },
    }));
}

/**
 * Create a synthetic "Code Deposit" node for CREATE transactions.
 * This represents the gas cost of storing deployed bytecode (200 gas per byte).
 */
function createCodeDepositNode(parentFrameId: number, gas: number): CallTreeNode {
  return {
    id: `${parentFrameId}-code-deposit`,
    label: 'Code Deposit',
    value: gas,
    selfValue: gas,
    category: 'Contract', // Use contract category color
    metadata: {
      isOpcode: true, // Treat as opcode for click handling (non-navigable)
      isCodeDeposit: true,
      executionCount: 1,
    } as CallTreeNode['metadata'] & { isOpcode: boolean; isCodeDeposit: boolean; executionCount: number },
  };
}

/**
 * Check if a node represents an opcode (vs a call frame)
 */
export function isOpcodeNode(node: CallTreeNode): boolean {
  return (node.metadata as { isOpcode?: boolean })?.isOpcode === true;
}
