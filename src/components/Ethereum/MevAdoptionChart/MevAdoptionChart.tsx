import { useMemo } from 'react';

import { BarChart } from '@/components/Charts/Bar';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';

import type { MevAdoptionChartProps } from './MevAdoptionChart.types';

/**
 * MevAdoptionChart - Reusable chart for visualizing MEV-boost adoption
 *
 * Displays the proportion of blocks/items using MEV-boost vs locally built
 * (vanilla) blocks. Works with any data granularity - just needs objects with
 * a `hasMev` boolean property.
 *
 * Automatically calculates and displays:
 * - Count of MEV-boost items
 * - Count of locally built items
 * - Percentage adoption
 *
 * @example Epoch-level granularity
 * ```tsx
 * <MevAdoptionChart
 *   data={slots.map(s => ({ hasMev: s.mevBoost }))}
 *   title="MEV-Boost Usage"
 *   anchorId="mev-adoption"
 * />
 * ```
 *
 * @example Block-level with custom subtitle
 * ```tsx
 * <MevAdoptionChart
 *   data={blocks.map(b => ({ hasMev: !!b.mevRelay }))}
 *   subtitle="MEV-boost usage in last 100 blocks"
 * />
 * ```
 */
export function MevAdoptionChart({
  data,
  title = 'MEV-Boost Usage',
  subtitle,
  height,
  anchorId,
  inModal = false,
  modalSize = 'full',
}: MevAdoptionChartProps): React.JSX.Element {
  const colors = useThemeColors();

  const { mevCount, vanillaCount, mevPercent } = useMemo(() => {
    const mevCount = data.filter(d => d.hasMev).length;
    const vanillaCount = data.length - mevCount;
    const mevPercent = data.length > 0 ? ((mevCount / data.length) * 100).toFixed(1) : '0.0';

    return { mevCount, vanillaCount, mevPercent };
  }, [data]);

  // Calculate dynamic subtitle if not provided
  const effectiveSubtitle = subtitle ?? `${mevCount} of ${data.length} blocks (${mevPercent}%) used MEV-boost`;

  const chartHeight = height ?? (inModal ? 600 : 300);

  return (
    <PopoutCard title={title} subtitle={effectiveSubtitle} anchorId={anchorId} modalSize={modalSize}>
      {({ inModal: isInModal }) => (
        <BarChart
          data={[
            { value: mevCount, color: colors.primary },
            { value: vanillaCount, color: colors.muted },
          ]}
          labels={['MEV-Boost', 'Locally Built']}
          height={isInModal ? 600 : chartHeight}
          axisName="Blocks"
        />
      )}
    </PopoutCard>
  );
}
