import type { IntTransactionCallFrame } from '@/api/types.gen';
import type { CallFrameOpcodeStats } from '../../hooks/useTransactionGasData';

/**
 * Enriched call frame with resolved names
 */
export interface EnrichedCallFrame {
  /** Raw call frame data */
  frame: IntTransactionCallFrame;
  /** Resolved contract name */
  contractName: string | null;
  /** Resolved function name */
  functionName: string | null;
  /** Child frames */
  children: EnrichedCallFrame[];
}

/**
 * Future extensible data fields (add as data becomes available)
 */
export interface CallFrameExtendedData {
  /** Raw input calldata */
  inputData?: string;
  /** Decoded input parameters */
  decodedInput?: {
    name: string;
    type: string;
    value: string;
  }[];
  /** Raw output/return data */
  outputData?: string;
  /** Decoded return value */
  decodedOutput?: string;
  /** ETH value sent with call */
  value?: bigint;
  /** Revert reason if failed */
  revertReason?: string;
  /** Gas limit allocated */
  gasLimit?: number;
}

export interface CallTraceViewProps {
  /** All call frames from the transaction */
  callFrames: IntTransactionCallFrame[];
  /** Contract name lookup map */
  contractOwners: Record<string, { contract_name?: string | null }>;
  /** Function signature lookup map */
  functionSignatures: Record<string, { name?: string | null }>;
  /** Transaction hash for navigation */
  txHash: string;
  /** Block number for navigation */
  blockNumber: number;
  /** Total gas for percentage calculation */
  totalGas: number;
  /** Per-call-frame opcode stats for badges (call_frame_id -> stats) */
  opcodeStats?: Map<number, CallFrameOpcodeStats>;
  /** Extended data map (call_frame_id -> extended data) - for future use */
  extendedData?: Record<number, CallFrameExtendedData>;
}
