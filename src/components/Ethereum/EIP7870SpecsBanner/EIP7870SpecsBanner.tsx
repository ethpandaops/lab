import { useState, type JSX } from 'react';
import { clsx } from 'clsx';
import { ChevronDownIcon, ChevronUpIcon, ServerIcon } from '@heroicons/react/24/outline';

import type { EIP7870SpecsBannerProps } from './EIP7870SpecsBanner.types';

/**
 * Cluster hardware specifications
 */
type ClusterSpec = {
  name: string;
  cpu: {
    model: string;
    cores: number;
    threads: number;
    maxFrequency: string;
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
const CLUSTER_SPECS: ClusterSpec[] = [
  {
    name: 'utility',
    cpu: {
      model: 'AMD Ryzen 7 7700',
      cores: 8,
      threads: 16,
      maxFrequency: '5.4 GHz',
    },
    memory: {
      total: '64 GB',
      type: 'DDR5',
      speed: '5200 MT/s',
    },
    storage: {
      model: 'SOLIDIGM SSDPFKKW010X7',
      capacity: '2x 1 TB',
      interface: 'NVMe 1.4',
    },
  },
  {
    name: 'sigma',
    cpu: {
      model: 'Intel Core i7-13700H',
      cores: 14,
      threads: 20,
      maxFrequency: '5.0 GHz',
    },
    memory: {
      total: '64 GB',
      type: 'DDR5',
      speed: '4800 MT/s',
    },
    storage: {
      model: 'Samsung 990 PRO',
      capacity: '4 TB',
      interface: 'NVMe 2.0',
    },
  },
];

/**
 * Displays EIP-7870 hardware specifications in a compact, expandable banner.
 * Shows cluster specs with option to expand for full details.
 */
export function EIP7870SpecsBanner({ className }: EIP7870SpecsBannerProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={clsx('rounded-xs border border-border bg-surface/50', className)}>
      {/* Collapsed view - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface"
      >
        <div className="flex items-center gap-2.5">
          <ServerIcon className="size-4 shrink-0 text-muted" />
          <span className="text-xs font-medium text-foreground">Reference Node Hardware Specs</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-accent">EIP-7870</span>
          {isExpanded ? (
            <ChevronUpIcon className="size-4 text-muted" />
          ) : (
            <ChevronDownIcon className="size-4 text-muted" />
          )}
        </div>
      </button>

      {/* Expanded view - cluster specs table */}
      {isExpanded && (
        <div className="border-t border-border px-4 py-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="pr-4 pb-2 font-medium text-foreground">Cluster</th>
                  <th className="pr-4 pb-2 font-medium text-foreground">CPU</th>
                  <th className="pr-4 pb-2 font-medium text-foreground">Cores / Threads</th>
                  <th className="pr-4 pb-2 font-medium text-foreground">Memory</th>
                  <th className="pb-2 font-medium text-foreground">Storage</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                {CLUSTER_SPECS.map(cluster => (
                  <tr key={cluster.name} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-4 font-medium text-foreground">{cluster.name}</td>
                    <td className="py-2 pr-4">
                      <div>{cluster.cpu.model}</div>
                      <div className="text-muted/70">up to {cluster.cpu.maxFrequency}</div>
                    </td>
                    <td className="py-2 pr-4">
                      {cluster.cpu.cores}c / {cluster.cpu.threads}t
                    </td>
                    <td className="py-2 pr-4">
                      <div>{cluster.memory.total}</div>
                      <div className="text-muted/70">
                        {cluster.memory.type} @ {cluster.memory.speed}
                      </div>
                    </td>
                    <td className="py-2">
                      <div>
                        {cluster.storage.model} {cluster.storage.capacity}
                      </div>
                      <div className="text-muted/70">{cluster.storage.interface}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
            <p className="text-xs text-muted">
              Reference nodes are controlled by ethPandaOps and follow EIP-7870 hardware specifications.
            </p>
            <a
              href="https://eips.ethereum.org/EIPS/eip-7870"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs text-accent hover:underline"
            >
              View EIP-7870
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
