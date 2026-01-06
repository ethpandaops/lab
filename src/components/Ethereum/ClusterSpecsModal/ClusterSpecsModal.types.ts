export type ClusterSpecsModalProps = {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when the modal is closed */
  onClose: () => void;
  /** The cluster name to display specs for (utility or sigma) */
  clusterName: string | null;
};
