import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContributorLoading } from './ContributorLoading';

const meta = {
  title: 'Pages/Contributors/ContributorLoading',
  component: ContributorLoading,
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
} satisfies Meta<typeof ContributorLoading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Multiple: Story = {
  render: () => (
    <div className="space-y-4">
      <ContributorLoading />
      <ContributorLoading />
      <ContributorLoading />
      <ContributorLoading />
    </div>
  ),
};

export const InGrid: Story = {
  render: () => (
    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
      <ContributorLoading />
      <ContributorLoading />
      <ContributorLoading />
      <ContributorLoading />
    </div>
  ),
};
