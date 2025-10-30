import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { Alert } from '@/components/Feedback/Alert';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { getEpochSlotRange } from '@/utils/beacon';

import type { MissedAttestationsBySlotChartProps } from './MissedAttestationsBySlotChart.types';

/**
 * Chart showing missed attestations by entity over the epoch's slots
 *
 * Displays:
 * - Time series of missed attestations per slot for top 10 entities
 * - Line chart with slot numbers on x-axis
 * - Each entity gets a separate line/series
 * - Supports modal popout for expanded view
 */
export function MissedAttestationsBySlotChart({
  epoch,
  missedAttestationsByEntity,
  topEntitiesCount = 10,
  anchorId,
}: MissedAttestationsBySlotChartProps): React.JSX.Element {
  // Calculate which entities to show (top N by total missed)
  const { topEntities, series, minSlot, maxSlot } = useMemo(() => {
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
      return { topEntities: [], series: [], minSlot: 0, maxSlot: 0 };
    }

    // Get slot range for the epoch
    const { firstSlot, lastSlot } = getEpochSlotRange(epoch);

    // Build series data for each entity
    // Create a map of entity -> slot -> count
    const entitySlotMap = new Map<string, Map<number, number>>();
    topEntities.forEach(entity => {
      entitySlotMap.set(entity, new Map());
    });

    missedAttestationsByEntity
      .filter(record => topEntities.includes(record.entity))
      .forEach(record => {
        const slotMap = entitySlotMap.get(record.entity);
        if (slotMap) {
          slotMap.set(record.slot, record.count);
        }
      });

    // Convert to series format for MultiLineChart
    const series = topEntities.map(entity => {
      const slotMap = entitySlotMap.get(entity)!;
      // Create data points for all slots in epoch (fill with 0 if no data)
      const data: Array<[number, number]> = [];
      for (let slot = firstSlot; slot <= lastSlot; slot++) {
        const count = slotMap.get(slot) ?? 0;
        data.push([slot, count]);
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
      minSlot: firstSlot,
      maxSlot: lastSlot,
    };
  }, [epoch, missedAttestationsByEntity, topEntitiesCount]);

  // Calculate total missed for subtitle
  const totalMissed = missedAttestationsByEntity.reduce((sum, record) => sum + record.count, 0);

  // Handle empty state
  if (series.length === 0) {
    return (
      <PopoutCard
        title="Missed Attestations by Entity"
        subtitle="No missed attestations in this epoch"
        anchorId={anchorId}
      >
        {() => <Alert variant="info" title="No Data" description="There were no missed attestations in this epoch." />}
      </PopoutCard>
    );
  }

  return (
    <PopoutCard
      title="Missed Attestations by Entity Over Slots"
      subtitle={`${totalMissed} total missed attestations across ${topEntities.length} entities`}
      anchorId={anchorId}
      modalSize="full"
    >
      {({ inModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{
            type: 'value',
            name: 'Slot',
            min: minSlot,
            max: maxSlot,
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
