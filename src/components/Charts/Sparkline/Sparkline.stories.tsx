import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sparkline } from './Sparkline';

const meta = {
  title: 'Components/Charts/Sparkline',
  component: Sparkline,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-xs bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Sparkline>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default sparkline showing a simple upward trend
 */
export const Default: Story = {
  args: {
    data: [98.5, 99.1, 97.8, 99.3, 98.9, 99.5, 99.2],
  },
};

/**
 * Sparkline with area fill under the line
 */
export const WithArea: Story = {
  args: {
    data: [32.01, 32.02, 32.0, 31.98, 32.03, 32.05, 32.04],
    showArea: true,
    areaOpacity: 0.2,
  },
};

/**
 * Sparkline with a custom color
 */
export const CustomColor: Story = {
  args: {
    data: [95, 96, 94, 97, 98, 96, 99],
    color: '#22c55e',
    lineWidth: 2,
  },
};

/**
 * Sparkline with no data points renders as empty
 */
export const EmptyData: Story = {
  args: {
    data: [],
  },
};

/**
 * Sparkline with null gaps in data
 */
export const WithGaps: Story = {
  args: {
    data: [98, 99, null, null, 97, 98, 99],
  },
};

/**
 * Sparkline rendered inside a table cell to demonstrate real usage
 */
export const InTableRow: Story = {
  render: () => (
    <table className="w-full text-sm text-foreground">
      <thead>
        <tr className="border-b border-border text-left text-xs text-muted">
          <th className="px-3 py-2">Validator</th>
          <th className="px-3 py-2 text-right">Inclusion %</th>
          <th className="px-3 py-2">Trend</th>
          <th className="px-3 py-2 text-right">Balance</th>
          <th className="px-3 py-2">Bal. Trend</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-border/50">
          <td className="px-3 py-2 font-mono">12345</td>
          <td className="px-3 py-2 text-right text-success">99.12%</td>
          <td className="px-3 py-2">
            <Sparkline data={[98.5, 99.1, 97.8, 99.3, 98.9, 99.5, 99.2]} />
          </td>
          <td className="px-3 py-2 text-right">32.0145</td>
          <td className="px-3 py-2">
            <Sparkline data={[32.01, 32.02, 32.0, 31.98, 32.03, 32.05, 32.04]} showArea color="#22c55e" />
          </td>
        </tr>
        <tr className="border-b border-border/50">
          <td className="px-3 py-2 font-mono">67890</td>
          <td className="px-3 py-2 text-right text-warning">94.50%</td>
          <td className="px-3 py-2">
            <Sparkline data={[96, 95, 93, 92, 94, 95, 94]} color="#f59e0b" />
          </td>
          <td className="px-3 py-2 text-right">31.9820</td>
          <td className="px-3 py-2">
            <Sparkline data={[32.0, 31.99, 31.98, 31.97, 31.98, 31.98, 31.98]} showArea color="#f59e0b" />
          </td>
        </tr>
      </tbody>
    </table>
  ),
};
