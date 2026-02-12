import { type JSX, useState, useMemo, useCallback } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Card } from '@/components/Layout/Card';
import { Checkbox } from '@/components/Forms/Checkbox';
import { ReferenceNodesInfoDialog } from '@/pages/ethereum/execution/timings/components/ReferenceNodesInfoDialog';
import { extractClusterFromNodeName } from '@/constants/eip7870';
import { CONSENSUS_CLIENTS_SET, EXECUTION_CLIENTS_SET, getClientLayer } from '@/utils/ethereum';
import { intEngineNewPayloadServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type {
  FctBlockFirstSeenByNode,
  FctHeadFirstSeenByNode,
  FctBlockDataColumnSidecarFirstSeenByNode,
} from '@/api/types.gen';
import { useSlotNodeResources } from '../../hooks/useSlotNodeResources';
import { useSlotNodeMemory } from '../../hooks/useSlotNodeMemory';
import { useSlotNodeDiskIo } from '../../hooks/useSlotNodeDiskIo';
import { useSlotNodeNetworkIo } from '../../hooks/useSlotNodeNetworkIo';
import { NodeSelector, type NodeClientInfo } from './NodeSelector';
import { CpuUtilizationChart } from './CpuUtilizationChart';
import { MemoryUsageChart } from './MemoryUsageChart';
import { DiskIoChart } from './DiskIoChart';
import { NetworkIoChart } from './NetworkIoChart';
import {
  ANNOTATION_OPTIONS,
  ANNOTATION_COLORS,
  type CpuMetric,
  type MemoryMetric,
  type AnnotationType,
  type AnnotationEvent,
} from './types';

export type { CpuMetric } from './types';

function nodeMatches(cpuNodeName: string, eventNodeName: string): boolean {
  const short = cpuNodeName.split('/').pop() ?? cpuNodeName;
  return (
    eventNodeName === short ||
    eventNodeName === cpuNodeName ||
    short.includes(eventNodeName) ||
    eventNodeName.includes(short)
  );
}

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
  const { data: cpuData, isLoading: cpuLoading, error: cpuError } = useSlotNodeResources(slot);
  const { data: memoryData } = useSlotNodeMemory(slot);
  const { data: diskData } = useSlotNodeDiskIo(slot);
  const { data: networkData } = useSlotNodeNetworkIo(slot);

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
  const memMetric: MemoryMetric = search.memMetric ?? 'vm_rss';

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

  const setMemMetric = useCallback(
    (value: MemoryMetric) => {
      navigate({
        to: '/ethereum/slots/$slot',
        params: { slot: String(slot) },
        search: { ...search, memMetric: value === 'vm_rss' ? undefined : value },
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

  // Filter CPU data based on reference nodes toggle
  const filteredCpuData = useMemo(() => {
    if (!cpuData) return [];
    if (!referenceNodesOnly) return cpuData;
    return cpuData.filter(
      d => d.node_class === 'eip7870' || extractClusterFromNodeName(d.meta_client_name ?? '') !== null
    );
  }, [cpuData, referenceNodesOnly]);

  const filteredMemoryData = useMemo(() => {
    if (!memoryData) return [];
    if (!referenceNodesOnly) return memoryData;
    return memoryData.filter(
      d => d.node_class === 'eip7870' || extractClusterFromNodeName(d.meta_client_name ?? '') !== null
    );
  }, [memoryData, referenceNodesOnly]);

  const filteredDiskData = useMemo(() => {
    if (!diskData) return [];
    if (!referenceNodesOnly) return diskData;
    return diskData.filter(
      d => d.node_class === 'eip7870' || extractClusterFromNodeName(d.meta_client_name ?? '') !== null
    );
  }, [diskData, referenceNodesOnly]);

  const filteredNetworkData = useMemo(() => {
    if (!networkData) return [];
    if (!referenceNodesOnly) return networkData;
    return networkData.filter(
      d => d.node_class === 'eip7870' || extractClusterFromNodeName(d.meta_client_name ?? '') !== null
    );
  }, [networkData, referenceNodesOnly]);

  // Get unique node names from CPU data (primary source for node selector)
  const nodeNames = useMemo(() => {
    const names = new Set(filteredCpuData.map(d => d.meta_client_name).filter(Boolean) as string[]);
    return Array.from(names).sort();
  }, [filteredCpuData]);

  // Build node → {cl, el} client info map from the CPU data
  const nodeClientInfo = useMemo(() => {
    const info = new Map<string, NodeClientInfo>();
    for (const d of filteredCpuData) {
      const name = d.meta_client_name;
      const clientType = d.client_type?.toLowerCase() ?? '';
      if (!name) continue;

      const existing = info.get(name) ?? { cl: '', el: '' };
      const layer = getClientLayer(clientType);

      if ((CONSENSUS_CLIENTS_SET.has(clientType) || layer === 'CL') && !existing.cl) {
        existing.cl = clientType;
      } else if ((EXECUTION_CLIENTS_SET.has(clientType) || layer === 'EL') && !existing.el) {
        existing.el = clientType;
      }
      info.set(name, existing);
    }
    return info;
  }, [filteredCpuData]);

  // Reset selected node if it's no longer in the filtered list
  const effectiveSelectedNode = selectedNode && nodeNames.includes(selectedNode) ? selectedNode : null;

  // Build raw per-node annotation events (chart handles aggregation)
  const annotations = useMemo((): AnnotationEvent[] => {
    const events: AnnotationEvent[] = [];
    const filteredNodeSet = new Set(nodeNames);
    const isIncludedNode = (nodeName: string): boolean => {
      if (filteredNodeSet.has(nodeName)) return true;
      for (const filteredNodeName of filteredNodeSet) {
        if (nodeMatches(filteredNodeName, nodeName)) return true;
      }
      return false;
    };

    for (const p of blockPropagation) {
      const nodeName = p.meta_client_name ?? p.node_id;
      if (nodeName && isIncludedNode(nodeName)) {
        events.push({ type: 'block', timeMs: p.seen_slot_start_diff ?? 0, nodeName });
      }
    }

    for (const p of headPropagation) {
      const nodeName = p.meta_client_name ?? p.node_id;
      if (nodeName && isIncludedNode(nodeName)) {
        events.push({ type: 'head', timeMs: p.seen_slot_start_diff ?? 0, nodeName });
      }
    }

    const execItems = executionData?.int_engine_new_payload ?? [];
    for (const e of execItems) {
      if (e.meta_client_name && isIncludedNode(e.meta_client_name)) {
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
      const nid = c.meta_client_name ?? c.node_id ?? '';
      if (!nid) continue;
      if (!isIncludedNode(nid)) continue;
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
  }, [blockPropagation, headPropagation, dataColumnPropagation, executionData, nodeNames]);

  // Which annotation types have data (slot_phases is always available)
  const availableAnnotations = useMemo(() => {
    const types = new Set(annotations.map(a => a.type));
    return ANNOTATION_OPTIONS.filter(o => o.value === 'slot_phases' || types.has(o.value));
  }, [annotations]);

  if (cpuLoading) {
    return (
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">Node Resources</h3>
          <p className="text-sm text-muted">Resource metrics from observoor eBPF agent</p>
        </div>
        <div className="space-y-3">
          <div className="h-16 animate-shimmer rounded-xs bg-linear-to-r from-border/30 via-surface/50 to-border/30" />
          <div className="h-64 animate-shimmer rounded-xs bg-linear-to-r from-border/30 via-surface/50 to-border/30" />
        </div>
      </Card>
    );
  }

  if (cpuError) {
    return (
      <Card>
        <div className="py-8 text-center">
          <p className="text-muted">Failed to load node resource data: {cpuError.message}</p>
        </div>
      </Card>
    );
  }

  if (!cpuData || cpuData.length === 0) {
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
            <span className="text-xs text-muted">Annotations{!effectiveSelectedNode && ' (min\u2013p95)'}:</span>
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

      {/* Charts – 2 per row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CpuUtilizationChart
          data={filteredCpuData}
          selectedNode={effectiveSelectedNode}
          metric={metric}
          onMetricChange={setMetric}
          slot={slot}
          annotations={annotations}
          enabledAnnotations={enabledAnnotations}
        />
        <MemoryUsageChart
          data={filteredMemoryData}
          selectedNode={effectiveSelectedNode}
          metric={memMetric}
          onMetricChange={setMemMetric}
          slot={slot}
          annotations={annotations}
          enabledAnnotations={enabledAnnotations}
        />
        <DiskIoChart
          data={filteredDiskData}
          selectedNode={effectiveSelectedNode}
          slot={slot}
          annotations={annotations}
          enabledAnnotations={enabledAnnotations}
        />
        <NetworkIoChart
          data={filteredNetworkData}
          selectedNode={effectiveSelectedNode}
          slot={slot}
          annotations={annotations}
          enabledAnnotations={enabledAnnotations}
        />
      </div>

      <ReferenceNodesInfoDialog open={showRefNodeInfo} onClose={() => setShowRefNodeInfo(false)} />
    </div>
  );
}
