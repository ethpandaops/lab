import type { Meta, StoryObj } from '@storybook/react-vite';
import { TimezoneToggle } from './TimezoneToggle';
import { TimezoneProvider } from '@/providers/TimezoneProvider';

const meta = {
  title: 'Components/Elements/TimezoneToggle',
  component: TimezoneToggle,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <TimezoneProvider>
          <Story />
        </TimezoneProvider>
      </div>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'radio',
      options: ['default', 'compact'],
    },
  },
} satisfies Meta<typeof TimezoneToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'default',
  },
};

export const Compact: Story = {
  args: {
    size: 'compact',
  },
};

export const Comparison: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h4 className="mb-3 text-sm font-semibold">Default size</h4>
        <TimezoneToggle size="default" />
      </div>
      <div>
        <h4 className="mb-3 text-sm font-semibold">Compact size</h4>
        <TimezoneToggle size="compact" />
      </div>
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="mb-4 text-sm text-muted">
          Toggle between UTC and local timezone. Your preference is saved to localStorage and persists across sessions.
        </p>
        <TimezoneToggle />
      </div>
      <div className="mt-6 rounded-sm border border-border bg-background p-4">
        <h4 className="mb-2 text-sm font-semibold">Example usage in dates:</h4>
        <div className="space-y-2 text-sm text-muted">
          <p>Current time: {new Date().toLocaleString()}</p>
          <p>UTC time: {new Date().toLocaleString('en-US', { timeZone: 'UTC' })}</p>
        </div>
      </div>
    </div>
  ),
};
