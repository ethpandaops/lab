import type { CallTreeNode } from '../IndexPage.types';
import type { AllCallFrameOpcodesMap, CallFrameOpcodeData } from '../hooks/useAllCallFrameOpcodes';
import { getOpcodeCategory } from './opcodeUtils';

/**
 * Creates a new call tree with opcodes added as leaf children of each call frame.
 *
 * The opcodes are added as children that represent the "self gas" of each frame.
 * This allows the flame graph to show detailed opcode-level gas breakdown.
 *
 * @param tree - The original call tree (call frames only)
 * @param opcodeMap - Map of call_frame_id to opcode data
 * @returns New tree with opcodes added as children
 */
export function addOpcodesToCallTree(
  tree: CallTreeNode | null,
  opcodeMap: AllCallFrameOpcodesMap
): CallTreeNode | null {
  if (!tree) return null;

  return addOpcodesToNode(tree, opcodeMap);
}

/**
 * Recursively add opcodes to a node and its children
 */
function addOpcodesToNode(node: CallTreeNode, opcodeMap: AllCallFrameOpcodesMap): CallTreeNode {
  const frameId = node.metadata?.callFrameId ?? parseInt(node.id, 10);
  const opcodes = opcodeMap.get(frameId) ?? [];

  // Recursively process existing children (call frames)
  const processedChildren = (node.children ?? []).map(child => addOpcodesToNode(child, opcodeMap));

  // Create opcode children for this frame's self gas
  const opcodeChildren = createOpcodeChildren(opcodes, frameId);

  // Combine: existing call frame children + opcode children
  // Sort so call frames come first, then opcodes by gas
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
 * Check if a node represents an opcode (vs a call frame)
 */
export function isOpcodeNode(node: CallTreeNode): boolean {
  return (node.metadata as { isOpcode?: boolean })?.isOpcode === true;
}
