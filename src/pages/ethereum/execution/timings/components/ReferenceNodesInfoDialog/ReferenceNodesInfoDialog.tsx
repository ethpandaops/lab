import type { JSX } from 'react';
import { Dialog } from '@/components/Overlays/Dialog';

export interface ReferenceNodesInfoDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Dialog explaining reference nodes and EIP-7870 hardware specifications.
 * Used across engine timing views to provide context about the data source.
 */
export function ReferenceNodesInfoDialog({ open, onClose }: ReferenceNodesInfoDialogProps): JSX.Element {
  return (
    <Dialog open={open} onClose={onClose} title="About Reference Nodes" size="lg">
      <div className="space-y-4 text-sm leading-relaxed text-muted">
        <p>
          <span className="font-medium text-foreground">
            Reference nodes are controlled by ethPandaOps and follow EIP-7870 hardware specifications.
          </span>{' '}
          This EIP establishes standardized hardware and bandwidth recommendations to ensure consistent, meaningful
          benchmark comparisons across the Ethereum network.
        </p>
        <p>
          EIP-7870 defines three node types with specific requirements: Full Nodes for chain following, Attesters for
          validators, and Local Block Builders for block proposal. Each has distinct hardware and bandwidth needs.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 font-medium text-foreground">Node Type</th>
                <th className="py-2 pr-4 font-medium text-foreground">RAM</th>
                <th className="py-2 pr-4 font-medium text-foreground">CPU</th>
                <th className="py-2 font-medium text-foreground">Bandwidth</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4">Full Node</td>
                <td className="py-2 pr-4">32 GB</td>
                <td className="py-2 pr-4">4c/8t</td>
                <td className="py-2">50/15 Mbps</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4">Attester</td>
                <td className="py-2 pr-4">64 GB</td>
                <td className="py-2 pr-4">8c/16t</td>
                <td className="py-2">50/25 Mbps</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Local Block Builder</td>
                <td className="py-2 pr-4">64 GB</td>
                <td className="py-2 pr-4">8c/16t</td>
                <td className="py-2">100/50 Mbps</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="rounded-sm border border-accent/20 bg-accent/5 p-3">
          <p className="text-foreground">
            <span className="font-medium">Why filter by reference nodes?</span>{' '}
            <span className="italic">
              This ensures timing data reflects consistent, spec-compliant hardware rather than varied community setups.
            </span>
          </p>
        </div>
        <p>
          All reference nodes use 4 TB NVMe storage. By filtering to reference nodes, you see Engine API performance on
          standardized infrastructure, making it easier to identify client-specific behavior versus hardware-related
          variance.
        </p>
        <p className="text-xs">
          <a
            href="https://eips.ethereum.org/EIPS/eip-7870"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Read EIP-7870 specification
          </a>
        </p>
      </div>
    </Dialog>
  );
}
