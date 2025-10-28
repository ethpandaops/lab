import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { Alert } from '@/components/Feedback/Alert';
import { PopoutCard } from '@/components/Layout/PopoutCard';

import type { MissedAttestationsByEpochChartProps } from './MissedAttestationsByEpochChart.types';

/**
 * Chart showing missed attestations by entity across epochs
 *
 * Displays:
 * - Time series of missed attestations per epoch for top 10 entities
 * - Line chart with epoch numbers on x-axis
 * - Each entity gets a separate line/series
 * - Supports modal popout for expanded view
 */
export function MissedAttestationsByEpochChart({
  missedAttestationsByEntity,
  topEntitiesCount = 10,
  anchorId,
  epochRange,
}: MissedAttestationsByEpochChartProps): React.JSX.Element {
  // Calculate which entities to show (top N by total missed)
  const { topEntities, series, minEpoch, maxEpoch } = useMemo(() => {
    // Aggregate total missed attestations per entity
    const entityTotals = new Map<string, number>();
    missedAttestationsByEntity.forEach(record => {
      const current = entityTotals.get(record.entity) ?? 0;
      entityTotals.set(record.entity, current + record.count);
    });

    // Get top N entities
    const topEntities = Array.from(entityTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topEntitiesCount)
      .map(([entity]) => entity);

    // If no entities, return empty
    if (topEntities.length === 0) {
      return { topEntities: [], series: [], minEpoch: 0, maxEpoch: 0 };
    }

    // Get epoch range - use provided range or fall back to data range
    let minEpoch: number;
    let maxEpoch: number;
    if (epochRange) {
      minEpoch = epochRange.min;
      maxEpoch = epochRange.max;
    } else {
      const epochs = [...new Set(missedAttestationsByEntity.map(r => r.epoch))].sort((a, b) => a - b);
      minEpoch = epochs[0];
      maxEpoch = epochs[epochs.length - 1];
    }

    // Build series data for each entity
    // Create a map of entity -> epoch -> count
    const entityEpochMap = new Map<string, Map<number, number>>();
    topEntities.forEach(entity => {
      entityEpochMap.set(entity, new Map());
    });

    missedAttestationsByEntity
      .filter(record => topEntities.includes(record.entity))
      .forEach(record => {
        const epochMap = entityEpochMap.get(record.entity);
        if (epochMap) {
          epochMap.set(record.epoch, record.count);
        }
      });

    // Convert to series format for MultiLineChart
    const series = topEntities.map(entity => {
      const epochMap = entityEpochMap.get(entity)!;
      // Create data points for all epochs (fill with 0 if no data)
      const data: Array<[number, number]> = [];
      for (let epoch = minEpoch; epoch <= maxEpoch; epoch++) {
        const count = epochMap.get(epoch) ?? 0;
        data.push([epoch, count]);
      }

      return {
        name: entity,
        data,
        showSymbol: false, // Don't show symbols for cleaner lines
      };
    });

    return {
      topEntities,
      series,
      minEpoch,
      maxEpoch,
    };
  }, [missedAttestationsByEntity, topEntitiesCount, epochRange]);

  // Calculate total missed for subtitle
  const totalMissed = missedAttestationsByEntity.reduce((sum, record) => sum + record.count, 0);

  // Handle empty state
  if (series.length === 0) {
    return (
      <PopoutCard
        title="Offline Validators"
        subtitle="No offline validators detected in these epochs"
        anchorId={anchorId}
      >
        {() => (
          <Alert
            variant="info"
            title="No Data"
            description="There were no offline validators detected in these epochs."
          />
        )}
      </PopoutCard>
    );
  }

  return (
    <PopoutCard
      title="Offline Validators"
      subtitle={`${totalMissed} total missed attestations across ${topEntities.length} entities`}
      anchorId={anchorId}
      modalSize="full"
    >
      {({ inModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{
            type: 'value',
            name: 'Epoch',
            min: minEpoch,
            max: maxEpoch,
          }}
          yAxis={{
            name: 'Missed',
          }}
          height={inModal ? 600 : 400}
          showLegend={true}
          enableDataZoom={true}
          animationDuration={300}
        />
      )}
    </PopoutCard>
  );
}
