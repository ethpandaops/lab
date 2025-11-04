import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { AttestationArrivalsChartProps } from './AttestationArrivalsChart.types';
import type { SeriesData } from '@/components/Charts/MultiLine/MultiLine.types';

/**
 * AttestationArrivalsChart - Visualizes attestation arrival rate by block root voted for
 *
 * Shows attestations grouped by the block root they voted for over the slot timeline.
 * Each line represents attestations voting for a different block, showing when they arrived.
 *
 * @example
 * ```tsx
 * <AttestationArrivalsChart
 *   attestationData={attestations}
 *   currentSlot={12345}
 *   votedForBlocks={blocks}
 *   totalExpectedValidators={512}
 * />
 * ```
 */
export function AttestationArrivalsChart({
  attestationData,
  currentSlot,
  votedForBlocks,
  totalExpectedValidators,
}: AttestationArrivalsChartProps): JSX.Element {
  // Create a map of block_root -> slot for quick lookup
  const blockSlotMap = useMemo(() => {
    const map = new Map<string, number>();
    votedForBlocks.forEach(block => {
      if (block.block_root && block.slot !== undefined) {
        map.set(block.block_root, block.slot);
      }
    });
    return map;
  }, [votedForBlocks]);

  // Group attestations by block_root and time chunk
  const { series, labels, totalReceived } = useMemo(() => {
    // Create array of all possible time points (0-12000ms in 50ms increments = 241 points)
    const timePoints = Array.from({ length: 241 }, (_, i) => i * 50);

    // Group by block_root, then by time
    const blockGroups = new Map<string, Map<number, number>>();

    let total = 0;

    attestationData.forEach(point => {
      const blockRoot = point.block_root;
      if (!blockRoot) return;

      const time = point.chunk_slot_start_diff ?? 0;
      const count = point.attestation_count ?? 0;
      total += count;

      // Get or create the time map for this block root
      let timeMap = blockGroups.get(blockRoot);
      if (!timeMap) {
        timeMap = new Map<number, number>();
        blockGroups.set(blockRoot, timeMap);
      }

      // Set the count for this time point
      timeMap.set(time, count);
    });

    // Create labels for time axis, but only show every second (every 20th point)
    // Empty string for points we don't want to show labels for
    const timeLabels = timePoints.map((time, index) => {
      // Show label every 1000ms (20 points * 50ms = 1000ms)
      if (index % 20 === 0) {
        return (time / 1000).toFixed(0);
      }
      return '';
    });

    // Create series for each block root
    const chartSeries: SeriesData[] = [];

    blockGroups.forEach((timeMap, blockRoot) => {
      // Get the slot for this block
      const blockSlot = blockSlotMap.get(blockRoot) ?? currentSlot;
      const distance = currentSlot - blockSlot;

      // Create data array aligned with timePoints, fill with 0 for missing data
      const data = timePoints.map(time => timeMap.get(time) ?? 0);

      // Create a label for this series
      const label = distance === 0 ? 'Current Block (HEAD)' : `Slot ${blockSlot} (-${distance})`;

      chartSeries.push({
        name: label,
        data,
        showArea: true,
        smooth: false,
      });
    });

    // Sort series so current block is first, then by distance (ascending)
    chartSeries.sort((a, b) => {
      const aIsCurrent = a.name.includes('Current');
      const bIsCurrent = b.name.includes('Current');
      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;

      // Extract distance from name for sorting
      const getDistance = (name: string) => {
        const match = name.match(/-(\d+)\)/);
        return match ? parseInt(match[1], 10) : 0;
      };
      return getDistance(a.name) - getDistance(b.name);
    });

    return {
      series: chartSeries,
      labels: timeLabels,
      totalReceived: total,
    };
  }, [attestationData, currentSlot, blockSlotMap]);

  // Format participation message
  const participationMessage = useMemo(() => {
    if (!totalExpectedValidators) {
      return `${totalReceived.toLocaleString()} attestations received`;
    }
    const percentage = ((totalReceived / totalExpectedValidators) * 100).toFixed(1);
    return `${totalReceived.toLocaleString()} / ${totalExpectedValidators.toLocaleString()} attestations (${percentage}%)`;
  }, [totalReceived, totalExpectedValidators]);

  // Handle empty data
  if (attestationData.length === 0 || series.length === 0) {
    return (
      <PopoutCard title="Attestation Arrivals by Block Vote" anchorId="attestation-arrivals" modalSize="xl">
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex h-96 items-center justify-center text-muted'
                : 'flex h-64 items-center justify-center text-muted'
            }
          >
            <p>No attestation data available</p>
          </div>
        )}
      </PopoutCard>
    );
  }

  return (
    <PopoutCard
      title="Attestation Arrivals by Block Vote"
      anchorId="attestation-arrivals"
      subtitle={participationMessage}
      modalSize="fullscreen"
      modalDescription="Shows when attestations arrived during the slot, grouped by which block they voted for. Each line represents votes for a different block at varying distances from the current slot."
    >
      {({ inModal }) => (
        <div className={inModal ? 'h-[calc(100vh-12rem)]' : 'h-80'}>
          <MultiLineChart
            series={series}
            xAxis={{
              type: 'category',
              labels,
              name: 'Slot Time (s)',
            }}
            yAxis={{
              name: 'Attestation Count',
            }}
            height="100%"
            animationDuration={150}
            showLegend
            useNativeLegend
            syncGroup="slot-time"
            grid={{
              top: 40,
              right: 20,
              bottom: 60,
              left: 60,
            }}
          />
        </div>
      )}
    </PopoutCard>
  );
}
