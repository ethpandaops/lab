import type { Meta, StoryObj } from '@storybook/react-vite';

import { EIP7870SpecsBanner } from './EIP7870SpecsBanner';

const meta = {
  title: 'Components/Ethereum/EIP7870SpecsBanner',
  component: EIP7870SpecsBanner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div className="min-w-[700px] rounded-sm bg-background p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EIP7870SpecsBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Collapsed: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Shows the collapsed view with summary hardware specs',
      },
    },
  },
};

export const WithCustomClass: Story = {
  args: {
    className: 'border-primary/30',
  },
  parameters: {
    docs: {
      description: {
        story: 'Banner with custom border styling',
      },
    },
  },
};
