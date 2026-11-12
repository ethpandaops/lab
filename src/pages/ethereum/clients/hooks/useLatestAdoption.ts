import { useMemo } from 'react';
import type { DimClientRelease } from '@/api/types.gen';
import { last24hStart, latestAdoption, type LatestAdoption } from '@/pages/ethereum/clients/utils/client-versions';
import { useVersionCounts } from './useVersionCounts';

/**
 * Per client, over the last 24 hours of blocks (an entity's when one is given): the share of blocks with a known
 * release on its latest release or newer, and how many of its blocks have a known release.
 */
export function useLatestAdoption(
  latest: Map<string, DimClientRelease>,
  entity?: string
): {
  adoption: Map<string, LatestAdoption>;
  isLoading: boolean;
} {
  const from = useMemo(() => last24hStart(), []);
  const { rows, isLoading } = useVersionCounts({ grain: entity ? 'entity-hourly' : 'hourly', entity, from });
  const adoption = useMemo(() => latestAdoption(rows, latest), [rows, latest]);
  return { adoption, isLoading };
}
