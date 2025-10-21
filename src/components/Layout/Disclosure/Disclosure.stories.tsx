import type { Meta, StoryObj } from '@storybook/react-vite';
import { Disclosure } from './Disclosure';

const meta: Meta<typeof Disclosure> = {
  title: 'Components/Layout/Disclosure',
  component: Disclosure,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Disclosure>;

export const Default: Story = {
  args: {
    title: 'Click to expand',
    children: 'This is the disclosure content that is hidden by default.',
  },
};

export const DefaultOpen: Story = {
  args: {
    title: 'Already expanded',
    children: 'This disclosure is open by default.',
    defaultOpen: true,
  },
};

export const WithComplexContent: Story = {
  args: {
    title: 'Past Forks',
    children: (
      <div className="space-y-2">
        <p>Fork 1: Electra</p>
        <p>Fork 2: Deneb</p>
        <p>Fork 3: Capella</p>
      </div>
    ),
  },
};

export const WithBorder: Story = {
  args: {
    title: 'Past: Electra',
    className: 'border border-border rounded-lg overflow-hidden',
    children: (
      <div className="space-y-2">
        <p className="text-foreground">Fork activated at epoch 2048</p>
        <p className="text-muted">All nodes have been upgraded successfully.</p>
      </div>
    ),
  },
};

export const GroupedDisclosures: Story = {
  render: () => (
    <div className="space-y-4">
      <Disclosure
        title="Upcoming Forks (1)"
        defaultOpen={true}
        className="border border-border rounded-lg overflow-hidden"
      >
        <div className="space-y-2">
          <p className="text-foreground">Fusaka - Epoch 50688</p>
          <p className="text-muted">7 days remaining</p>
        </div>
      </Disclosure>
      <Disclosure
        title="Past: Electra"
        className="border border-border rounded-lg overflow-hidden"
      >
        <div className="space-y-2">
          <p className="text-foreground">Activated at epoch 2048</p>
          <p className="text-success">All nodes upgraded ✓</p>
        </div>
      </Disclosure>
      <Disclosure
        title="Past: Deneb"
        className="border border-border rounded-lg overflow-hidden"
      >
        <div className="space-y-2">
          <p className="text-foreground">Activated at epoch 1024</p>
          <p className="text-success">All nodes upgraded ✓</p>
        </div>
      </Disclosure>
    </div>
  ),
};
