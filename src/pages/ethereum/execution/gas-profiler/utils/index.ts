export {
  OPCODE_CATEGORIES,
  CATEGORY_COLORS,
  CALL_TYPE_COLORS,
  getOpcodeCategory,
  FLAME_GRAPH_CALL_TYPE_COLORS,
  FLAME_GRAPH_CATEGORY_COLORS,
  FLAME_GRAPH_COMBINED_COLORS,
} from './opcodeUtils';
export { addOpcodesToCallTree, isOpcodeNode, type AddOpcodesToCallTreeOptions } from './callTreeWithOpcodes';
export { getEffectiveGasRefund } from './gasRefund';
