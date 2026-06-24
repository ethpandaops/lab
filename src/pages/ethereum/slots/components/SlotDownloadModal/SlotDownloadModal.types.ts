/**
 * Props for {@link SlotDownloadModal}.
 */
export interface SlotDownloadModalProps {
  /** Whether the modal is open. */
  open: boolean;
  /** Callback when the modal should close. */
  onClose: () => void;
  /** Network name (used to build download-proxy URLs). */
  network: string;
  /** Slot number. */
  slot: number;
  /** Slot start time as a unix timestamp (seconds) — primary key for the blob query. */
  slotStartDateTime: number;
  /** Canonical block root, if the slot has a block. Absent for missed slots. */
  blockRoot?: string;
}
