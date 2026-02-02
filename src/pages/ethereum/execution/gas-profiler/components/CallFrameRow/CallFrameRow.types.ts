/**
 * Call frame data for table display
 */
export interface CallFrameData {
  /** Unique call frame ID */
  callFrameId: number;
  /** Call type (CALL, DELEGATECALL, etc.) */
  callType: string;
  /** Target contract address */
  targetAddress: string;
  /** Target contract name (if known) */
  targetName: string | null;
  /** Function name being called (if known) */
  functionName: string | null;
  /** Total gas (cumulative - self + children) */
  gasCumulative: number;
  /** Self gas (this frame only) */
  gasSelf: number;
  /** Call depth in the tree */
  depth: number;
}

export interface CallFrameRowProps {
  /** Call frame data */
  frame: CallFrameData;
  /** Total gas for percentage calculation */
  totalGas: number;
  /** Transaction hash for navigation */
  txHash: string;
  /** Block number for navigation */
  blockNumber: number;
}
