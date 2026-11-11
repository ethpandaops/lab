import { useState, type JSX } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { Alert } from '@/components/Feedback/Alert';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { formatDayLabel } from '@/pages/ethereum/validators/utils/overview';
import { getDataVizColors } from '@/utils';

import type { EntityStakeDay } from '@/pages/ethereum/entities/hooks';

export interface EntityStakeChartProps {
  /** Days in the window, oldest first */
  days: EntityStakeDay[];
  /** The window as text, e.g. "last 30 days" */
  window: string;
}

type Measure = 'stake' | 'validators';

/** The entity's active stake, or active validators, on each day of the window */
export function EntityStakeChart({ days, window }: EntityStakeChartProps): JSX.Element {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();
  const [measure, setMeasure] = useState<Measure>('stake');
  return (
    <PopoutCard
      title={measure === 'stake' ? 'Stake' : 'Active validators'}
      subtitle={`${measure === 'stake' ? 'Active effective balance' : 'Active validators'}, daily snapshots at the end of each UTC day, ${window}`}
      anchorId="entity-stake-chart"
      modalSize="full"
      headerActions={
        <SegmentedControl
          options={[
            { value: 'stake', label: 'ETH' },
            { value: 'validators', label: 'Validators' },
          ]}
          value={measure}
          onChange={setMeasure}
          ariaLabel="Measure"
        />
      }
    >
      {({ inModal }) =>
        days.length === 0 ? (
          <Alert variant="info" description="No active stake in this window." />
        ) : (
          <MultiLineChart
            series={[
              {
                name: measure === 'stake' ? 'Stake' : 'Validators',
                data: days.map(d => (measure === 'stake' ? Math.round(d.stakeEth) : d.validators)),
                color: CHART_CATEGORICAL_COLORS[0],
                showArea: true,
                areaOpacity: 0.15,
                showSymbol: days.length === 1,
              },
            ]}
            xAxis={{ type: 'category', labels: days.map(d => formatDayLabel(d.day)) }}
            yAxis={{ name: measure === 'stake' ? 'ETH' : 'Validators', min: 0 }}
            height={inModal ? 600 : 360}
            enableDataZoom
          />
        )
      }
    </PopoutCard>
  );
}
