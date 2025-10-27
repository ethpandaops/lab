import { useMemo } from 'react';

import { BarChart } from '@/components/Charts/Bar';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';

import type { BlockValueChartProps } from './BlockValueChart.types';

/**
 * Chart showing block value across slots in an epoch
 *
 * Displays MEV block value as a bar chart
 */
export function BlockValueChart({ data, anchorId }: BlockValueChartProps): React.JSX.Element {
  const colors = useThemeColors();

  const blockValues = useMemo(
    () =>
      data.map(d => {
        if (!d.blockValue) return 0;
        return parseFloat(d.blockValue) / 1e18;
      }),
    [data]
  );

  const labels = useMemo(() => data.map(d => d.slot.toString()), [data]);

  return (
    <PopoutCard
      title="Block Value"
      subtitle="Block value (ETH) for MEV-boosted blocks"
      anchorId={anchorId}
      modalSize="full"
    >
      {({ inModal }) => (
        <BarChart
          data={blockValues}
          labels={labels}
          height={inModal ? 600 : 300}
          color={colors.primary}
          axisName="Block Value (ETH)"
          showLabel={false}
          categoryLabelInterval="auto"
          animationDuration={300}
        />
      )}
    </PopoutCard>
  );
}
