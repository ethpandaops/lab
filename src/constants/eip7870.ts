/**
 * EIP-7870 Reference Node Hardware Specifications
 *
 * Shared constants for cluster hardware specs used across the application.
 * These specs define the reference hardware for EIP-7870 compliance testing.
 */

/**
 * Cluster hardware specification type
 */
export type ClusterSpec = {
  name: string;
  cpu: {
    model: string;
    cores: number;
    threads: number;
    maxFrequency: string;
    passmarkSingle: string;
    passmarkMulti: string;
  };
  memory: {
    total: string;
    type: string;
    speed: string;
  };
  storage: {
    model: string;
    capacity: string;
    interface: string;
  };
};

/**
 * Hardware specifications by cluster
 */
export const CLUSTER_SPECS: ClusterSpec[] = [
  {
    name: 'utility',
    cpu: {
      model: 'AMD Ryzen 7 7700',
      cores: 8,
      threads: 16,
      maxFrequency: '5.4 GHz',
      passmarkSingle: '~4,100',
      passmarkMulti: '~34k',
    },
    memory: {
      total: '64 GB',
      type: 'DDR5',
      speed: '5200 MT/s',
    },
    storage: {
      model: 'SAMSUNG MZVL21T0HCLR-00B00',
      capacity: '2x 954 GB (RAID)',
      interface: 'NVMe',
    },
  },
  {
    name: 'sigma',
    cpu: {
      model: 'Intel Core i7-13700H',
      cores: 14,
      threads: 20,
      maxFrequency: '5.0 GHz',
      passmarkSingle: '~3,600',
      passmarkMulti: '~26k',
    },
    memory: {
      total: '64 GB',
      type: 'DDR5',
      speed: '4800 MT/s',
    },
    storage: {
      model: 'Samsung 990 PRO',
      capacity: '4 TB',
      interface: 'NVMe',
    },
  },
];

/**
 * Cluster color mapping for visual differentiation
 */
export const CLUSTER_COLORS: Record<string, string> = {
  utility: 'text-blue-500',
  sigma: 'text-emerald-500',
};

/**
 * Get cluster spec by name
 */
export function getClusterSpec(name: string): ClusterSpec | undefined {
  return CLUSTER_SPECS.find(spec => spec.name === name);
}

/**
 * Extract cluster name from a node name string
 * Returns the cluster name if the node is an EIP-7870 reference node, null otherwise
 */
export function extractClusterFromNodeName(nodeName: string): string | null {
  if (!nodeName.includes('7870')) return null;

  // Transform the node name to extract the cluster prefix
  const shortName = nodeName
    .replace(/^ethpandaops\/mainnet\//, '')
    .replace(/^ethpandaops\//, '')
    .replace(/^utility-mainnet-/, 'utility/')
    .replace(/^sigma-mainnet-/, 'sigma/');

  if (shortName.startsWith('utility/')) return 'utility';
  if (shortName.startsWith('sigma/')) return 'sigma';

  return null;
}
