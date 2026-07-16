export interface SlotPayloadCardProps {
  /** Slot number being displayed */
  slot: number;
  /** Proposer validator index for the slot, used to detect self-built payloads */
  proposerIndex?: number;
  /** Whether a beacon block exists for the slot */
  hasBlock: boolean;
}
