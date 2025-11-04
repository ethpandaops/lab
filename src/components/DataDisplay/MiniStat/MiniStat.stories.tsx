import type { Meta, StoryObj } from '@storybook/react-vite';
import { MiniStat } from './MiniStat';

const meta = {
  title: 'Components/DataDisplay/MiniStat',
  component: MiniStat,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MiniStat>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default MiniStat with high participation percentage (green)
 */
export const Default: Story = {
  args: {
    label: 'Participation',
    value: '31,075',
    secondaryText: '/ 31,153 validators',
    percentage: 99.75,
  },
};

/**
 * MiniStat with medium percentage (yellow warning state)
 */
export const MediumPercentage: Story = {
  args: {
    label: 'Block Votes',
    value: '24,500',
    secondaryText: '/ 31,153 validators',
    percentage: 78.5,
  },
};

/**
 * MiniStat with low percentage (red danger state)
 */
export const LowPercentage: Story = {
  args: {
    label: 'Attestations',
    value: '18,200',
    secondaryText: '/ 31,153 validators',
    percentage: 58.4,
  },
};

/**
 * Inline variant without secondary text - label and percentage on same line
 */
export const InlineVariant: Story = {
  args: {
    label: 'Score',
    value: '99.75',
    percentage: 99.75,
  },
};

/**
 * Inline variant with medium percentage
 */
export const InlineVariantMedium: Story = {
  args: {
    label: 'Quality',
    value: '78.5',
    percentage: 78.5,
  },
};

/**
 * Inline variant with low percentage
 */
export const InlineVariantLow: Story = {
  args: {
    label: 'Health',
    value: '58.4',
    percentage: 58.4,
  },
};

/**
 * Multiple MiniStats shown together (as they appear in the slot detail page)
 */
export const MultipleStats: Story = {
  render: () => (
    <div className="space-y-4">
      <MiniStat label="Participation" value="31,075" secondaryText="/ 31,153 validators" percentage={99.75} />
      <MiniStat label="Block Votes" value="30,900" secondaryText="/ 31,153 validators" percentage={99.19} />
      <MiniStat label="Attestations" value="31,050" secondaryText="/ 31,153 validators" percentage={99.67} />
    </div>
  ),
};

/**
 * Comparison: Both variants side by side
 */
export const VariantComparison: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Standard (with secondary text)</h3>
        <div className="space-y-3">
          <MiniStat label="Participation" value="31,075" secondaryText="/ 31,153 validators" percentage={99.75} />
          <MiniStat label="Block Votes" value="24,500" secondaryText="/ 31,153 validators" percentage={78.5} />
          <MiniStat label="Attestations" value="18,200" secondaryText="/ 31,153 validators" percentage={58.4} />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Inline (without secondary text)</h3>
        <div className="space-y-3">
          <MiniStat label="Score" value="99.75" percentage={99.75} />
          <MiniStat label="Quality" value="78.5" percentage={78.5} />
          <MiniStat label="Health" value="58.4" percentage={58.4} />
        </div>
      </div>
    </div>
  ),
};
