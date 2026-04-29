import { type JSX, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import type { FctNodeCpuUtilizationHourly, FctNodeMemoryUsageHourly } from '@/api/types.gen';
import { formatBytes } from '../utils';

interface NodeSummary {
  name: string;
  avgCpuPct: number;
  avgRssBytes: number;
  dataPoints: number;
}

interface NodeTableProps {
  cpuData: FctNodeCpuUtilizationHourly[];
  memoryData: FctNodeMemoryUsageHourly[];
}

export function NodeTable({ cpuData, memoryData }: NodeTableProps): JSX.Element {
  const nodes = useMemo(() => {
    // Build CPU summary per node (use last data point as "latest")
    const cpuByNode = new Map<string, { sum: number; count: number }>();
    for (const row of cpuData) {
      const name = row.meta_client_name ?? 'unknown';
      const entry = cpuByNode.get(name) ?? { sum: 0, count: 0 };
      entry.sum += row.avg_core_pct ?? 0;
      entry.count += 1;
      cpuByNode.set(name, entry);
    }

    // Build memory summary per node
    const memByNode = new Map<string, { sum: number; count: number }>();
    for (const row of memoryData) {
      const name = row.meta_client_name ?? 'unknown';
      const entry = memByNode.get(name) ?? { sum: 0, count: 0 };
      entry.sum += row.avg_vm_rss_bytes ?? 0;
      entry.count += 1;
      memByNode.set(name, entry);
    }

    // Merge
    const allNames = new Set([...cpuByNode.keys(), ...memByNode.keys()]);
    const summaries: NodeSummary[] = [];
    for (const name of allNames) {
      const cpu = cpuByNode.get(name);
      const mem = memByNode.get(name);
      summaries.push({
        name,
        avgCpuPct: cpu ? cpu.sum / cpu.count : 0,
        avgRssBytes: mem ? mem.sum / mem.count : 0,
        dataPoints: (cpu?.count ?? 0) + (mem?.count ?? 0),
      });
    }

    // Sort by name
    summaries.sort((a, b) => a.name.localeCompare(b.name));
    return summaries;
  }, [cpuData, memoryData]);

  if (nodes.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-surface p-8 text-center text-muted">
        No nodes found for the selected time period.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-sm border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface/50">
            <th className="px-4 py-3 text-left font-medium text-muted">Node</th>
            <th className="px-4 py-3 text-right font-medium text-muted">Avg CPU %</th>
            <th className="px-4 py-3 text-right font-medium text-muted">Avg RSS</th>
            <th className="px-4 py-3 text-right font-medium text-muted">Data Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {nodes.map(node => (
            <tr key={node.name} className="transition-colors hover:bg-primary/5">
              <td className="px-4 py-3">
                <Link
                  to="/xatu/nodes/$id"
                  params={{ id: encodeURIComponent(node.name) }}
                  className="font-medium text-primary hover:underline"
                >
                  {node.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-right text-foreground tabular-nums">{node.avgCpuPct.toFixed(1)}%</td>
              <td className="px-4 py-3 text-right text-foreground tabular-nums">{formatBytes(node.avgRssBytes, 1)}</td>
              <td className="px-4 py-3 text-right text-muted tabular-nums">{node.dataPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
