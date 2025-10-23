import { useMemo } from 'react';
import type { FctBlockBlobFirstSeenByNode } from '@/api/types.gen';
import type {
  BlobDataPoint,
  DataAvailabilityRatePoint,
  ContinentalPropagationSeries,
} from '../../components/BlobDataAvailability/BlobDataAvailability.types';

const BLOB_COLORS = ['#06b6d4', '#ec4899', '#f59e0b', '#22c55e', '#8b5cf6', '#ef4444'];

export function useBlobAvailabilityData(blobNodes: FctBlockBlobFirstSeenByNode[]): {
  firstSeenData: BlobDataPoint[];
  availabilityRateData: DataAvailabilityRatePoint[];
  continentalPropagationData: ContinentalPropagationSeries[];
} {
  const firstSeenData = useMemo<BlobDataPoint[]>(() => {
    return blobNodes.map(node => ({
      time: node.seen_slot_start_diff ?? 0,
      blobId: node.blob_index?.toString() ?? '0',
      color: BLOB_COLORS[node.blob_index ?? 0] ?? BLOB_COLORS[0],
    }));
  }, [blobNodes]);

  const availabilityRateData = useMemo<DataAvailabilityRatePoint[]>(() => {
    // Group by time buckets and count unique nodes
    const timeBuckets = new Map<number, Set<string>>();

    blobNodes.forEach(node => {
      const time = node.seen_slot_start_diff ?? 0;
      const bucket = Math.floor(time / 100) * 100; // 100ms buckets

      if (!timeBuckets.has(bucket)) {
        timeBuckets.set(bucket, new Set());
      }
      timeBuckets.get(bucket)!.add(node.node_id ?? '');
    });

    return Array.from(timeBuckets.entries())
      .map(([time, nodeSet]) => ({
        time,
        nodes: nodeSet.size,
      }))
      .sort((a, b) => a.time - b.time);
  }, [blobNodes]);

  const continentalPropagationData = useMemo<ContinentalPropagationSeries[]>(() => {
    // Group by continent
    const continentMap = new Map<string, FctBlockBlobFirstSeenByNode[]>();

    blobNodes.forEach(node => {
      const continent = node.meta_client_geo_continent_code ?? 'Unknown';
      if (!continentMap.has(continent)) {
        continentMap.set(continent, []);
      }
      continentMap.get(continent)!.push(node);
    });

    // Calculate CDF per continent
    const continentColors: Record<string, string> = {
      EU: '#ec4899',
      NA: '#22c55e',
      AS: '#06b6d4',
      OC: '#f59e0b',
      SA: '#8b5cf6',
      AF: '#ef4444',
    };

    return Array.from(continentMap.entries()).map(([continent, nodes]) => {
      const sortedTimes = nodes.map(n => n.seen_slot_start_diff ?? 0).sort((a, b) => a - b);

      const data = sortedTimes.map((time, index) => ({
        time,
        percentage: ((index + 1) / sortedTimes.length) * 100,
      }));

      return {
        continent,
        color: continentColors[continent] ?? '#9ca3af',
        data,
      };
    });
  }, [blobNodes]);

  return {
    firstSeenData,
    availabilityRateData,
    continentalPropagationData,
  };
}
