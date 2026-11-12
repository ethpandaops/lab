import { type JSX, useMemo } from 'react';
import { Map2DChart } from '@/components/Charts/Map2D';
import type { PointData } from '@/components/Charts/Map2D/Map2D.types';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import type { NodeRow } from '@/pages/xatu/nodes/hooks/useNodeRows';

export interface NodeMapProps {
  rows: NodeRow[];
  /** The range the rows cover, e.g. "Last 7d" */
  rangeLabel: string;
}

/**
 * Xatu node locations, one point per city sized by its Xatu nodes. Every Xatu node that reported in the range carries its latest location.
 */
export function NodeMap({ rows, rangeLabel }: NodeMapProps): JSX.Element {
  const points = useMemo(() => {
    const byLocation = new Map<string, PointData>();
    // Points are sized by Xatu nodes, not by their rotating node IDs
    const xatuNodesAt = new Map<string, Set<string>>();

    rows.forEach(({ node, nodeId, xatuNode }) => {
      const { meta_client_geo_latitude: lat, meta_client_geo_longitude: lon } = node;
      // 0,0 is the geo lookup's fallback for a node it couldn't place
      if (lat == null || lon == null || (lat === 0 && lon === 0)) return;
      const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
      if (!byLocation.has(key)) {
        byLocation.set(key, {
          name: node.meta_client_geo_city || node.meta_client_geo_country || 'Unknown',
          coords: [lon, lat],
          nodes: [],
        });
        xatuNodesAt.set(key, new Set());
      }
      byLocation.get(key)!.nodes!.push({
        nodeId,
        username: node.username,
        client: node.meta_consensus_implementation,
        country: node.meta_client_geo_country,
      });
      xatuNodesAt.get(key)!.add(xatuNode);
    });

    return [...byLocation.entries()].map(([key, point]) => ({ ...point, value: xatuNodesAt.get(key)!.size }));
  }, [rows]);

  return (
    <PopoutCard title="Xatu node locations" subtitle={rangeLabel} anchorId="node-map" modalSize="full">
      {({ inModal }) => (
        <div className={inModal ? 'h-180' : 'h-110'}>
          <Map2DChart
            points={points}
            height={inModal ? 720 : 440}
            pointSizeMultiplier={3}
            // The chart keeps every point it has seen; a new range or contributor replaces them
            resetKey={points.map(point => `${point.coords}:${point.value}`).join('|')}
          />
        </div>
      )}
    </PopoutCard>
  );
}
