import type { ParsedBlock } from '../../hooks';

export interface BlockDetailsModalProps {
  /**
   * Whether the modal is open
   */
  open: boolean;
  /**
   * Callback when the modal should close
   */
  onClose: () => void;
  /**
   * The slot number for the selected cell (null for pairing context)
   */
  slot: number | null;
  /**
   * The client name (execution or consensus, or "exec + consensus" for pairings)
   */
  client: string;
  /**
   * Whether this is an execution client (true) or consensus client (false)
   * Null for pairing context
   */
  isExecutionClient: boolean | null;
  /**
   * All blocks for this slot or pairing (with parsed client names)
   */
  blocks: ParsedBlock[];
}
