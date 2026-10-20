import type { Meta, StoryObj } from '@storybook/react-vite';
import { ClientLabel } from './ClientLabel';

const meta = {
  title: 'Components/Ethereum/ClientLabel',
  component: ClientLabel,
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
} satisfies Meta<typeof ClientLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Consensus client with a resolved version
 */
export const WithVersion: Story = {
  args: {
    client: 'lighthouse',
    detail: 'v8.2.3',
  },
};

/**
 * Execution client with only a commit prefix
 */
export const WithCommit: Story = {
  args: {
    client: 'geth',
    detail: 'a579',
  },
};

/**
 * Client whose identifier has a display name
 */
export const DisplayName: Story = {
  args: {
    client: 'nimbusel',
  },
};

/**
 * Graffiti that names no client
 */
export const Unknown: Story = {
  args: {
    client: 'unknown',
  },
};
