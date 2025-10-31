import type { Meta, StoryObj } from '@storybook/react-vite';
import { TimezoneToggle } from './TimezoneToggle';
import { TimezoneProvider } from '@/providers/TimezoneProvider';
import { useTimezone } from '@/hooks/useTimezone';

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

function LiveDateExample(): React.JSX.Element {
  const { timezone } = useTimezone();
  const now = new Date();
  const exampleDate = new Date('2025-10-31T14:30:00Z'); // Fixed example date

  return (
    <div className="space-y-4">
      <div>
        <TimezoneToggle />
      </div>
      <div className="rounded-sm border border-border bg-background p-4">
        <h4 className="mb-3 text-sm font-semibold">Live date rendering:</h4>
        <div className="space-y-3 text-sm">
          <div>
            <div className="font-medium text-foreground">Current time:</div>
            <div className="text-muted">
              {timezone === 'UTC'
                ? now.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'long' })
                : now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'long' })}
            </div>
          </div>
          <div>
            <div className="font-medium text-foreground">Example: Oct 31, 2025 14:30 UTC</div>
            <div className="text-muted">
              {timezone === 'UTC'
                ? exampleDate.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })
                : exampleDate.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          </div>
          <div className="pt-2 text-xs text-muted">
            {timezone === 'UTC' ? '✓ Showing in UTC' : '✓ Showing in your local timezone'}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactLiveDateExample(): React.JSX.Element {
  const { timezone } = useTimezone();
  const exampleDate = new Date('2025-10-31T14:30:00Z');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="font-medium">Oct 31, 14:30: </span>
          <span className="text-muted">
            {timezone === 'UTC'
              ? exampleDate.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' })
              : exampleDate.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
        <TimezoneToggle size="compact" />
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => <LiveDateExample />,
};

export const Compact: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h4 className="mb-3 text-sm font-semibold">Compact with breadcrumb-style layout</h4>
        <CompactLiveDateExample />
      </div>
      <div className="rounded-sm border border-border bg-background p-4">
        <p className="text-xs text-muted">
          The compact size is designed for navigation areas where space is limited, like breadcrumbs.
        </p>
      </div>
    </div>
  ),
};

export const Comparison: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h4 className="mb-3 text-sm font-semibold">Default size</h4>
        <LiveDateExample />
      </div>
      <div>
        <h4 className="mb-3 text-sm font-semibold">Compact size</h4>
        <CompactLiveDateExample />
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
          Toggle the switch below and watch the dates update in real-time.
        </p>
        <LiveDateExample />
      </div>
    </div>
  ),
};
