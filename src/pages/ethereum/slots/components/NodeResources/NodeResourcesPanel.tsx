import { type JSX, useState, useMemo, useCallback } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Card } from '@/components/Layout/Card';
import { Checkbox } from '@/components/Forms/Checkbox';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { ReferenceNodesInfoDialog } from '@/pages/ethereum/execution/timings/components/ReferenceNodesInfoDialog';
import { extractClusterFromNodeName } from '@/constants/eip7870';
import { useSlotNodeResources } from '../../hooks/useSlotNodeResources';
import { NodeSelector, type NodeClientInfo } from './NodeSelector';
import { CpuUtilizationChart } from './CpuUtilizationChart';

export type CpuMetric = 'mean' | 'min' | 'max';

const CL_CLIENTS = new Set(['lighthouse', 'lodestar', 'nimbus', 'prysm', 'teku', 'grandine']);
const EL_CLIENTS = new Set(['besu', 'erigon', 'geth', 'nethermind', 'reth']);

interface BlockArrival {
  seen_slot_start_diff: number;
  node_id: string;
}

interface NodeResourcesPanelProps {
  slot: number;
  blockPropagationData: BlockArrival[];
}

const METRIC_OPTIONS = [
  { value: 'mean' as CpuMetric, label: 'Mean' },
  { value: 'min' as CpuMetric, label: 'Min' },
  { value: 'max' as CpuMetric, label: 'Max' },
];

export function NodeResourcesPanel({ slot, blockPropagationData }: NodeResourcesPanelProps): JSX.Element {
  const { data, isLoading, error } = useSlotNodeResources(slot);
  const search = useSearch({ from: '/ethereum/slots/$slot' });
  const navigate = useNavigate();
  const [showRefNodeInfo, setShowRefNodeInfo] = useState(false);

  // URL-backed state
  const referenceNodesOnly = search.refNodes ?? false;
  const selectedNode = search.node ?? null;
  const metric: CpuMetric = search.metric ?? 'mean';

  const setReferenceNodesOnly = useCallback(
    (value: boolean) => {
      navigate({
        to: '/ethereum/slots/$slot',
        params: { slot: String(slot) },
        search: prev => ({ ...prev, refNodes: value || undefined }),
        replace: true,
      });
    },
    [navigate, slot]
  );

  const setSelectedNode = useCallback(
    (value: string | null) => {
      navigate({
        to: '/ethereum/slots/$slot',
        params: { slot: String(slot) },
        search: prev => ({ ...prev, node: value ?? undefined }),
        replace: true,
      });
    },
    [navigate, slot]
  );

  const setMetric = useCallback(
    (value: CpuMetric) => {
      navigate({
        to: '/ethereum/slots/$slot',
        params: { slot: String(slot) },
        search: prev => ({ ...prev, metric: value === 'mean' ? undefined : value }),
        replace: true,
      });
    },
    [navigate, slot]
  );

  // Filter data based on reference nodes toggle
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!referenceNodesOnly) return data;
    return data.filter(
      d => d.node_class === 'eip7870' || extractClusterFromNodeName(d.meta_client_name ?? '') !== null
    );
  }, [data, referenceNodesOnly]);

  // Get unique node names from filtered data
  const nodeNames = useMemo(() => {
    const names = new Set(filteredData.map(d => d.meta_client_name).filter(Boolean) as string[]);
    return Array.from(names).sort();
  }, [filteredData]);

  // Build node → {cl, el} client info map from the data
  const nodeClientInfo = useMemo(() => {
    const info = new Map<string, NodeClientInfo>();
    for (const d of filteredData) {
      const name = d.meta_client_name;
      const clientType = d.client_type?.toLowerCase() ?? '';
      if (!name) continue;

      const existing = info.get(name) ?? { cl: '', el: '' };
      if (CL_CLIENTS.has(clientType) && !existing.cl) {
        existing.cl = clientType;
      } else if (EL_CLIENTS.has(clientType) && !existing.el) {
        existing.el = clientType;
      }
      info.set(name, existing);
    }
    return info;
  }, [filteredData]);

  // Reset selected node if it's no longer in the filtered list
  const effectiveSelectedNode = selectedNode && nodeNames.includes(selectedNode) ? selectedNode : null;

  if (isLoading) {
    return (
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">Node Resources</h3>
          <p className="text-sm text-muted">CPU utilization from observoor eBPF agent</p>
        </div>
        <div className="space-y-3">
          <div className="h-16 animate-shimmer rounded-xs bg-linear-to-r from-border/30 via-surface/50 to-border/30" />
          <div className="h-64 animate-shimmer rounded-xs bg-linear-to-r from-border/30 via-surface/50 to-border/30" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="py-8 text-center">
          <p className="text-muted">Failed to load node resource data: {error.message}</p>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <div className="py-8 text-center">
          <p className="text-muted">No node resource data available for this slot</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Node Resources</h3>
            <p className="text-sm text-muted">CPU utilization across {nodeNames.length} nodes during this slot</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <NodeSelector
              nodes={nodeNames}
              selectedNode={effectiveSelectedNode}
              onChange={setSelectedNode}
              nodeClientInfo={nodeClientInfo}
            />
            {!effectiveSelectedNode && (
              <SelectMenu
                value={metric}
                onChange={setMetric}
                options={METRIC_OPTIONS}
                expandToFit
              />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReferenceNodesOnly(!referenceNodesOnly)}
                className="flex cursor-pointer items-center gap-2"
              >
                <Checkbox checked={referenceNodesOnly} onChange={setReferenceNodesOnly} />
                <span className="text-sm text-foreground">7870 only</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRefNodeInfo(true)}
                className="rounded-xs p-0.5 text-muted transition-colors hover:text-foreground"
                aria-label="Learn more about reference nodes"
              >
                <InformationCircleIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Chart */}
      <CpuUtilizationChart
        data={filteredData}
        selectedNode={effectiveSelectedNode}
        blockPropagationData={blockPropagationData}
        metric={metric}
      />

      <ReferenceNodesInfoDialog open={showRefNodeInfo} onClose={() => setShowRefNodeInfo(false)} />
    </div>
  );
}
