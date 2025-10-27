import { useMemo } from 'react';

import { BarChart } from '@/components/Charts/Bar';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useThemeColors } from '@/hooks/useThemeColors';

import type { MevAdoptionChartProps } from './MevAdoptionChart.types';

/**
 * Chart showing MEV-boost usage statistics
 *
 * Displays count of blocks using MEV-boost vs vanilla blocks
 */
export function MevAdoptionChart({ data, anchorId }: MevAdoptionChartProps): React.JSX.Element {
  const colors = useThemeColors();

  const { mevCount, vanillaCount, mevPercent } = useMemo(() => {
    const mevCount = data.filter(d => d.hasMev).length;
    const vanillaCount = data.length - mevCount;
    const mevPercent = data.length > 0 ? ((mevCount / data.length) * 100).toFixed(1) : '0.0';

    return { mevCount, vanillaCount, mevPercent };
  }, [data]);

  return (
    <PopoutCard
      title="MEV-Boost Usage"
      subtitle={`${mevCount} of ${data.length} blocks (${mevPercent}%) used MEV-boost`}
      anchorId={anchorId}
      modalSize="full"
    >
      {({ inModal }) => (
        <BarChart
          data={[
            { value: mevCount, color: colors.primary },
            { value: vanillaCount, color: colors.muted },
          ]}
          labels={['MEV-Boost', 'Locally Built']}
          height={inModal ? 600 : 300}
          axisName="Blocks"
          showLabel={true}
          labelPosition="top"
          animationDuration={300}
        />
      )}
    </PopoutCard>
  );
}
