import { useMemo } from 'react';
import type { DimClientRelease } from '@/api/types.gen';
import { compareVersions } from '@/utils/version';
import { last24hStart } from '../utils/client-versions';
import { useVersionCounts } from './useVersionCounts';

/**
 * Per client, the share of its resolved blocks in the last 24 hours on its latest release or newer (0-100), from
 * an entity's blocks when one is given. Clients without resolved blocks or a known latest release are left out.
 */
export function useLatestAdoption(
  latest: Map<string, DimClientRelease>,
  entity?: string
): {
  adoption: Map<string, number>;
  isLoading: boolean;
} {
  const from = useMemo(() => last24hStart(), []);
  const { rows, isLoading } = useVersionCounts({ grain: entity ? 'entity-hourly' : 'hourly', entity, from });
  const adoption = useMemo(() => {
    const totals = new Map<string, { resolved: number; onLatest: number }>();
    for (const row of rows) {
      if (!row.client || !row.version) continue;
      const entry = totals.get(row.client) ?? { resolved: 0, onLatest: 0 };
      entry.resolved += row.count;
      const release = latest.get(row.client)?.version;
      if (release && compareVersions(row.version, release) >= 0) entry.onLatest += row.count;
      totals.set(row.client, entry);
    }
    const shares = new Map<string, number>();
    for (const [client, entry] of totals) {
      if (entry.resolved > 0 && latest.has(client)) shares.set(client, (entry.onLatest / entry.resolved) * 100);
    }
    return shares;
  }, [rows, latest]);
  return { adoption, isLoading };
}
