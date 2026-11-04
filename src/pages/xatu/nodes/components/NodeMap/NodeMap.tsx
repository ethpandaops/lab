import { type JSX, useMemo } from 'react';
import { Map2DChart } from '@/components/Charts/Map2D';
import type { PointData } from '@/components/Charts/Map2D/Map2D.types';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import type { NodeRow } from '../../hooks/useNodeRows';

export interface NodeMapProps {
  rows: NodeRow[];
}

/**
 * Node locations, one point per city sized by node count. Only the last 24 hours' active rows carry a location.
 */
export function NodeMap({ rows }: NodeMapProps): JSX.Element {
  const points = useMemo(() => {
    const byLocation = new Map<string, PointData>();

    rows.forEach(({ node, nodeId }) => {
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
      }
      byLocation.get(key)!.nodes!.push({
        nodeId,
        username: node.username,
        client: node.meta_consensus_implementation,
        country: node.meta_client_geo_country,
      });
    });

    return [...byLocation.values()].map(point => ({ ...point, value: point.nodes!.length }));
  }, [rows]);

  return (
    <PopoutCard title="Xatu node locations" subtitle="Last 24h" anchorId="node-map" modalSize="full">
      {({ inModal }) => (
        <div style={{ height: inModal ? 720 : 440 }}>
          <Map2DChart points={points} height={inModal ? 720 : 440} pointSizeMultiplier={3} />
        </div>
      )}
    </PopoutCard>
  );
}
