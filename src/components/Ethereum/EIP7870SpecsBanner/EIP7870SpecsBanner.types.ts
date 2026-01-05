/**
 * EIP-7870 node class type
 */
export type NodeClass = 'full-node' | 'attester' | 'local-block-builder';

/**
 * Hardware specification for a node class
 */
export type HardwareSpec = {
  nodeClass: NodeClass;
  displayName: string;
  storage: string;
  memory: string;
  cpu: string;
  passMarkST: string;
  passMarkMT: string;
  bandwidthDown: string;
  bandwidthUp: string;
};

export type EIP7870SpecsBannerProps = {
  /**
   * The node class to display specs for
   * @default 'attester'
   */
  nodeClass?: NodeClass;
  /**
   * Additional CSS classes
   */
  className?: string;
};
