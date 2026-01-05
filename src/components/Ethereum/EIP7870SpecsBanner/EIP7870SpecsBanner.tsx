import { useState, type JSX } from 'react';
import { clsx } from 'clsx';
import { ChevronDownIcon, ChevronUpIcon, ServerIcon } from '@heroicons/react/24/outline';

import type { EIP7870SpecsBannerProps, HardwareSpec, NodeClass } from './EIP7870SpecsBanner.types';

/**
 * EIP-7870 hardware specifications by node class
 */
const HARDWARE_SPECS: Record<NodeClass, HardwareSpec> = {
  'full-node': {
    nodeClass: 'full-node',
    displayName: 'Full Node',
    storage: '4 TB NVMe',
    memory: '32 GB',
    cpu: '4c / 8t',
    passMarkST: '~1000',
    passMarkMT: '~3000',
    bandwidthDown: '50 Mbps',
    bandwidthUp: '15 Mbps',
  },
  attester: {
    nodeClass: 'attester',
    displayName: 'Attester',
    storage: '4 TB NVMe',
    memory: '64 GB',
    cpu: '8c / 16t',
    passMarkST: '~3500',
    passMarkMT: '~25000',
    bandwidthDown: '50 Mbps',
    bandwidthUp: '25 Mbps',
  },
  'local-block-builder': {
    nodeClass: 'local-block-builder',
    displayName: 'Local Block Builder',
    storage: '4 TB NVMe',
    memory: '64 GB',
    cpu: '8c / 16t',
    passMarkST: '~3500',
    passMarkMT: '~25000',
    bandwidthDown: '100 Mbps',
    bandwidthUp: '50 Mbps',
  },
};

/**
 * Displays EIP-7870 hardware specifications in a compact, expandable banner.
 * Shows key specs inline with option to expand for full details.
 *
 * @example
 * // Default attester specs
 * <EIP7870SpecsBanner />
 *
 * @example
 * // Full node specs
 * <EIP7870SpecsBanner nodeClass="full-node" />
 */
export function EIP7870SpecsBanner({ nodeClass = 'attester', className }: EIP7870SpecsBannerProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const spec = HARDWARE_SPECS[nodeClass];

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
          <span className="text-xs text-muted">
            <span className="font-medium text-foreground">Reference Nodes:</span>{' '}
            <span className="font-medium text-foreground">{spec.displayName}</span>
            <span className="hidden sm:inline">
              {' '}
              ({spec.memory} · {spec.cpu} · {spec.storage} · {spec.bandwidthDown} / {spec.bandwidthUp})
            </span>
            <span className="sm:hidden">
              {' '}
              ({spec.memory} · {spec.cpu})
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-accent hover:underline">EIP-7870</span>
          {isExpanded ? (
            <ChevronUpIcon className="size-4 text-muted" />
          ) : (
            <ChevronDownIcon className="size-4 text-muted" />
          )}
        </div>
      </button>

      {/* Expanded view - full specs table */}
      {isExpanded && (
        <div className="border-t border-border px-4 py-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="pr-4 pb-2 font-medium text-foreground">Node Type</th>
                  <th className="pr-4 pb-2 font-medium text-foreground">Storage</th>
                  <th className="pr-4 pb-2 font-medium text-foreground">Memory</th>
                  <th className="pr-4 pb-2 font-medium text-foreground">CPU</th>
                  <th className="pr-4 pb-2 font-medium text-foreground">PassMark ST / MT</th>
                  <th className="pb-2 font-medium text-foreground">Bandwidth</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                <tr>
                  <td className="pt-2 pr-4 font-medium text-foreground">{spec.displayName}</td>
                  <td className="pt-2 pr-4">{spec.storage}</td>
                  <td className="pt-2 pr-4">{spec.memory}</td>
                  <td className="pt-2 pr-4">{spec.cpu}</td>
                  <td className="pt-2 pr-4">
                    {spec.passMarkST} / {spec.passMarkMT}
                  </td>
                  <td className="pt-2">
                    {spec.bandwidthDown} / {spec.bandwidthUp}
                  </td>
                </tr>
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
