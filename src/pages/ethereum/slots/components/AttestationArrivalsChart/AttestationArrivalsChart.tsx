import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { AttestationArrivalsChartProps } from './AttestationArrivalsChart.types';
import type { SeriesData } from '@/components/Charts/MultiLine/MultiLine.types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ATTESTATION_DEADLINE_MS, formatSlot } from '@/utils';

/** Width of the attestation arrival buckets in fct_attestation_first_seen_chunked_50ms */
const CHUNK_MS = 50;

/**
 * AttestationArrivalsChart - Visualizes attestation arrival rate by block root voted for
 *
 * Attestations arriving per 50ms across the slot, one series per block they voted for. Votes for
 * this block are the filled area; votes for an older block (a missed head) are drawn in warning and
 * danger so they stand out against it.
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
  title = 'Attestation Arrivals by Block Vote',
  anchorId = 'attestation-arrivals',
}: AttestationArrivalsChartProps): JSX.Element {
  const themeColors = useThemeColors();
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

  // One series per block voted for, as [seconds into the slot, attestations in that 50ms chunk]
  const { series, totalReceived } = useMemo(() => {
    const blockGroups = new Map<string, Map<number, number>>();
    let total = 0;

    attestationData.forEach(point => {
      if (!point.block_root) return;
      const count = point.attestation_count ?? 0;
      total += count;
      let timeMap = blockGroups.get(point.block_root);
      if (!timeMap) blockGroups.set(point.block_root, (timeMap = new Map()));
      const time = point.chunk_slot_start_diff ?? 0;
      timeMap.set(time, (timeMap.get(time) ?? 0) + count);
    });

    const votes = [...blockGroups.entries()].map(([blockRoot, timeMap]) => {
      const blockSlot = blockSlotMap.get(blockRoot) ?? currentSlot;
      const times = [...timeMap.keys()].sort((x, y) => x - y);
      const distance = currentSlot - blockSlot;
      // Votes for this block are a continuous curve over their arrival window. Votes for older blocks
      // are a handful of scattered chunks: plot only the chunks that had any, so they read as marks
      // rather than a flat line along the baseline
      const data: Array<[number, number | null]> = [];
      for (let t = times[0]; t <= times[times.length - 1]; t += CHUNK_MS) {
        const count = timeMap.get(t) ?? 0;
        data.push([t / 1000, count || distance === 0 ? count : null]);
      }
      return { blockSlot, distance, data };
    });
    votes.sort((x, y) => x.distance - y.distance);

    const chartSeries: SeriesData[] = votes.map(({ blockSlot, distance, data }) =>
      distance === 0
        ? // Votes for this block are the normal case: neutral ink, so the exceptions carry the colour
          { name: 'This block', data, color: themeColors.foreground, showArea: true, areaOpacity: 0.1, lineWidth: 1.25 }
        : {
            // Votes for an older block missed this one
            name: `Slot ${formatSlot(blockSlot)}`,
            data,
            color: distance === 1 ? themeColors.warning : themeColors.danger,
            lineWidth: 1.5,
            showSymbol: true,
            symbolSize: 3,
          }
    );

    return { series: chartSeries, totalReceived: total };
  }, [attestationData, currentSlot, blockSlotMap, themeColors]);

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
      <PopoutCard title={title} anchorId={anchorId} modalSize="xl">
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
    <PopoutCard title={title} anchorId={anchorId} subtitle={participationMessage} modalSize="fullscreen">
      {({ inModal }) => (
        <div className={inModal ? 'h-[calc(100vh-12rem)]' : 'h-88'}>
          <MultiLineChart
            series={series}
            xAxis={{ type: 'value', name: 'Slot Time (s)', min: 0, max: 12 }}
            yAxis={{ name: 'Per 50 ms', minInterval: 1 }}
            markLines={[{ xValue: ATTESTATION_DEADLINE_MS / 1000, color: themeColors.muted }]}
            markAreas={[
              {
                xStart: ATTESTATION_DEADLINE_MS / 1000,
                xEnd: 12,
                color: themeColors.muted,
                opacity: 0.04,
                label: 'After the attestation deadline',
              },
            ]}
            height="100%"
            animationDuration={150}
            showLegend
            syncGroup="slot-time"
          />
        </div>
      )}
    </PopoutCard>
  );
}
