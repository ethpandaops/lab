import type { Meta, StoryObj } from '@storybook/react-vite';
import { PopoutCard } from './PopoutCard';
import { BarChart } from '@/components/Charts/Bar';
import { LineChart } from '@/components/Charts/Line';

const meta: Meta<typeof PopoutCard> = {
  title: 'Components/Layout/PopoutCard',
  component: PopoutCard,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default PopoutCard with a simple bar chart
 */
export const Default: Story = {
  args: {
    title: 'Monthly Revenue',
    children: (
      <BarChart
        data={[120, 200, 150, 80, 70, 110, 130]}
        labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']}
        height={300}
      />
    ),
  },
};

/**
 * PopoutCard with subtitle
 */
export const WithSubtitle: Story = {
  args: {
    title: 'Network Activity',
    subtitle: 'Last 24 hours',
    children: (
      <LineChart
        data={[820, 932, 901, 934, 1290, 1330, 1320]}
        labels={['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00']}
        height={300}
        showArea
      />
    ),
  },
};

/**
 * PopoutCard with horizontal bar chart
 */
export const WithBarChart: Story = {
  args: {
    title: 'Top Contributors',
    subtitle: 'By commit count',
    children: (
      <BarChart
        data={[
          { value: 234, color: '#f59e0b' },
          { value: 189, color: '#3b82f6' },
          { value: 156, color: '#8b5cf6' },
          { value: 142, color: '#ec4899' },
          { value: 128, color: '#10b981' },
        ]}
        labels={['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']}
        orientation="horizontal"
        height={300}
      />
    ),
  },
};

/**
 * PopoutCard with line chart using render function for responsive sizing
 */
export const WithLineChart: Story = {
  args: {
    title: 'Daily Active Users',
    subtitle: 'Past 2 weeks',
    children: ({ inModal }) => (
      <div className={inModal ? 'h-[600px]' : 'h-96'}>
        <LineChart
          data={[1200, 1350, 1180, 1420, 1560, 1490, 1620, 1580, 1740, 1690, 1820, 1880, 1950, 2100]}
          labels={Array.from({ length: 14 }, (_, i) => `Day ${i + 1}`)}
          height="100%"
          smooth
          showArea
        />
      </div>
    ),
  },
};

/**
 * PopoutCard with HTML table to show it's not chart-specific
 */
export const WithTable: Story = {
  args: {
    title: 'Recent Transactions',
    subtitle: 'Latest 5 transactions',
    children: (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-3 text-left font-semibold text-foreground">ID</th>
              <th className="pb-3 text-left font-semibold text-foreground">Date</th>
              <th className="pb-3 text-left font-semibold text-foreground">Amount</th>
              <th className="pb-3 text-left font-semibold text-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="py-3 text-foreground">#1234</td>
              <td className="py-3 text-muted">2025-10-24</td>
              <td className="py-3 text-foreground">$125.00</td>
              <td className="py-3">
                <span className="rounded-sm bg-success/10 px-2 py-1 text-xs font-medium text-success">Completed</span>
              </td>
            </tr>
            <tr>
              <td className="py-3 text-foreground">#1235</td>
              <td className="py-3 text-muted">2025-10-24</td>
              <td className="py-3 text-foreground">$89.50</td>
              <td className="py-3">
                <span className="rounded-sm bg-warning/10 px-2 py-1 text-xs font-medium text-warning">Pending</span>
              </td>
            </tr>
            <tr>
              <td className="py-3 text-foreground">#1236</td>
              <td className="py-3 text-muted">2025-10-23</td>
              <td className="py-3 text-foreground">$210.00</td>
              <td className="py-3">
                <span className="rounded-sm bg-success/10 px-2 py-1 text-xs font-medium text-success">Completed</span>
              </td>
            </tr>
            <tr>
              <td className="py-3 text-foreground">#1237</td>
              <td className="py-3 text-muted">2025-10-23</td>
              <td className="py-3 text-foreground">$45.00</td>
              <td className="py-3">
                <span className="rounded-sm bg-danger/10 px-2 py-1 text-xs font-medium text-danger">Failed</span>
              </td>
            </tr>
            <tr>
              <td className="py-3 text-foreground">#1238</td>
              <td className="py-3 text-muted">2025-10-22</td>
              <td className="py-3 text-foreground">$156.25</td>
              <td className="py-3">
                <span className="rounded-sm bg-success/10 px-2 py-1 text-xs font-medium text-success">Completed</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
  },
};

/**
 * PopoutCard with an image
 */
export const WithImage: Story = {
  args: {
    title: 'Network Visualization',
    subtitle: 'Global node distribution',
    children: (
      <div className="flex items-center justify-center">
        <div className="flex size-64 items-center justify-center rounded-sm bg-muted/20">
          <p className="text-sm text-muted">Image placeholder</p>
        </div>
      </div>
    ),
  },
};

/**
 * PopoutCard with small modal size
 */
export const SmallModal: Story = {
  args: {
    title: 'Quick Stats',
    modalSize: 'sm',
    children: (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Active Users</span>
          <span className="text-lg font-semibold text-foreground">1,234</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Total Revenue</span>
          <span className="text-lg font-semibold text-foreground">$45,678</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Conversion Rate</span>
          <span className="text-lg font-semibold text-foreground">3.2%</span>
        </div>
      </div>
    ),
  },
};

/**
 * PopoutCard with full modal size for complex content
 */
export const FullModal: Story = {
  args: {
    title: 'Comprehensive Dashboard',
    subtitle: 'All metrics at a glance',
    modalSize: 'full',
    children: (
      <div className="grid grid-cols-2 gap-4">
        <BarChart
          data={[120, 200, 150, 80, 70, 110]}
          labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']}
          title="Revenue"
          height={250}
        />
        <LineChart
          data={[820, 932, 901, 934, 1290, 1330]}
          labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
          title="Activity"
          height={250}
        />
        <BarChart
          data={[60, 45, 78, 92, 55, 67]}
          labels={['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6']}
          title="Performance"
          height={250}
        />
        <LineChart
          data={[150, 180, 165, 190, 210, 195]}
          labels={['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6']}
          title="Growth"
          height={250}
          showArea
        />
      </div>
    ),
  },
};

/**
 * PopoutCard with long title to test truncation
 */
export const LongTitle: Story = {
  args: {
    title: 'This is a very long title that should be truncated with an ellipsis when it exceeds the available width',
    subtitle: 'This subtitle is also quite long but should wrap or truncate appropriately',
    children: (
      <BarChart data={[120, 200, 150, 80, 70, 110]} labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']} height={300} />
    ),
  },
};

/**
 * PopoutCard with complex nested content
 */
export const ComplexContent: Story = {
  args: {
    title: 'Multi-Chart Analysis',
    subtitle: 'Quarterly performance breakdown',
    modalSize: 'xl',
    children: (
      <div className="space-y-6">
        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">Revenue Trends</h4>
          <LineChart
            data={[1200, 1350, 1180, 1420, 1560, 1490, 1620, 1580, 1740, 1690, 1820, 1880]}
            labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
            height={250}
            showArea
          />
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">Product Distribution</h4>
          <BarChart
            data={[
              { value: 450, color: '#3b82f6' },
              { value: 380, color: '#8b5cf6' },
              { value: 290, color: '#ec4899' },
              { value: 210, color: '#f59e0b' },
            ]}
            labels={['Product A', 'Product B', 'Product C', 'Product D']}
            height={250}
            orientation="horizontal"
          />
        </div>
      </div>
    ),
  },
};
