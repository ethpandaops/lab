import { type JSX, useMemo } from 'react';
import { Map2DChart } from '@/components/Charts/Map2D';
import type { PointData } from '@/components/Charts/Map2D/Map2D.types';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { getDataVizColors } from '@/utils';
import type { NodeRow } from '../../hooks/useNodeRows';
import { getArrivalTier, median } from '../../utils/node-stats';
import { ArrivalLegend } from '../ArrivalLegend';

export interface NodeMapProps {
  rows: NodeRow[];
  /** Changes when the network window moves, so the map redraws its points */
  resetKey?: number;
}

/**
 * Node locations, one point per city sized by node count and coloured by the city's median block arrival.
 */
export function NodeMap({ rows, resetKey }: NodeMapProps): JSX.Element {
  const points = useMemo(() => {
    const { PERFORMANCE_TIME_COLORS } = getDataVizColors();
    const byLocation = new Map<string, { point: PointData; timings: number[] }>();

    rows.forEach(({ node, nodeId, observation }) => {
      const { meta_client_geo_latitude: lat, meta_client_geo_longitude: lon } = node;
      const timing = observation?.blockP50 ?? null;
      if (lat == null || lon == null || timing === null) return;
      const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
      if (!byLocation.has(key)) {
        byLocation.set(key, {
          point: {
            name: node.meta_client_geo_city || node.meta_client_geo_country || 'Unknown',
            coords: [lon, lat],
            nodes: [],
          },
          timings: [],
        });
      }
      const entry = byLocation.get(key)!;
      entry.point.nodes!.push({
        nodeId,
        username: node.username,
        timing: Math.round(timing),
        client: node.meta_consensus_implementation,
        country: node.meta_client_geo_country,
      });
      entry.timings.push(timing);
    });

    return [...byLocation.values()].map(({ point, timings }) => ({
      ...point,
      value: point.nodes!.length,
      color: PERFORMANCE_TIME_COLORS[getArrivalTier(median(timings)!)],
    }));
  }, [rows]);

  return (
    <PopoutCard
      title="Node locations"
      subtitle="Median block arrival per city, last 24h"
      anchorId="node-map"
      modalSize="full"
      headerActions={<ArrivalLegend className="hidden lg:flex" />}
    >
      {({ inModal }) => (
        <div style={{ height: inModal ? 720 : 440 }}>
          <Map2DChart points={points} height={inModal ? 720 : 440} pointSizeMultiplier={3} resetKey={resetKey} />
        </div>
      )}
    </PopoutCard>
  );
}
