import { type JSX } from 'react';
import { clsx } from 'clsx';
import { ServerIcon, CpuChipIcon, CircleStackIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

import { Dialog } from '@/components/Overlays/Dialog';
import { getClusterSpec, CLUSTER_COLORS } from '@/constants/eip7870';
import type { ClusterSpecsModalProps } from './ClusterSpecsModal.types';

/**
 * Modal displaying detailed hardware specifications for an EIP-7870 reference node cluster.
 */
export function ClusterSpecsModal({ open, onClose, clusterName }: ClusterSpecsModalProps): JSX.Element {
  const cluster = clusterName ? getClusterSpec(clusterName) : null;
  const clusterColor = clusterName ? CLUSTER_COLORS[clusterName] : 'text-muted';

  if (!cluster) {
    return (
      <Dialog open={open} onClose={onClose} title="Unknown Cluster" size="sm">
        <p className="text-sm text-muted">No hardware specifications found for this cluster.</p>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <ServerIcon className={clsx('size-5', clusterColor)} />
          <span>{cluster.name} cluster</span>
          <span className="rounded-xs bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent">EIP-7870</span>
        </span>
      }
      size="md"
    >
      <div className="space-y-4">
        {/* CPU Section */}
        <div className="rounded-xs border border-border bg-surface/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <CpuChipIcon className="size-4 text-muted" />
            <span className="text-sm font-medium text-foreground">CPU</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Model</span>
              <span className="font-medium text-foreground">{cluster.cpu.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Cores / Threads</span>
              <span className="font-medium text-foreground">
                {cluster.cpu.cores}c / {cluster.cpu.threads}t
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Max Frequency</span>
              <span className="font-medium text-foreground">{cluster.cpu.maxFrequency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Passmark (Single / Multi)</span>
              <span className="font-medium text-foreground">
                {cluster.cpu.passmarkSingle} / {cluster.cpu.passmarkMulti}
              </span>
            </div>
          </div>
        </div>

        {/* Memory Section */}
        <div className="rounded-xs border border-border bg-surface/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <svg className="size-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 9h8M8 13h6M3 17V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            <span className="text-sm font-medium text-foreground">Memory</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Total</span>
              <span className="font-medium text-foreground">{cluster.memory.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Type</span>
              <span className="font-medium text-foreground">{cluster.memory.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Speed</span>
              <span className="font-medium text-foreground">{cluster.memory.speed}</span>
            </div>
          </div>
        </div>

        {/* Storage Section */}
        <div className="rounded-xs border border-border bg-surface/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <CircleStackIcon className="size-4 text-muted" />
            <span className="text-sm font-medium text-foreground">Storage</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Model</span>
              <span className="font-medium text-foreground">{cluster.storage.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Capacity</span>
              <span className="font-medium text-foreground">{cluster.storage.capacity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Interface</span>
              <span className="font-medium text-foreground">{cluster.storage.interface}</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted">Reference nodes controlled by ethPandaOps</p>
          <a
            href="https://eips.ethereum.org/EIPS/eip-7870"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            View EIP-7870
            <ArrowTopRightOnSquareIcon className="size-3" />
          </a>
        </div>
      </div>
    </Dialog>
  );
}
