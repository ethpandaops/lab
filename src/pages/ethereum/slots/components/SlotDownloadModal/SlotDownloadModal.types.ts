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
  /** Canonical block root, if the slot has a block. Absent for missed slots. */
  blockRoot?: string;
  /** Versioned hashes of the slot's blob sidecars, in order. */
  versionedHashes: string[];
}
