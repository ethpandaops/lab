import type { Meta, StoryObj } from '@storybook/react-vite';

import type { EntityMetricDataPoint } from './TopEntitiesChart.types';
import { TopEntitiesChart } from './TopEntitiesChart';

const meta: Meta<typeof TopEntitiesChart> = {
  title: 'Components/Ethereum/TopEntitiesChart',
  component: TopEntitiesChart,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TopEntitiesChart>;

/**
 * Generate sample entity metric data
 */
function generateEntityData(
  entityCount: number,
  xRange: [number, number],
  entityPrefix = 'Entity'
): EntityMetricDataPoint[] {
  const [minX, maxX] = xRange;
  const data: EntityMetricDataPoint[] = [];

  for (let x = minX; x <= maxX; x++) {
    for (let e = 0; e < entityCount; e++) {
      // Random chance of having data for this entity at this x
      if (Math.random() > 0.3) {
        data.push({
          x,
          entity: `${entityPrefix} ${e + 1}`,
          count: Math.floor(Math.random() * 50) + 1,
        });
      }
    }
  }

  return data;
}

export const MissedAttestationsBySlot: Story = {
  args: {
    data: generateEntityData(15, [10000000, 10000031], 'Validator'),
    xAxis: { name: 'Slot' },
    yAxis: { name: 'Missed Attestations' },
    title: 'Offline Validators',
    topN: 10,
  },
};

export const MissedAttestationsByEpoch: Story = {
  args: {
    data: generateEntityData(20, [50000, 50019], 'Pool'),
    xAxis: { name: 'Epoch' },
    yAxis: { name: 'Missed Attestations' },
    title: 'Offline Validators',
    topN: 10,
  },
};

export const BlockProductionByBuilder: Story = {
  args: {
    data: generateEntityData(8, [100, 119], 'Builder'),
    xAxis: { name: 'Epoch' },
    yAxis: { name: 'Blocks Produced' },
    title: 'Top Block Builders',
    topN: 5,
  },
};

export const TopFive: Story = {
  args: {
    data: generateEntityData(10, [1000, 1031], 'Entity'),
    xAxis: { name: 'Block' },
    yAxis: { name: 'Transactions' },
    title: 'Top 5 Entities',
    topN: 5,
  },
};

export const CustomHeight: Story = {
  args: {
    data: generateEntityData(15, [10000000, 10000031], 'Validator'),
    xAxis: { name: 'Slot' },
    yAxis: { name: 'Missed Attestations' },
    title: 'Offline Validators',
    topN: 10,
    height: 500,
  },
};

export const EmptyData: Story = {
  args: {
    data: [],
    xAxis: { name: 'Slot' },
    yAxis: { name: 'Missed Attestations' },
    title: 'Offline Validators',
    emptyMessage: 'No offline validators detected',
  },
};

export const SingleEntity: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      x: 10000000 + i,
      entity: 'Solo Validator',
      count: Math.floor(Math.random() * 20) + 1,
    })),
    xAxis: { name: 'Slot' },
    yAxis: { name: 'Missed Attestations' },
    title: 'Offline Validators',
    topN: 10,
  },
};

export const SparseData: Story = {
  args: {
    data: [
      { x: 100, entity: 'Entity A', count: 10 },
      { x: 105, entity: 'Entity A', count: 5 },
      { x: 110, entity: 'Entity B', count: 15 },
      { x: 115, entity: 'Entity C', count: 8 },
      { x: 119, entity: 'Entity A', count: 12 },
    ],
    xAxis: { name: 'Block', min: 100, max: 119 },
    yAxis: { name: 'Count' },
    title: 'Sparse Events',
    topN: 10,
  },
};
