import { useMemo } from 'react';
import type { DimClientRelease } from '@/api/types.gen';
import { displayVersion } from '../utils/client-versions';
import { useNodeVersions } from './useNodeVersions';

export interface UseNodesByVersionResult {
  /** Distinct Xatu nodes that reported each version on any day of the window */
  nodesByVersion: Map<string, number>;
  isLoading: boolean;
}

/**
 * Xatu nodes per release of a consensus client over the last `days` UTC days, all history when null. Xatu nodes
 * report only their consensus client, so pass `enabled` false for execution clients.
 */
export function useNodesByVersion(
  client: string,
  releases: DimClientRelease[],
  days: number | null,
  enabled: boolean
): UseNodesByVersionResult {
  const { rows, isLoading } = useNodeVersions(client, days, enabled);
  const nodesByVersion = useMemo(() => {
    const nodeIds = new Map<string, Set<string>>();
    for (const row of rows) {
      const version = displayVersion(row.meta_consensus_version, releases);
      if (!version || !row.node_id) continue;
      nodeIds.set(version, (nodeIds.get(version) ?? new Set()).add(row.node_id));
    }
    return new Map([...nodeIds.entries()].map(([version, ids]) => [version, ids.size]));
  }, [rows, releases]);
  return { nodesByVersion, isLoading };
}
