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
   * The slot number for the selected cell
   */
  slot: number;
  /**
   * The client name (execution or consensus)
   */
  client: string;
  /**
   * Whether this is an execution client (true) or consensus client (false)
   */
  isExecutionClient: boolean;
  /**
   * All blocks for this slot (with parsed client names)
   */
  blocks: ParsedBlock[];
}
