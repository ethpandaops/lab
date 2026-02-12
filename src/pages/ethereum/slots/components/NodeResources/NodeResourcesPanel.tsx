import { type JSX, useState, useMemo, useCallback } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Card } from '@/components/Layout/Card';
import { Checkbox } from '@/components/Forms/Checkbox';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { ReferenceNodesInfoDialog } from '@/pages/ethereum/execution/timings/components/ReferenceNodesInfoDialog';
import { extractClusterFromNodeName } from '@/constants/eip7870';
import { intEngineNewPayloadServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type {
  FctBlockFirstSeenByNode,
  FctHeadFirstSeenByNode,
  FctBlockDataColumnSidecarFirstSeenByNode,
} from '@/api/types.gen';
import { useSlotNodeResources } from '../../hooks/useSlotNodeResources';
import { NodeSelector, type NodeClientInfo } from './NodeSelector';
import { CpuUtilizationChart } from './CpuUtilizationChart';
import { ANNOTATION_OPTIONS, type AnnotationType, type AnnotationEvent } from './types';

export type CpuMetric = 'mean' | 'min' | 'max';

const CL_CLIENTS = new Set(['lighthouse', 'lodestar', 'nimbus', 'prysm', 'teku', 'grandine']);
const EL_CLIENTS = new Set(['besu', 'erigon', 'geth', 'nethermind', 'reth']);

interface NodeResourcesPanelProps {
  slot: number;
  blockPropagation: FctBlockFirstSeenByNode[];
  headPropagation: FctHeadFirstSeenByNode[];
  dataColumnPropagation: FctBlockDataColumnSidecarFirstSeenByNode[];
}

const METRIC_OPTIONS = [
  { value: 'mean' as CpuMetric, label: 'Mean' },
  { value: 'min' as CpuMetric, label: 'Min' },
  { value: 'max' as CpuMetric, label: 'Max' },
];

/** Match a CPU node name to propagation node_id (fuzzy matching) */
function nodeMatches(cpuNodeName: string, propNodeId: string): boolean {
  const short = cpuNodeName.split('/').pop() ?? cpuNodeName;
  return propNodeId === short || propNodeId === cpuNodeName || short.includes(propNodeId) || propNodeId.includes(short);
}

export function NodeResourcesPanel({
  slot,
  blockPropagation,
  headPropagation,
  dataColumnPropagation,
}: NodeResourcesPanelProps): JSX.Element {
  const { data, isLoading, error } = useSlotNodeResources(slot);
  const search = useSearch({ from: '/ethereum/slots/$slot' });
  const navigate = useNavigate();
  const [showRefNodeInfo, setShowRefNodeInfo] = useState(false);
  const [enabledAnnotations, setEnabledAnnotations] = useState<Set<AnnotationType>>(
    () => new Set(['block', 'head', 'execution', 'data_columns'])
  );

  // Always fetch execution timing data so the toggle can show availability
  const { data: executionData } = useQuery({
    ...intEngineNewPayloadServiceListOptions({
      query: {
        slot_eq: slot,
        page_size: 10000,
      },
    }),
  });

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

  const toggleAnnotation = useCallback((type: AnnotationType) => {
    setEnabledAnnotations(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

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

  // Build annotations from propagation data
  const annotations = useMemo((): AnnotationEvent[] => {
    const events: AnnotationEvent[] = [];

    if (effectiveSelectedNode) {
      // Single node: show exact events for this node
      for (const p of blockPropagation) {
        if (p.node_id && nodeMatches(effectiveSelectedNode, p.node_id)) {
          events.push({ type: 'block', timeMs: p.seen_slot_start_diff ?? 0, nodeName: effectiveSelectedNode });
          break;
        }
      }

      for (const p of headPropagation) {
        if (p.node_id && nodeMatches(effectiveSelectedNode, p.node_id)) {
          events.push({ type: 'head', timeMs: p.seen_slot_start_diff ?? 0, nodeName: effectiveSelectedNode });
          break;
        }
      }

      // Execution timing for this node
      const execItems = executionData?.int_engine_new_payload ?? [];
      for (const e of execItems) {
        if (e.meta_client_name && nodeMatches(effectiveSelectedNode, e.meta_client_name)) {
          const slotStartMs = (e.slot_start_date_time ?? 0) * 1000;
          const requestedMs = (e.requested_date_time ?? 0) / 1000;
          const startMs = requestedMs - slotStartMs;
          const durationMs = e.duration_ms ?? 0;
          events.push({
            type: 'execution',
            timeMs: startMs,
            endMs: startMs + durationMs,
            label: `${durationMs.toFixed(0)}ms`,
            nodeName: effectiveSelectedNode,
          });
          break;
        }
      }

      // Data columns: range from first to last column seen
      const nodeColumns = dataColumnPropagation.filter(p => p.node_id && nodeMatches(effectiveSelectedNode, p.node_id));
      if (nodeColumns.length > 0) {
        const times = nodeColumns.map(c => c.seen_slot_start_diff ?? 0);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        events.push({
          type: 'data_columns',
          timeMs: minTime,
          endMs: minTime !== maxTime ? maxTime : undefined,
          label: `${nodeColumns.length} cols`,
          nodeName: effectiveSelectedNode,
        });
      }
    } else {
      // Aggregate: show p50 for block/head, nothing for execution/data_columns
      const blockTimes = blockPropagation.map(p => p.seen_slot_start_diff ?? 0).sort((a, b) => a - b);
      if (blockTimes.length > 0) {
        events.push({ type: 'block', timeMs: blockTimes[Math.floor(blockTimes.length * 0.5)], label: 'p50' });
      }

      const headTimes = headPropagation.map(p => p.seen_slot_start_diff ?? 0).sort((a, b) => a - b);
      if (headTimes.length > 0) {
        events.push({ type: 'head', timeMs: headTimes[Math.floor(headTimes.length * 0.5)], label: 'p50' });
      }

      // Data columns aggregate: p50 of first-seen, p50 of last-seen
      if (dataColumnPropagation.length > 0) {
        const byNode = new Map<string, number[]>();
        for (const c of dataColumnPropagation) {
          const nid = c.node_id ?? '';
          if (!byNode.has(nid)) byNode.set(nid, []);
          byNode.get(nid)!.push(c.seen_slot_start_diff ?? 0);
        }
        const firstTimes: number[] = [];
        const lastTimes: number[] = [];
        for (const times of byNode.values()) {
          firstTimes.push(Math.min(...times));
          lastTimes.push(Math.max(...times));
        }
        firstTimes.sort((a, b) => a - b);
        lastTimes.sort((a, b) => a - b);
        const firstP50 = firstTimes[Math.floor(firstTimes.length * 0.5)];
        const lastP50 = lastTimes[Math.floor(lastTimes.length * 0.5)];
        events.push({
          type: 'data_columns',
          timeMs: firstP50,
          endMs: firstP50 !== lastP50 ? lastP50 : undefined,
          label: 'p50',
        });
      }
    }

    return events;
  }, [effectiveSelectedNode, blockPropagation, headPropagation, dataColumnPropagation, executionData]);

  // Which annotation types have data
  const availableAnnotations = useMemo(() => {
    const types = new Set(annotations.map(a => a.type));
    return ANNOTATION_OPTIONS.filter(o => types.has(o.value));
  }, [annotations]);

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
              <SelectMenu value={metric} onChange={setMetric} options={METRIC_OPTIONS} expandToFit />
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

        {/* Annotation toggles */}
        {availableAnnotations.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <span className="text-xs text-muted">Annotations:</span>
            {availableAnnotations.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleAnnotation(opt.value)}
                className="flex cursor-pointer items-center gap-1.5"
              >
                <Checkbox checked={enabledAnnotations.has(opt.value)} onChange={() => toggleAnnotation(opt.value)} />
                <span className="text-xs text-foreground">{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Chart */}
      <CpuUtilizationChart
        data={filteredData}
        selectedNode={effectiveSelectedNode}
        metric={metric}
        slot={slot}
        annotations={annotations}
        enabledAnnotations={enabledAnnotations}
      />

      <ReferenceNodesInfoDialog open={showRefNodeInfo} onClose={() => setShowRefNodeInfo(false)} />
    </div>
  );
}
