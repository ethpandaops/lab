import { type JSX, useState, useMemo, useCallback } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Card } from '@/components/Layout/Card';
import { Checkbox } from '@/components/Forms/Checkbox';
import { ReferenceNodesInfoDialog } from '@/pages/ethereum/execution/timings/components/ReferenceNodesInfoDialog';
import { extractClusterFromNodeName } from '@/constants/eip7870';
import { CONSENSUS_CLIENTS_SET, EXECUTION_CLIENTS_SET } from '@/utils/ethereum';
import { intEngineNewPayloadServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type {
  FctBlockFirstSeenByNode,
  FctHeadFirstSeenByNode,
  FctBlockDataColumnSidecarFirstSeenByNode,
} from '@/api/types.gen';
import { useSlotNodeResources } from '../../hooks/useSlotNodeResources';
import { NodeSelector, type NodeClientInfo } from './NodeSelector';
import { CpuUtilizationChart } from './CpuUtilizationChart';
import {
  ANNOTATION_OPTIONS,
  ANNOTATION_COLORS,
  type CpuMetric,
  type AnnotationType,
  type AnnotationEvent,
} from './types';

export type { CpuMetric } from './types';

interface NodeResourcesPanelProps {
  slot: number;
  blockPropagation: FctBlockFirstSeenByNode[];
  headPropagation: FctHeadFirstSeenByNode[];
  dataColumnPropagation: FctBlockDataColumnSidecarFirstSeenByNode[];
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
    () => new Set<AnnotationType>(['slot_phases', 'block', 'head', 'execution', 'data_columns'])
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
        search: { ...search, refNodes: value || undefined },
        replace: true,
        resetScroll: false,
      });
    },
    [navigate, slot, search]
  );

  const setSelectedNode = useCallback(
    (value: string | null) => {
      navigate({
        to: '/ethereum/slots/$slot',
        params: { slot: String(slot) },
        search: { ...search, node: value ?? undefined },
        replace: true,
        resetScroll: false,
      });
    },
    [navigate, slot, search]
  );

  const setMetric = useCallback(
    (value: CpuMetric) => {
      navigate({
        to: '/ethereum/slots/$slot',
        params: { slot: String(slot) },
        search: { ...search, metric: value === 'mean' ? undefined : value },
        replace: true,
        resetScroll: false,
      });
    },
    [navigate, slot, search]
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
      if (CONSENSUS_CLIENTS_SET.has(clientType) && !existing.cl) {
        existing.cl = clientType;
      } else if (EXECUTION_CLIENTS_SET.has(clientType) && !existing.el) {
        existing.el = clientType;
      }
      info.set(name, existing);
    }
    return info;
  }, [filteredData]);

  // Reset selected node if it's no longer in the filtered list
  const effectiveSelectedNode = selectedNode && nodeNames.includes(selectedNode) ? selectedNode : null;

  // Build raw per-node annotation events (chart handles aggregation)
  const annotations = useMemo((): AnnotationEvent[] => {
    const events: AnnotationEvent[] = [];

    for (const p of blockPropagation) {
      if (p.node_id) {
        events.push({ type: 'block', timeMs: p.seen_slot_start_diff ?? 0, nodeName: p.node_id });
      }
    }

    for (const p of headPropagation) {
      if (p.node_id) {
        events.push({ type: 'head', timeMs: p.seen_slot_start_diff ?? 0, nodeName: p.node_id });
      }
    }

    const execItems = executionData?.int_engine_new_payload ?? [];
    for (const e of execItems) {
      if (e.meta_client_name) {
        const slotStartMs = (e.slot_start_date_time ?? 0) * 1000;
        const requestedMs = (e.requested_date_time ?? 0) / 1000;
        const startMs = requestedMs - slotStartMs;
        const durationMs = e.duration_ms ?? 0;
        events.push({
          type: 'execution',
          timeMs: startMs,
          endMs: startMs + durationMs,
          label: `${durationMs.toFixed(0)}ms`,
          nodeName: e.meta_client_name,
        });
      }
    }

    // Data columns: group by node, produce one range event per node
    const colsByNode = new Map<string, number[]>();
    for (const c of dataColumnPropagation) {
      const nid = c.node_id ?? '';
      if (!nid) continue;
      if (!colsByNode.has(nid)) colsByNode.set(nid, []);
      colsByNode.get(nid)!.push(c.seen_slot_start_diff ?? 0);
    }
    for (const [nid, times] of colsByNode) {
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      events.push({
        type: 'data_columns',
        timeMs: minTime,
        endMs: minTime !== maxTime ? maxTime : undefined,
        label: `${times.length} cols`,
        nodeName: nid,
      });
    }

    return events;
  }, [blockPropagation, headPropagation, dataColumnPropagation, executionData]);

  // Which annotation types have data (slot_phases is always available)
  const availableAnnotations = useMemo(() => {
    const types = new Set(annotations.map(a => a.type));
    return ANNOTATION_OPTIONS.filter(o => o.value === 'slot_phases' || types.has(o.value));
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
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Node Resources</h3>
            <p className="text-sm text-muted">
              Data from{' '}
              <a
                href="https://github.com/ethpandaops/observoor"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Observoor
              </a>{' '}
              across {nodeNames.length} nodes
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <NodeSelector
              nodes={nodeNames}
              selectedNode={effectiveSelectedNode}
              onChange={setSelectedNode}
              nodeClientInfo={nodeClientInfo}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReferenceNodesOnly(!referenceNodesOnly)}
                className="flex cursor-pointer items-center gap-2"
              >
                <Checkbox checked={referenceNodesOnly} className="pointer-events-none" />
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
            <span className="text-xs text-muted">Annotations{!effectiveSelectedNode && ' (min–p95)'}:</span>
            {availableAnnotations.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleAnnotation(opt.value)}
                className="flex cursor-pointer items-center gap-1.5"
              >
                <Checkbox checked={enabledAnnotations.has(opt.value)} className="pointer-events-none" />
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: ANNOTATION_COLORS[opt.value] }}
                />
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
        onMetricChange={setMetric}
        slot={slot}
        annotations={annotations}
        enabledAnnotations={enabledAnnotations}
      />

      <ReferenceNodesInfoDialog open={showRefNodeInfo} onClose={() => setShowRefNodeInfo(false)} />
    </div>
  );
}
